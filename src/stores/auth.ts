import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { secureStorage } from '@/lib/storage';
import type { Profile, Role } from '@/types';

const MODE_KEY = 'codber.mode';

interface AuthState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  mode: Role;
  init: () => void;
  load: () => Promise<void>;
  setMode: (m: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

let started = false;

export const useAuth = create<AuthState>((set, get) => ({
  ready: false, session: null, profile: null, roles: ['customer'], mode: 'customer',

  init: () => {
    if (started) return;
    started = true;
    supabase.auth.getSession().then(async ({ data }) => {
      set({ session: data.session });
      if (data.session) await get().load();
      set({ ready: true });
    });
    supabase.auth.onAuthStateChange((_evt, session) => {
      set({ session });
      if (session) setTimeout(() => get().load(), 0);   // hindari deadlock callback auth
      else set({ profile: null, roles: ['customer'], mode: 'customer' });
    });
  },

  // Role & profil selalu dibaca dari database; mode di perangkat hanya preferensi tampilan.
  load: async () => {
    const uid = get().session?.user.id;
    if (!uid) return;
    const [p, r] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid).eq('is_active', true),
    ]);
    const roles = ((r.data ?? []).map((x) => x.role) as Role[]);
    if (!roles.includes('customer')) roles.unshift('customer');
    const saved = (await secureStorage.getItem(MODE_KEY)) as Role | null;
    set({ profile: (p.data as Profile) ?? null, roles, mode: saved && roles.includes(saved) ? saved : 'customer' });
  },

  setMode: async (m) => {
    if (!get().roles.includes(m)) return;
    await secureStorage.setItem(MODE_KEY, m);
    set({ mode: m });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await secureStorage.removeItem(MODE_KEY);
  },
}));
