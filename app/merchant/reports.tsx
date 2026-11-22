import React, { useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Card, Chip, Empty, ErrorBox, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { space } from '@/constants/theme';
import { daysAgo, isoDate, rupiah } from '@/utils/format';

type Rec = { day: string; orders: number; subtotal: number; commission: number; net: number };
const RANGES = [{ k: 0, l: 'Hari ini' }, { k: 6, l: '7 hari' }, { k: 29, l: '30 hari' }];

export default function MerchantReports() {
  const [range, setRange] = useState(6);
  const q = useQuery(async () => unwrap(await supabase.rpc('merchant_report', { p_from: daysAgo(range), p_to: isoDate() })) as Rec[], [range]);
  const sum = (k: keyof Rec) => (q.data ?? []).reduce((n, r) => n + Number(r[k]), 0);
  return (
    <>
      <Header title="Laporan" subtitle="Hanya pesanan selesai di tokomu" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>{RANGES.map((r) => <Chip key={r.k} label={r.l} active={range === r.k} onPress={() => setRange(r.k)} />)}</View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : (
          <>
            <Card>
              <Row label="Jumlah pesanan" value={`${sum('orders')}`} />
              <Row label="Total subtotal produk" value={rupiah(sum('subtotal'))} />
              <Row label="Komisi platform" value={`-${rupiah(sum('commission'))}`} />
              <Row label="Pendapatan bersih" value={rupiah(sum('net'))} bold tone="orange" />
            </Card>
            <Section title="Per hari" />
            {!q.data?.length ? <Empty icon="bar-chart-outline" title="Belum ada penjualan" /> : q.data.map((r) => (
              <Card key={r.day}><Row label={r.day} value={rupiah(r.net)} bold /><Row label={`${r.orders} pesanan`} value={`subtotal ${rupiah(r.subtotal)}`} /></Card>
            ))}
          </>
        )}
      </Screen>
    </>
  );
}
