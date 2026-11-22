import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Button, Card, ErrorBox, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { RoleSettings } from '@/components/RoleSettings';
import { colors, font } from '@/constants/theme';
import { rupiah } from '@/utils/format';

type Dash = { total_orders: number; active_orders: number; completed_orders: number; gmv: number; commission: number; delivery_share: number; customers: number; merchants: number; drivers: number; pending_apps: number; unassigned: number };

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: string }) => (
  <Card style={{ flexBasis: '47%', flexGrow: 1, gap: 2 }}>
    <Text style={{ fontSize: font.xxl, fontWeight: '800', color: tone ?? colors.green900 }}>{value}</Text>
    <Text style={{ fontSize: font.sm, color: colors.muted }}>{label}</Text>
  </Card>
);

export default function AdminHome() {
  const q = useQuery(async () => unwrap(await supabase.rpc('admin_dashboard')) as Dash, []);
  useRealtime('adm-home', 'orders', undefined, useCallback(() => q.refetch(), [q.refetch]));
  const d = q.data;
  return (
    <>
      <Header title="Dasbor admin" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : d ? (
          <>
            {d.pending_apps > 0 || d.unassigned > 0 ? (
              <Card style={{ backgroundColor: colors.orange100, borderColor: colors.orange100 }}>
                <Text style={{ fontWeight: '800', color: colors.ink }}>Perlu tindakan</Text>
                {d.unassigned > 0 ? <Button title={`${d.unassigned} pesanan menunggu driver`} variant="accent" small onPress={() => router.push('/admin/orders' as never)} /> : null}
                {d.pending_apps > 0 ? <Button title={`${d.pending_apps} pengajuan menunggu`} variant="secondary" small onPress={() => router.push('/admin/applications' as never)} /> : null}
              </Card>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Stat label="Total pesanan" value={d.total_orders} />
              <Stat label="Pesanan aktif" value={d.active_orders} tone={colors.orange600} />
              <Stat label="Pesanan selesai" value={d.completed_orders} />
              <Stat label="Mitra aktif (toko/driver)" value={`${d.merchants}/${d.drivers}`} />
            </View>
            <Section title="Keuangan (pesanan selesai)" />
            <Card>
              <Row label="Total nilai transaksi" value={rupiah(d.gmv)} />
              <Row label="Komisi toko (10%)" value={rupiah(d.commission)} />
              <Row label="Bagian admin dari ongkir (20%)" value={rupiah(d.delivery_share)} />
              <Row label="Pendapatan admin" value={rupiah(Number(d.commission) + Number(d.delivery_share))} bold tone="orange" />
              <Row label="Customer aktif" value={`${d.customers}`} />
            </Card>
            <Section title="Akun" />
            <RoleSettings />
          </>
        ) : null}
      </Screen>
    </>
  );
}
