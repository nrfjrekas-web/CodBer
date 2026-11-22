import React, { useCallback } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, Divider, ErrorBox, Header, Loading, Row, Screen, StatusBadge } from '@/components/ui';
import { MerchantActions } from '@/components/MerchantActions';
import { colors } from '@/constants/theme';
import { dateTime, rupiah } from '@/utils/format';
import type { Order } from '@/types';

export default function MerchantOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery(async () => unwrap(await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()) as Order | null, [id]);
  useRealtime(`mer-ord-${id}`, 'orders', `id=eq.${id}`, useCallback(() => q.refetch(), [q.refetch]));
  const o = q.data;
  return (
    <>
      <Header title={o?.order_number ?? 'Pesanan'} back right={o ? <StatusBadge status={o.status} /> : undefined} />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !o ? <ErrorBox message="Pesanan tidak ditemukan." /> : (
          <>
            <Text style={{ color: colors.muted }}>{dateTime(o.created_at)} · {o.dest_recipient}</Text>
            <Card>
              {o.order_items?.map((i) => <Row key={i.id} label={`${i.quantity}× ${i.product_name_snapshot}`} value={rupiah(i.line_total)} />)}
              <Divider />
              <Row label="Subtotal produk" value={rupiah(o.subtotal)} />
              <Row label="Komisi platform (10%)" value={`-${rupiah(o.merchant_commission)}`} />
              <Row label="Bersih untukmu" value={rupiah(o.subtotal - o.merchant_commission)} bold tone="orange" />
              {o.customer_note ? <Text style={{ color: colors.ink }}>Catatan pelanggan: {o.customer_note}</Text> : null}
              {o.cancel_reason ? <Text style={{ color: colors.red600 }}>Alasan: {o.cancel_reason}</Text> : null}
            </Card>
            <MerchantActions id={o.id} status={o.status} onDone={q.refetch} />
            {o.status === 'ready_for_pickup' ? <Text style={{ color: colors.muted }}>Menunggu admin menugaskan driver. Serahkan pesanan saat driver tiba.</Text> : null}
          </>
        )}
      </Screen>
    </>
  );
}
