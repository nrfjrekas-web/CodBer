import React from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Badge, Button, Card, Header, Loading, Screen, Section } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { homeFor } from '@/utils/routes';
import type { Role } from '@/types';

const ROLE_LABEL: Record<Role, string> = { customer: 'Customer', driver: 'Driver', merchant: 'Merchant', admin: 'Admin' };
type App = { id: string; status: 'pending' | 'approved' | 'rejected'; review_note: string | null; created_at: string };

export default function Settings() {
  const { roles, mode, setMode, session, signOut } = useAuth();
  const uid = (session?.user.id ?? '');
  const q = useQuery(async () => {
    const [d, m] = await Promise.all(['driver_applications', 'merchant_applications'].map((t) =>
      supabase.from(t).select('id,status,review_note,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).then(unwrap)));
    return { driver: (d as App[])[0] ?? null, merchant: (m as App[])[0] ?? null };
  }, [uid]);

  const switchTo = async (r: Role) => { await setMode(r); router.replace(homeFor(r) as never); };

  const appCard = (type: 'driver' | 'merchant', title: string, text: string) => {
    if (roles.includes(type)) return null;
    const a = q.data?.[type];
    return (
      <Card>
        <Text style={{ fontSize: font.md, fontWeight: '800', color: colors.ink }}>{title}</Text>
        {a?.status === 'pending' ? (
          <>
            <Badge label="Menunggu persetujuan admin" tone="amber" />
            <Text style={{ color: colors.muted }}>Kami akan memberi tahu lewat notifikasi setelah pengajuanmu diperiksa.</Text>
          </>
        ) : (
          <>
            <Text style={{ color: colors.muted }}>{text}</Text>
            {a?.status === 'rejected' ? <Text style={{ color: colors.red600 }}>Pengajuan sebelumnya ditolak: {a.review_note}</Text> : null}
            <Button title={a?.status === 'rejected' ? 'Ajukan ulang' : 'Ajukan sekarang'} variant="secondary" small onPress={() => router.push({ pathname: '/settings/role-applications', params: { type } } as never)} />
          </>
        )}
      </Card>
    );
  };

  return (
    <>
      <Header title="Mode & pengajuan" back />
      <Screen>
        <Section title="Mode aktif" />
        <Card>
          <Text style={{ color: colors.muted }}>Ganti mode tanpa keluar akun. Izin tiap aksi tetap diperiksa server.</Text>
          <View style={{ gap: 8 }}>
            {roles.map((r) => (
              <Button key={r} title={`${ROLE_LABEL[r]}${r === mode ? ' (aktif)' : ''}`} variant={r === mode ? 'primary' : 'secondary'} onPress={() => switchTo(r)} />
            ))}
          </View>
        </Card>
        <Section title="Gabung sebagai mitra" />
        {q.loading ? <Loading /> : (
          <>
            {appCard('driver', 'Jadi driver CodBer', 'Siapkan KTP, SIM yang masih berlaku, foto kendaraan, dan nomor polisi.')}
            {appCard('merchant', 'Daftarkan tokomu', 'Siapkan foto toko, alamat, titik peta, dan jam operasional.')}
            {roles.includes('driver') && roles.includes('merchant') ? <Text style={{ color: colors.muted }}>Semua role sudah aktif.</Text> : null}
          </>
        )}
        <Button title="Keluar" variant="danger" onPress={() => Alert.alert('Keluar dari CodBer?', undefined, [{ text: 'Batal', style: 'cancel' }, { text: 'Keluar', style: 'destructive', onPress: signOut }])} />
      </Screen>
    </>
  );
}
