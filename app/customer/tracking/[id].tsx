import React, { useCallback, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Button, Card, Divider, ErrorBox, Field, Header, Loading, Row, Screen, Section, Stars, StatusBadge, Stepper } from '@/components/ui';
import { TrackMap } from '@/components/TrackMap';
import { colors, font } from '@/constants/theme';
import { dateTime, friendlyError, isFinal, rupiah, STATUS_LABEL } from '@/utils/format';
import type { HistoryRow, Order } from '@/types';

type Driver = { vehicle_type: string; vehicle_plate: string; name: string; phone: string | null };

export default function Tracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const [busy, setBusy] = useState(false);
  const [mr, setMr] = useState(0);
  const [dr, setDr] = useState(0);
  const [comment, setComment] = useState('');

  const q = useQuery(async () => {
    const order = unwrap(await supabase.from('orders').select('*, merchants(name,address_text,latitude,longitude,phone), order_items(*)').eq('id', id).maybeSingle()) as Order | null;
    if (!order) return null;
    const history = unwrap(await supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at')) as HistoryRow[];
    let driver: Driver | null = null;
    if (order.driver_id) {
      const d = unwrap(await supabase.from('drivers').select('vehicle_type, vehicle_plate, user_id').eq('id', order.driver_id).maybeSingle()) as { vehicle_type: string; vehicle_plate: string; user_id: string } | null;
      if (d) {
        const p = unwrap(await supabase.from('profiles').select('full_name, phone').eq('id', d.user_id).maybeSingle()) as { full_name: string; phone: string | null } | null;
        driver = { vehicle_type: d.vehicle_type, vehicle_plate: d.vehicle_plate, name: p?.full_name ?? 'Driver', phone: p?.phone ?? null };
      }
    }
    const live = ['driver_to_merchant', 'picked_up', 'delivering'].includes(order.status);
    const loc = live ? (unwrap(await supabase.from('driver_locations').select('latitude,longitude').eq('order_id', id).order('recorded_at', { ascending: false }).limit(1)) as { latitude: number; longitude: number }[])[0] ?? null : null;
    const reviewed = (unwrap(await supabase.from('reviews').select('id').eq('order_id', id).eq('customer_id', uid).limit(1)) as unknown[]).length > 0;
    return { order, history, driver, loc, reviewed };
  }, [id]);

  const refetch = useCallback(() => q.refetch(), [q.refetch]);
  useRealtime(`trk-${id}`, 'orders', `id=eq.${id}`, refetch);
  useRealtime(`trk-loc-${id}`, 'driver_locations', `order_id=eq.${id}`, refetch);

  const d = q.data;
  const o = d?.order;

  const cancel = () => Alert.alert('Batalkan pesanan?', 'Pesanan hanya bisa dibatalkan sebelum toko menerima.', [
    { text: 'Tidak', style: 'cancel' },
    { text: 'Batalkan', style: 'destructive', onPress: async () => {
      setBusy(true);
      const { error } = await supabase.rpc('cancel_order', { p_order: id, p_reason: 'Dibatalkan pelanggan' });
      setBusy(false);
      if (error) Alert.alert('Gagal membatalkan', friendlyError(error)); else q.refetch();
    } },
  ]);

  const review = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('submit_review', { p_order: id, p_merchant_rating: mr || null, p_driver_rating: o?.driver_id && dr ? dr : null, p_comment: comment || null });
    setBusy(false);
    if (error) Alert.alert('Ulasan belum terkirim', friendlyError(error)); else q.refetch();
  };

  return (
    <>
      <Header title={o?.order_number ?? 'Pesanan'} subtitle={o?.merchants?.name} back />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !o || !d ? <ErrorBox message="Pesanan tidak ditemukan." /> : (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: font.lg, fontWeight: '800', color: colors.green900 }}>Status</Text>
                <StatusBadge status={o.status} />
              </View>
              {isFinal(o.status) && o.status !== 'completed' ? (
                <Text style={{ color: colors.red600 }}>{STATUS_LABEL[o.status]}{o.cancel_reason ? `: ${o.cancel_reason}` : ''}{o.payment_status === 'refund_required' ? '. Pengembalian dana sedang diproses admin.' : ''}</Text>
              ) : <Stepper status={o.status} />}
            </Card>

            {['driver_to_merchant', 'picked_up', 'delivering'].includes(o.status) ? (
              <TrackMap store={o.merchants ? { latitude: Number(o.merchants.latitude), longitude: Number(o.merchants.longitude) } : null}
                dest={o.dest_lat != null ? { latitude: Number(o.dest_lat), longitude: Number(o.dest_lng) } : null}
                driver={d.loc ? { latitude: Number(d.loc.latitude), longitude: Number(d.loc.longitude) } : null} />
            ) : null}

            {d.driver ? (
              <Card>
                <Text style={{ fontWeight: '800', color: colors.ink }}>Driver: {d.driver.name}</Text>
                <Text style={{ color: colors.muted }}>{d.driver.vehicle_type} · {d.driver.vehicle_plate}</Text>
                {d.driver.phone ? <Button title="Telepon driver" icon="call" variant="secondary" small onPress={() => Linking.openURL(`tel:+${d.driver!.phone}`)} /> : null}
              </Card>
            ) : null}

            <Section title="Rincian pesanan" />
            <Card>
              {o.order_items?.map((i) => <Row key={i.id} label={`${i.quantity}× ${i.product_name_snapshot}`} value={rupiah(i.line_total)} />)}
              <Divider />
              <Row label="Subtotal produk" value={rupiah(o.subtotal)} />
              <Row label="Ongkir" value={rupiah(o.delivery_fee)} />
              {o.discount_total ? <Row label="Diskon" value={`-${rupiah(o.discount_total)}`} /> : null}
              <Row label="Total" value={rupiah(o.grand_total)} bold tone="orange" />
              <Row label="Pembayaran" value={`${o.payment_method === 'cod' ? 'COD' : 'QRIS'} · ${o.payment_status === 'paid' ? 'Lunas' : o.payment_status === 'unpaid' ? 'Belum dibayar' : o.payment_status === 'refund_required' ? 'Menunggu refund' : o.payment_status}`} />
            </Card>
            <Card>
              <Text style={{ fontWeight: '800', color: colors.ink }}>Diantar ke {o.dest_label} · {o.dest_recipient}</Text>
              <Text style={{ color: colors.muted }}>{o.dest_address}</Text>
              {o.dest_note ? <Text style={{ color: colors.muted }}>Patokan: {o.dest_note}</Text> : null}
              {o.customer_note ? <Text style={{ color: colors.muted }}>Catatan: {o.customer_note}</Text> : null}
            </Card>

            <Section title="Riwayat status" />
            <Card>
              {d.history.map((h) => (
                <View key={h.id}>
                  <Text style={{ fontWeight: '600', color: colors.ink }}>{STATUS_LABEL[h.new_status as keyof typeof STATUS_LABEL] ?? h.new_status}</Text>
                  <Text style={{ color: colors.muted, fontSize: font.sm }}>{dateTime(h.created_at)}{h.note ? ` · ${h.note}` : ''}</Text>
                </View>
              ))}
            </Card>

            {['pending_payment', 'pending_merchant'].includes(o.status) ? <Button title="Batalkan pesanan" variant="danger" loading={busy} onPress={cancel} /> : null}
            {['accepted', 'preparing', 'ready_for_pickup', 'assigned_to_driver', 'driver_to_merchant', 'picked_up', 'delivering'].includes(o.status)
              ? <Text style={{ color: colors.muted, fontSize: font.sm }}>Perlu membatalkan? Pesanan sudah diproses, jadi pembatalan ditangani admin.</Text> : null}

            {o.status === 'completed' && !d.reviewed ? (
              <Card>
                <Text style={{ fontSize: font.lg, fontWeight: '800', color: colors.green900 }}>Beri penilaian</Text>
                <Text style={{ color: colors.muted }}>Toko</Text><Stars value={mr} onChange={setMr} />
                {o.driver_id ? <><Text style={{ color: colors.muted }}>Driver</Text><Stars value={dr} onChange={setDr} /></> : null}
                <Field label="Ulasan (opsional)" value={comment} onChangeText={setComment} multiline maxLength={300} />
                <Button title="Kirim penilaian" onPress={review} loading={busy} disabled={!mr && !dr} />
              </Card>
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}
