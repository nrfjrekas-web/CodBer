import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { cartCount, useCart } from '@/stores/cart';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Button, Card, Empty, ErrorBox, Loading, Screen, Section } from '@/components/ui';
import { StoreCard } from '@/components/StoreCard';
import { OrderCard } from '@/components/OrderCard';
import { colors, font, radius, space } from '@/constants/theme';
import { distanceKm, FINAL_STATUS } from '@/utils/format';
import { fetchDefaultAddress, fetchStores } from '@/services/catalog';
import type { Category, Order } from '@/types';

export default function Home() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const count = useCart(cartCount);

  const q = useQuery(async () => {
    const [addr, cats, stores, active] = await Promise.all([
      fetchDefaultAddress(uid),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order').then(unwrap) as Promise<Category[]>,
      fetchStores({ limit: 12 }),
      supabase.from('orders').select('*, merchants(name), order_items(quantity)').eq('customer_id', uid)
        .not('status', 'in', `(${FINAL_STATUS.join(',')})`).order('created_at', { ascending: false }).limit(5).then(unwrap) as Promise<Order[]>,
    ]);
    return { addr, cats, stores, active };
  }, [uid]);
  useRealtime(`home-${uid}`, 'orders', `customer_id=eq.${uid}`, useCallback(() => q.refetch(), [q.refetch]));

  const d = q.data;
  const sorted = d?.stores.map((m) => ({ m, km: d.addr ? distanceKm(d.addr.latitude, d.addr.longitude, m.latitude, m.longitude) : undefined }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  return (
    <Screen inset onRefresh={q.refresh} refreshing={q.refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/customer/addresses' as never)} accessibilityLabel="Ubah alamat pengantaran">
          <Text style={{ fontSize: font.xs, color: colors.muted, fontWeight: '600' }}>Diantar ke</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location" size={18} color={colors.red600} />
            <Text style={{ fontSize: font.md, fontWeight: '800', color: colors.green900, flexShrink: 1 }} numberOfLines={1}>
              {d?.addr ? `${d.addr.label} · ${d.addr.address_text}` : 'Atur alamat pengantaran'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </View>
        </Pressable>
        <Pressable onPress={() => router.push('/customer/cart' as never)} accessibilityLabel={`Keranjang, ${count} item`} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bag-handle-outline" size={24} color={colors.green900} />
          {count > 0 ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.orange500, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink }}>{count}</Text></View> : null}
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityRole="search" style={{ minHeight: 48, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.md }}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: font.md }}>Cari toko atau produk</Text>
      </Pressable>

      {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : d ? (
        <>
          {!d.addr ? (
            <Card style={{ backgroundColor: colors.orange100, borderColor: colors.orange100 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>Tambahkan alamat dulu</Text>
              <Text style={{ color: colors.muted }}>Alamat dipakai untuk menghitung ongkir dan menampilkan toko terdekat.</Text>
              <Button title="Tambah alamat" small onPress={() => router.push('/customer/address-form' as never)} />
            </Card>
          ) : null}

          {d.active.length ? (
            <>
              <Section title="Pesanan aktif" />
              {d.active.map((o) => <OrderCard key={o.id} order={o} href={`/customer/tracking/${o.id}`} />)}
            </>
          ) : null}

          <Section title="Kategori" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {d.cats.map((c) => (
              <Pressable key={c.id} onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: c.id } })} accessibilityRole="button" style={{ width: 76, alignItems: 'center', gap: 6 }}>
                <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={(c.icon ?? 'pricetag') as never} size={28} color={colors.green700} />
                </View>
                <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Section title={d.addr ? 'Toko terdekat' : 'Toko'} />
          {sorted?.length ? sorted.map(({ m, km }) => <StoreCard key={m.id} m={m} km={km} />)
            : <Empty icon="storefront-outline" title="Belum ada toko" text="Toko di Jember akan tampil di sini setelah disetujui admin." />}
        </>
      ) : null}
    </Screen>
  );
}
