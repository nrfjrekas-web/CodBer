import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Card, Chip, Empty, ErrorBox, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { space } from '@/constants/theme';
import { daysAgo, isoDate, rupiah } from '@/utils/format';

type Rec = { day: string; orders: number; completed: number; gmv: number; subtotal: number; commission: number; admin_delivery: number };
const RANGES = [{ k: 0, l: 'Harian' }, { k: 6, l: 'Mingguan' }, { k: 29, l: 'Bulanan' }];
const STATUS = [{ k: null, l: 'Semua' }, { k: 'completed', l: 'Selesai' }, { k: 'cancelled', l: 'Batal' }, { k: 'rejected', l: 'Ditolak' }];

export default function AdminReports() {
  const [range, setRange] = useState(6);
  const [status, setStatus] = useState<string | null>(null);
  const q = useQuery(async () => unwrap(await supabase.rpc('admin_report', { p_from: daysAgo(range), p_to: isoDate(), p_merchant: null, p_driver: null, p_status: status })) as Rec[], [range, status]);
  const sum = (k: keyof Rec) => (q.data ?? []).reduce((n, r) => n + Number(r[k]), 0);
  return (
    <>
      <Header title="Laporan" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>{RANGES.map((r) => <Chip key={r.k} label={r.l} active={range === r.k} onPress={() => setRange(r.k)} />)}</View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>{STATUS.map((s) => <Chip key={s.l} label={s.l} active={status === s.k} onPress={() => setStatus(s.k)} />)}</View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : (
          <>
            <Card>
              <Row label="Pesanan / selesai" value={`${sum('orders')} / ${sum('completed')}`} />
              <Row label="Nilai transaksi" value={rupiah(sum('gmv'))} />
              <Row label="Komisi toko" value={rupiah(sum('commission'))} />
              <Row label="Bagian admin dari ongkir" value={rupiah(sum('admin_delivery'))} />
              <Row label="Pendapatan admin" value={rupiah(sum('commission') + sum('admin_delivery'))} bold tone="orange" />
            </Card>
            <Section title="Per hari" />
            {!q.data?.length ? <Empty icon="bar-chart-outline" title="Tidak ada data" /> : q.data.map((r) => (
              <Card key={r.day}><Row label={r.day} value={rupiah(r.gmv)} bold /><Row label={`${r.orders} pesanan, ${r.completed} selesai`} value={`admin ${rupiah(Number(r.commission) + Number(r.admin_delivery))}`} /></Card>
            ))}
          </>
        )}
        <Section title="Pengaturan operasional" />
        <Button title="Zona & ongkir" icon="map-outline" variant="secondary" onPress={() => router.push('/admin/zones' as never)} />
        <Button title="Audit log" icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/admin/audit' as never)} />
      </Screen>
    </>
  );
}
