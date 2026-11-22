import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Badge, Button, Card, Divider, ErrorBox, Field, Header, Loading, Row, Screen, Section, StatusBadge } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { dateTime, friendlyError, isFinal, rupiah, STATUS_LABEL } from '@/utils/format';
import type { HistoryRow, Order } from '@/types';

type Drv = { id: string; vehicle_plate: string; vehicle_type: string; is_online: boolean; user_id: string; name?: string };

export default function AdminOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const q = useQuery(async () => {
    const order = unwrap(await supabase.from('orders').select('*, merchants(name,address_text,latitude,longitude,phone), order_items(*)').eq('id', id).maybeSingle()) as Order | null;
    if (!order) return null;
    const history = unwrap(await supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at')) as HistoryRow[];
    const drivers = unwrap(await supabase.from('drivers').select('id,vehicle_plate,vehicle_type,is_online,user_id').eq('is_approved', true)) as Drv[];
    const names = unwrap(await supabase.from('profiles').select('id,full_name').in('id', drivers.map((d) => d.user_id))) as { id: string; full_name: string }[];
    drivers.forEach((d) => { d.name = names.find((n) => n.id === d.user_id)?.full_name; });
    drivers.sort((a, b) => Number(b.is_online) - Number(a.is_online));
    return { order, history, drivers };
  }, [id]);
  useRealtime(`adm-ord-${id}`, 'orders', `id=eq.${id}`, useCallback(() => q.refetch(), [q.refetch]));
  const o = q.data?.order;
  const canAssign = o && ['ready_for_pickup', 'assigned_to_driver', 'driver_to_merchant'].includes(o.status);

  const assign = (d: Drv) => Alert.alert('Tugaskan driver?', `${d.name ?? 'Driver'} · ${d.vehicle_plate}`, [
    { text: 'Batal', style: 'cancel' },
    { text: 'Tugaskan', onPress: async () => {
      setBusy(true);
      const { error } = await supabase.rpc('admin_assign_driver', { p_order: id, p_driver: d.id });
      setBusy(false);
      if (error) Alert.alert('Gagal', friendlyError(error)); else q.refetch();
    } },
  ]);
  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('cancel_order', { p_order: id, p_reason: reason.trim() });
    setBusy(false);
    if (error) Alert.alert('Gagal', friendlyError(error)); else { setCancelling(false); q.refetch(); }
  };

  return (
    <>
      <Header title={o?.order_number ?? 'Pesanan'} back right={o ? <StatusBadge status={o.status} /> : undefined} />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !o || !q.data ? <ErrorBox message="Pesanan tidak ditemukan." /> : (
          <>
            <Card>
              <Text style={{ fontWeight: '800', color: colors.ink }}>{o.merchants?.name}</Text>
              <Text style={{ color: colors.muted }}>Antar ke {o.dest_recipient}: {o.dest_address}</Text>
              <Divider />
              {o.order_items?.map((i) => <Row key={i.id} label={`${i.quantity}× ${i.product_name_snapshot}`} value={rupiah(i.line_total)} />)}
              <Divider />
              <Row label="Subtotal" value={rupiah(o.subtotal)} />
              <Row label="Ongkir" value={rupiah(o.delivery_fee)} />
              <Row label="Total" value={rupiah(o.grand_total)} bold tone="orange" />
              <Row label="Komisi toko" value={rupiah(o.merchant_commission)} />
              <Row label="Driver / Admin dari ongkir" value={`${rupiah(o.driver_share)} / ${rupiah(o.admin_delivery_share)}`} />
              <Row label="Pembayaran" value={`${o.payment_method.toUpperCase()} · ${o.payment_status}`} />
            </Card>

            {o.payment_status === 'refund_required' ? <Badge label="Perlu refund QRIS ke pelanggan" tone="red" /> : null}

            {canAssign ? (
              <>
                <Section title={o.driver_id ? 'Ganti driver' : 'Pilih driver'} />
                {q.data.drivers.length ? q.data.drivers.map((d) => (
                  <Card key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: colors.ink }}>{d.name ?? 'Driver'}{d.id === o.driver_id ? ' (saat ini)' : ''}</Text>
                      <Text style={{ color: colors.muted, fontSize: font.sm }}>{d.vehicle_type} · {d.vehicle_plate}</Text>
                    </View>
                    <Badge label={d.is_online ? 'Online' : 'Offline'} tone={d.is_online ? 'green' : 'gray'} />
                    <Button title="Tugaskan" small loading={busy} disabled={d.id === o.driver_id} onPress={() => assign(d)} />
                  </Card>
                )) : <Text style={{ color: colors.muted }}>Belum ada driver yang disetujui.</Text>}
              </>
            ) : null}

            <Section title="Riwayat status" />
            <Card>
              {q.data.history.map((h) => (
                <View key={h.id}>
                  <Text style={{ fontWeight: '600', color: colors.ink }}>{STATUS_LABEL[h.new_status as keyof typeof STATUS_LABEL] ?? h.new_status}</Text>
                  <Text style={{ color: colors.muted, fontSize: font.sm }}>{dateTime(h.created_at)}{h.note ? ` · ${h.note}` : ''}</Text>
                </View>
              ))}
            </Card>

            {!isFinal(o.status) ? (cancelling ? (
              <Card>
                <Field label="Alasan pembatalan" value={reason} onChangeText={setReason} />
                <Button title="Batalkan pesanan" variant="danger" loading={busy} disabled={!reason.trim()} onPress={cancel} />
                <Button title="Batal" variant="ghost" onPress={() => setCancelling(false)} />
              </Card>
            ) : <Button title="Batalkan pesanan" variant="danger" onPress={() => setCancelling(true)} />) : null}
          </>
        )}
      </Screen>
    </>
  );
}
