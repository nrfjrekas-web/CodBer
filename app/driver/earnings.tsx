import React, { useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Card, Chip, Empty, ErrorBox, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { space } from '@/constants/theme';
import { daysAgo, isoDate, rupiah } from '@/utils/format';

type Rec = { day: string; deliveries: number; gross_fee: number; driver_share: number };
const RANGES = [{ k: 0, l: 'Hari ini' }, { k: 6, l: '7 hari' }, { k: 29, l: '30 hari' }];

export default function Earnings() {
  const [range, setRange] = useState(6);
  const q = useQuery(async () => unwrap(await supabase.rpc('driver_earnings', { p_from: daysAgo(range), p_to: isoDate() })) as Rec[], [range]);
  const sum = (k: keyof Rec) => (q.data ?? []).reduce((n, r) => n + Number(r[k]), 0);
  return (
    <>
      <Header title="Pendapatan" subtitle="Bagian driver 80% dari ongkir" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>{RANGES.map((r) => <Chip key={r.k} label={r.l} active={range === r.k} onPress={() => setRange(r.k)} />)}</View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : (
          <>
            <Card>
              <Row label="Jumlah pengantaran" value={`${sum('deliveries')}`} />
              <Row label="Ongkir bruto" value={rupiah(sum('gross_fee'))} />
              <Row label="Bagian driver" value={rupiah(sum('driver_share'))} bold tone="orange" />
            </Card>
            <Section title="Per hari" />
            {!q.data?.length ? <Empty icon="wallet-outline" title="Belum ada pendapatan" text="Pendapatan tercatat setelah pengantaran selesai." />
              : q.data.map((r) => <Card key={r.day}><Row label={r.day} value={rupiah(r.driver_share)} bold /><Row label={`${r.deliveries} pengantaran`} value={`ongkir ${rupiah(r.gross_fee)}`} /></Card>)}
            <Card><Row label="Status pencairan" value="Diatur admin" /></Card>
          </>
        )}
      </Screen>
    </>
  );
}
