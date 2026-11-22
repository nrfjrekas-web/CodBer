import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Badge, Button, Card, Chip, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { friendlyError } from '@/utils/format';

type Row = { id: string; title: string; sub: string; active: boolean; userId: string; accountActive: boolean };

export default function Partners() {
  const [type, setType] = useState<'driver' | 'merchant'>('driver');
  const q = useQuery(async () => {
    const rows = type === 'driver'
      ? unwrap(await supabase.from('drivers').select('id,user_id,vehicle_plate,vehicle_type,is_approved,is_online').order('created_at', { ascending: false })) as { id: string; user_id: string; vehicle_plate: string; vehicle_type: string; is_approved: boolean; is_online: boolean }[]
      : unwrap(await supabase.from('merchants').select('id,owner_user_id,name,address_text,is_approved,is_open').order('created_at', { ascending: false })) as { id: string; owner_user_id: string; name: string; address_text: string; is_approved: boolean; is_open: boolean }[];
    const uids = rows.map((r) => ('user_id' in r ? r.user_id : r.owner_user_id));
    const profs = uids.length ? unwrap(await supabase.from('profiles').select('id,full_name,phone,is_active').in('id', uids)) as { id: string; full_name: string; phone: string; is_active: boolean }[] : [];
    return rows.map((r): Row => {
      const uid = 'user_id' in r ? r.user_id : r.owner_user_id;
      const p = profs.find((x) => x.id === uid);
      return 'user_id' in r
        ? { id: r.id, title: p?.full_name || '—', sub: `${r.vehicle_type} ${r.vehicle_plate} · +${p?.phone ?? ''}`, active: r.is_approved, userId: uid, accountActive: p?.is_active ?? true }
        : { id: r.id, title: r.name, sub: `${p?.full_name ?? ''} · ${r.address_text}`, active: r.is_approved, userId: uid, accountActive: p?.is_active ?? true };
    });
  }, [type]);

  const run = (title: string, fn: () => PromiseLike<{ error: { message: string } | null }>) =>
    Alert.alert(title, undefined, [{ text: 'Batal', style: 'cancel' }, { text: 'Ya', onPress: async () => { const { error } = await fn(); if (error) Alert.alert('Gagal', friendlyError(error)); else q.refetch(); } }]);

  return (
    <>
      <Header title="Mitra" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="Driver" active={type === 'driver'} onPress={() => setType('driver')} />
          <Chip label="Merchant" active={type === 'merchant'} onPress={() => setType('merchant')} />
        </View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="people-outline" title="Belum ada mitra" text="Mitra muncul setelah pengajuannya disetujui." /> : q.data.map((r) => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontWeight: '800', color: colors.ink, flex: 1 }}>{r.title}</Text>
              <Badge label={!r.accountActive ? 'Akun nonaktif' : r.active ? 'Aktif' : 'Dinonaktifkan'} tone={r.active && r.accountActive ? 'green' : 'red'} />
            </View>
            <Text style={{ color: colors.muted }}>{r.sub}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button title={r.active ? 'Nonaktifkan role' : 'Aktifkan role'} variant={r.active ? 'danger' : 'secondary'} small
                onPress={() => run(r.active ? 'Nonaktifkan role mitra ini?' : 'Aktifkan kembali?', () => supabase.rpc('admin_set_partner_active', { p_type: type, p_id: r.id, p_active: !r.active }))} />
              <Button title={r.accountActive ? 'Nonaktifkan akun' : 'Aktifkan akun'} variant="secondary" small
                onPress={() => run(r.accountActive ? 'Nonaktifkan seluruh akun ini?' : 'Aktifkan akun?', () => supabase.rpc('admin_set_account_active', { p_user: r.userId, p_active: !r.accountActive }))} />
            </View>
          </Card>
        ))}
      </Screen>
    </>
  );
}
