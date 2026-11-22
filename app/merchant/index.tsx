import React, { useCallback } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, Empty, ErrorBox, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { OrderCard } from '@/components/OrderCard';
import { MerchantActions } from '@/components/MerchantActions';
import { colors, font } from '@/constants/theme';
import { friendlyError, isoDate, rupiah } from '@/utils/format';
import type { Merchant, Order } from '@/types';

export default function MerchantHome() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const q = useQuery(async () => {
    const m = unwrap(await supabase.from('merchants').select('*').eq('owner_user_id', uid).maybeSingle()) as Merchant | null;
    if (!m) return null;
    const orders = unwrap(await supabase.from('orders').select('*, order_items(quantity)').eq('merchant_id', m.id).in('status', ['pending_merchant', 'accepted', 'preparing', 'ready_for_pickup']).order('created_at')) as Order[];
    const rep = unwrap(await supabase.rpc('merchant_report', { p_from: isoDate(), p_to: isoDate() })) as { orders: number; subtotal: number; net: number }[];
    return { m, orders, today: rep[0] ?? { orders: 0, subtotal: 0, net: 0 } };
  }, [uid]);
  useRealtime('mer-home', 'orders', undefined, useCallback(() => q.refetch(), [q.refetch]));

  const toggle = async (v: boolean) => {
    const { error } = await supabase.from('merchants').update({ is_open: v }).eq('id', q.data!.m.id);
    if (error) Alert.alert('Gagal', friendlyError(error)); else q.refetch();
  };
  const d = q.data;
  const by = (s: string[]) => d?.orders.filter((o) => s.includes(o.status)) ?? [];
  const groups: [string, string[]][] = [['Pesanan baru', ['pending_merchant']], ['Diproses', ['accepted', 'preparing']], ['Siap diambil', ['ready_for_pickup']]];

  return (
    <>
      <Header title={d?.m.name ?? 'Dashboard'} />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !d ? <Empty icon="storefront-outline" title="Toko belum aktif" text="Dashboard aktif setelah pengajuan toko disetujui admin." /> : (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.lg, fontWeight: '800', color: colors.ink }}>{d.m.is_open ? 'Toko buka' : 'Toko tutup'}</Text>
                <Text style={{ color: colors.muted, fontSize: font.sm }}>{d.m.is_open ? 'Pelanggan bisa memesan.' : 'Pelanggan belum bisa memesan.'}</Text>
              </View>
              <Switch value={d.m.is_open} onValueChange={toggle} trackColor={{ true: colors.green600 }} accessibilityLabel="Status toko" />
            </Card>
            <Card>
              <Row label="Pesanan selesai hari ini" value={`${d.today.orders}`} />
              <Row label="Penjualan produk" value={rupiah(d.today.subtotal)} />
              <Row label="Bersih setelah komisi" value={rupiah(d.today.net)} bold tone="orange" />
            </Card>
            {groups.map(([title, st]) => (by(st).length ? (
              <View key={title} style={{ gap: 12 }}>
                <Section title={`${title} (${by(st).length})`} />
                {by(st).map((o) => (
                  <View key={o.id} style={{ gap: 8 }}>
                    <OrderCard order={o} href={`/merchant/order/${o.id}`} title={`Pesanan ${o.order_number}`} />
                    <MerchantActions id={o.id} status={o.status} onDone={q.refetch} />
                  </View>
                ))}
              </View>
            ) : null))}
            {!d.orders.length ? <Empty icon="receipt-outline" title="Belum ada pesanan masuk" text="Pesanan baru muncul di sini dengan notifikasi." /> : null}
          </>
        )}
      </Screen>
    </>
  );
}
