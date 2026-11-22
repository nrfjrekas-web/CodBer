import React, { useCallback, useState } from 'react';
import { Alert, Linking, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTracking } from '@/stores/tracking';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Badge, Button, Card, Divider, ErrorBox, Header, Loading, Row, Screen, Section, StatusBadge } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { friendlyError, rupiah } from '@/utils/format';
import type { Order } from '@/types';

const nav = (lat?: number | null, lng?: number | null) => lat != null && Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));

export default function DriverOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sharing = useTracking((s) => s.sharing);
  const [busy, setBusy] = useState(false);
  const q = useQuery(async () => unwrap(await supabase.from('orders').select('*, merchants(name,address_text,latitude,longitude,phone), order_items(*)').eq('id', id).maybeSingle()) as Order | null, [id]);
  useRealtime(`drv-ord-${id}`, 'orders', `id=eq.${id}`, useCallback(() => q.refetch(), [q.refetch]));
  const o = q.data;

  const act = async (action: 'pickup' | 'deliver' | 'complete') => {
    setBusy(true);
    const { error } = await supabase.rpc('driver_order_action', { p_order: id, p_action: action });
    setBusy(false);
    if (error) Alert.alert('Gagal', friendlyError(error)); else q.refetch();
  };
  const confirm = (action: 'pickup' | 'deliver' | 'complete', title: string, text: string) => Alert.alert(title, text, [{ text: 'Batal', style: 'cancel' }, { text: 'Ya', onPress: () => act(action) }]);

  const call = (phone?: string | null) => phone && Linking.openURL(`tel:+${phone.replace(/^\+/, '')}`);

  return (
    <>
      <Header title={o?.order_number ?? 'Tugas'} back right={o ? <StatusBadge status={o.status} /> : undefined} />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !o ? <ErrorBox message="Tugas tidak ditemukan atau bukan milikmu." /> : (
          <>
            {sharing && ['driver_to_merchant', 'picked_up', 'delivering'].includes(o.status) ? <Badge label="Lokasi dibagikan ke pelanggan" tone="green" /> : null}

            <Section title="1 · Ambil di toko" />
            <Card>
              <Text style={{ fontWeight: '800', color: colors.ink }}>{o.merchants?.name}</Text>
              <Text style={{ color: colors.muted }}>{o.merchants?.address_text}</Text>
              <Button title="Navigasi ke toko" icon="navigate" variant="secondary" small onPress={() => nav(Number(o.merchants?.latitude), Number(o.merchants?.longitude))} />
              <Button title="Telepon toko" icon="call" variant="secondary" small onPress={() => call(o.merchants?.phone)} />
            </Card>

            <Section title="2 · Antar ke pelanggan" />
            <Card>
              <Text style={{ fontWeight: '800', color: colors.ink }}>{o.dest_recipient}</Text>
              <Text style={{ color: colors.muted }}>{o.dest_address}</Text>
              {o.dest_note ? <Text style={{ color: colors.ink }}>Patokan: {o.dest_note}</Text> : null}
              <Button title="Navigasi ke pelanggan" icon="navigate" variant="secondary" small onPress={() => nav(Number(o.dest_lat), Number(o.dest_lng))} />
              <Button title="Telepon penerima" icon="call" variant="secondary" small onPress={() => call(o.dest_phone)} />
            </Card>

            <Card>
              {o.order_items?.map((i) => <Row key={i.id} label={`${i.quantity}× ${i.product_name_snapshot}`} value={rupiah(i.line_total)} />)}
              <Divider />
              <Row label="Bagianmu (80% ongkir)" value={rupiah(o.driver_share)} tone="orange" />
              {o.payment_method === 'cod'
                ? <Row label="Tagih tunai dari pelanggan" value={rupiah(o.grand_total)} bold tone="red" />
                : <Row label="Pembayaran" value="QRIS lunas, tidak perlu tagih" bold />}
              {o.customer_note ? <Text style={{ color: colors.muted }}>Catatan: {o.customer_note}</Text> : null}
            </Card>

            {o.status === 'driver_to_merchant' ? <Button title="Pesanan sudah kuambil" icon="bag-check" loading={busy} onPress={() => confirm('pickup', 'Sudah ambil pesanan?', 'Pastikan semua item sudah kamu terima dari toko.')} /> : null}
            {o.status === 'picked_up' ? <Button title="Mulai antar ke pelanggan" icon="bicycle" loading={busy} onPress={() => act('deliver')} /> : null}
            {o.status === 'delivering' ? <Button title="Pesanan sudah diantar" icon="checkmark-done" loading={busy} onPress={() => confirm('complete', 'Selesaikan pengantaran?', o.payment_method === 'cod' ? `Pastikan kamu sudah menerima tunai ${rupiah(o.grand_total)}.` : 'Pastikan pesanan sudah diterima pelanggan.')} /> : null}
            {o.status === 'assigned_to_driver' ? <Text style={{ color: colors.muted, fontSize: font.sm }}>Terima atau tolak tugas ini dari tab Tugas.</Text> : null}
            {o.status === 'completed' ? <Text style={{ color: colors.green700, fontWeight: '700' }}>Pengantaran selesai. Terima kasih!</Text> : null}
          </>
        )}
      </Screen>
    </>
  );
}
