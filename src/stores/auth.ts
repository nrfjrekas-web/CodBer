import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { secureStorage } from '@/lib/storage';
import { normalizePhone } from '@/utils/format';
import type { Profile, Role } from '@/types';

const MODE_KEY = 'codber.mode';
const SESSION_KEY = 'codber.no_otp_session';

interface AuthState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  mode: Role;
  init: () => void;
  load: (overrideUserId?: string) => Promise<void>;
  loginOrRegisterWithoutOtp: (input: { phone: string; fullName?: string }) => Promise<{ created: boolean }>;
  completeProfileName: (fullName: string) => Promise<void>;
  setMode: (m: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

let started = false;

function buildSessionForProfile(profile: Profile): Session {
  const now = Math.floor(Date.now() / 1000);
  const user: User = {
    id: profile.id,
    app_metadata: { provider: 'phone_no_otp', providers: ['phone_no_otp'] },
    user_metadata: {
      full_name: profile.full_name,
      phone: profile.phone ? `+${profile.phone}` : undefined,
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    role: 'authenticated',
    phone: profile.phone ?? undefined,
  };

  return {
    access_token: `local-no-otp-${profile.id}`,
    refresh_token: `local-no-otp-refresh-${profile.id}`,
    expires_in: 60 * 60 * 24 * 30,
    expires_at: now + 60 * 60 * 24 * 30,
    token_type: 'bearer',
    user,
  };
}

function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fetchUserData(uid: string) {
  const [p, r] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', uid).eq('is_active', true),
  ]);

  if (p.error) throw new Error(p.error.message);
  if (r.error) throw new Error(r.error.message);

  const roles = ((r.data ?? []).map((x) => x.role) as Role[]);
  if (!roles.includes('customer')) roles.unshift('customer');
  const saved = (await secureStorage.getItem(MODE_KEY)) as Role | null;
  const mode: Role = saved && roles.includes(saved) ? saved : 'customer';

  return {
    profile: (p.data as Profile | null) ?? null,
    roles,
    mode,
  };
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  session: null,
  profile: null,
  roles: ['customer'],
  mode: 'customer',

  init: () => {
    if (started) return;
    started = true;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          set({ session: data.session });
          await get().load(data.session.user.id);
          set({ ready: true });
          return;
        }

        const rawSaved = await secureStorage.getItem(SESSION_KEY);
        if (rawSaved) {
          const parsed = JSON.parse(rawSaved) as { userId?: string; profile?: Profile };
          const uid = parsed.userId ?? parsed.profile?.id;
          if (uid) {
            const { profile, roles, mode } = await fetchUserData(uid);
            const activeProfile = profile ?? parsed.profile ?? null;
            if (activeProfile) {
              set({
                session: buildSessionForProfile(activeProfile),
                profile: activeProfile,
                roles,
                mode,
              });
            }
          }
        }
      } catch {
        // Lewati jika belum ada sesi tersimpan
      } finally {
        set({ ready: true });
      }
    })();

    supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.id) {
        set({ session });
        setTimeout(() => {
          void get().load(session.user.id);
        }, 0);
      }
    });
  },

  // Role & profil selalu dibaca dari database; mode di perangkat hanya preferensi tampilan.
  load: async (overrideUserId) => {
    const uid = overrideUserId ?? get().session?.user.id;
    if (!uid) return;
    const { profile, roles, mode } = await fetchUserData(uid);
    const nextSession = profile ? buildSessionForProfile(profile) : get().session;
    if (profile) {
      await secureStorage.setItem(SESSION_KEY, JSON.stringify({ userId: profile.id, profile }));
    }
    set({ session: nextSession, profile, roles, mode });
  },

  // Alur tanpa OTP: cek nomor di profiles; jika belum ada maka daftarkan akun baru lalu langsung masuk.
  loginOrRegisterWithoutOtp: async ({ phone, fullName }) => {
    const normalized = normalizePhone(phone);
    const trimmedName = (fullName ?? '').trim();

    const { data: existing, error: findErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (findErr) {
      throw new Error(findErr.message);
    }

    let targetProfile = existing as Profile | null;
    let created = false;

    if (!targetProfile) {
      if (trimmedName.length < 3) {
        const err = new Error('profile_name_required');
        throw err;
      }

      const newId = generateUuid();
      const insertPayload: Partial<Profile> & { id: string; phone: string; full_name: string } = {
        id: newId,
        phone: normalized,
        full_name: trimmedName,
        avatar_url: null,
        is_active: true,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      targetProfile = inserted as Profile;
      created = true;

      // Pastikan role customer aktif jika tabel user_roles mengizinkan insert
      await supabase
        .from('user_roles')
        .insert({ user_id: targetProfile.id, role: 'customer', is_active: true });
    } else if (trimmedName.length >= 3 && !targetProfile.full_name?.trim()) {
      const { data: updated, error: updErr } = await supabase
        .from('profiles')
        .update({ full_name: trimmedName })
        .eq('id', targetProfile.id)
        .select('*')
        .single();
      if (!updErr && updated) {
        targetProfile = updated as Profile;
      }
    }

    const session = buildSessionForProfile(targetProfile);
    await secureStorage.setItem(SESSION_KEY, JSON.stringify({ userId: targetProfile.id, profile: targetProfile }));
    set({ session, profile: targetProfile });
    await get().load(targetProfile.id);

    return { created };
  },

  completeProfileName: async (fullName: string) => {
    const uid = get().session?.user.id ?? get().profile?.id;
    const full = fullName.trim();
    if (!uid) throw new Error('Sesi pengguna tidak ditemukan.');

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: full })
      .eq('id', uid)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (data) {
      const updated = data as Profile;
      await secureStorage.setItem(SESSION_KEY, JSON.stringify({ userId: updated.id, profile: updated }));
      set({ session: buildSessionForProfile(updated), profile: updated });
    }

    await get().load(uid);
  },

  setMode: async (m) => {
    if (!get().roles.includes(m)) return;
    await secureStorage.setItem(MODE_KEY, m);
    set({ mode: m });
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Abaikan jika memakai sesi lokal tanpa OTP
    }
    await Promise.all([
      secureStorage.removeItem(MODE_KEY),
      secureStorage.removeItem(SESSION_KEY),
    ]);
    set({ session: null, profile: null, roles: ['customer'], mode: 'customer' });
  },
}));
