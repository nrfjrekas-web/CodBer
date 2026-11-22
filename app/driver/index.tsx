import React, { useCallback, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useTracking } from '@/stores/tracking';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { askLocationPermission } from '@/hooks/useShareLocation';
import { Badge, Button, Card, Empty, ErrorBox, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { OrderCard } from '@/components/OrderCard';
import { colors, font } from '@/constants/theme';
import { friendlyError, isoDate, rupiah } from '@/utils/format';
import type { Order } from '@/types';

export default function DriverHome() {
  const { session, profile } = useAuth();
  const uid = (session?.user.id ?? '');
  const track = useTracking();
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery(async () => {
    const drv = unwrap(await supabase.from('drivers').select('id,is_online,vehicle_plate').eq('user_id', uid).maybeSingle()) as { id: string; is_online: boolean; vehicle_plate: string } | null;
    if (!drv) return null;
    const orders = unwrap(await supabase.from('orders').select('*, merchants(name,address_text,latitude,longitude,phone), order_items(quantity)').eq('driver_id', drv.id)
      .in('status', ['assigned_to_driver', 'driver_to_merchant', 'picked_up', 'delivering']).order('created_at')) as Order[];
    const today = unwrap(await supabase.rpc('driver_earnings', { p_from: isoDate(), p_to: isoDate() })) as { deliveries: number; driver_share: number }[];
    return { drv, orders, today: today[0] ?? { deliveries: 0, driver_share: 0 } };
  }, [uid]);
  useRealtime('drv-home', 'orders', undefined, useCallback(() => q.refetch(), [q.refetch]));

  const toggle = async (v: boolean) => {
    const { error } = await supabase.from('drivers').update({ is_online: v }).eq('id', q.data!.drv.id);
    if (error) Alert.alert('Gagal', friendlyError(error)); else q.refetch();
  };
  const respond = async (id: string, accept: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc('driver_respond', { p_order: id, p_accept: accept });
    setBusy(null);
    if (error) Alert.alert('Gagal', friendlyError(error)); else q.refetch();
  };

  const d = q.data;
  const incoming = d?.orders.filter((o) => o.status === 'assigned_to_driver') ?? [];
  const active = d?.orders.filter((o) => o.status !== 'assigned_to_driver') ?? [];

  return (
    <>
      <Header title={`Hai, ${profile?.full_name?.split(' ')[0] ?? 'Driver'}`} subtitle={d?.drv.vehicle_plate} />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !d ? <Empty icon="alert-circle-outline" title="Akun driver belum aktif" text="Role driver aktif setelah pengajuanmu disetujui admin." /> : (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.lg, fontWeight: '800', color: colors.ink }}>{d.drv.is_online ? 'Online' : 'Offline'}</Text>
                <Text style={{ color: colors.muted, fontSize: font.sm }}>{d.drv.is_online ? 'Admin bisa menugaskan pesanan ke kamu.' : 'Aktifkan saat siap menerima tugas.'}</Text>
              </View>
              <Switch value={d.drv.is_online} onValueChange={toggle} trackColor={{ true: colors.green600 }} accessibilityLabel="Status online" />
            </Card>

            {track.orderId && track.needsPermission ? (
              <Card style={{ backgroundColor: colors.amber100, borderColor: colors.amber100 }}>
                <Text style={{ fontWeight: '800', color: colors.ink }}>Aktifkan lokasi untuk pengantaran</Text>
                <Text style={{ color: colors.ink }}>Lokasimu hanya dibagikan ke pelanggan pesanan ini selama pengantaran, lalu berhenti otomatis saat selesai.</Text>
                <Button title="Izinkan lokasi" onPress={askLocationPermission} />
              </Card>
            ) : track.sharing ? <Badge label="Lokasi dibagikan ke pelanggan" tone="green" /> : null}

            <Card><Row label="Pengantaran hari ini" value={`${d.today.deliveries}`} /><Row label="Bagian driver hari ini" value={rupiah(d.today.driver_share)} bold tone="orange" /></Card>

            {incoming.length ? <Section title="Tugas baru" /> : null}
            {incoming.map((o) => (
              <Card key={o.id}>
                <Text style={{ fontWeight: '800', color: colors.ink }}>{o.order_number} · {o.merchants?.name}</Text>
                <Text style={{ color: colors.muted }}>Ambil: {o.merchants?.address_text}</Text>
                <Text style={{ color: colors.muted }}>Antar: {o.dest_address}</Text>
                <Row label="Bagianmu" value={rupiah(o.driver_share)} tone="orange" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Button title="Tolak" variant="danger" loading={busy === o.id} onPress={() => respond(o.id, false)} /></View>
                  <View style={{ flex: 1 }}><Button title="Terima" loading={busy === o.id} onPress={() => respond(o.id, true)} /></View>
                </View>
              </Card>
            ))}

            <Section title="Pesanan aktif" />
            {active.length ? active.map((o) => <OrderCard key={o.id} order={o} href={`/driver/order/${o.id}`} />)
              : <Empty icon="bicycle-outline" title="Belum ada tugas aktif" text="Tugas dari admin akan muncul di sini dengan notifikasi." />}
          </>
        )}
      </Screen>
    </>
  );
}
