import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, mediaUrl } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { cartCount, cartSubtotal, useCart } from '@/stores/cart';
import { Badge, Button, Empty, ErrorBox, Header, Loading, Price, Screen, Thumb } from '@/components/ui';
import { ProductRow } from '@/components/StoreCard';
import { colors, font } from '@/constants/theme';
import { fetchProducts, PAGE } from '@/services/catalog';
import { hhmm, isStoreOpen, rupiah } from '@/utils/format';
import type { Merchant, Product } from '@/types';

export default function StoreDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();
  const count = useCart(cartCount);
  const subtotal = useCart(cartSubtotal);
  const [extra, setExtra] = useState<Product[]>([]);
  const [done, setDone] = useState(false);

  const q = useQuery(async () => {
    const m = unwrap(await supabase.from('merchants').select('*').eq('id', id).maybeSingle()) as Merchant | null;
    const rs = unwrap(await supabase.from('rating_stats').select('avg_rating,total').eq('merchant_id', id)) as { avg_rating: number; total: number }[];
    const products = await fetchProducts({ merchantId: id });
    return { m, products, rating: rs[0] };
  }, [id]);

  const m = q.data?.m;
  const open = m ? isStoreOpen(m) : false;
  const list = [...(q.data?.products ?? []), ...extra];

  const add = (p: Product) => {
    if (!m) return;
    const line = { productId: p.id, name: p.name, price: p.price, stock: p.stock, photo: p.photo_path };
    if (cart.add({ id: m.id, name: m.name }, line) === 'conflict') {
      Alert.alert('Ganti toko?', `Keranjangmu berisi pesanan dari ${cart.merchantName}. Satu pesanan hanya untuk satu toko.`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Kosongkan & lanjut', style: 'destructive', onPress: () => cart.replaceWith({ id: m.id, name: m.name }, line) },
      ]);
    }
  };
  const loadMore = async () => {
    const rows = await fetchProducts({ merchantId: id, from: list.length });
    setExtra((e) => [...e, ...rows]);
    if (rows.length < PAGE) setDone(true);
  };

  return (
    <>
      <Header title={m?.name ?? 'Toko'} back />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}
        footer={count > 0 && cart.merchantId === id ? <Button title={`Lihat keranjang · ${count} item · ${rupiah(subtotal)}`} icon="bag-handle" onPress={() => router.push('/customer/cart' as never)} /> : undefined}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !m ? <Empty title="Toko tidak ditemukan" /> : (
          <>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Thumb uri={mediaUrl(m.photo_url, 200)} size={84} icon="storefront-outline" />
              <View style={{ flex: 1, gap: 4 }}>
                <Badge label={open ? 'Buka' : 'Tutup'} tone={open ? 'green' : 'gray'} />
                <Text style={{ color: colors.muted, fontSize: font.sm }}>Jam {hhmm(m.open_time)}–{hhmm(m.close_time)}</Text>
                {q.data?.rating ? <Text style={{ color: colors.ink, fontSize: font.sm }}>★ {Number(q.data.rating.avg_rating).toFixed(1)} · {q.data.rating.total} ulasan</Text> : <Text style={{ color: colors.muted, fontSize: font.sm }}>Belum ada ulasan</Text>}
              </View>
            </View>
            <Pressable style={{ flexDirection: 'row', gap: 6 }}><Ionicons name="location-outline" size={18} color={colors.green700} /><Text style={{ flex: 1, color: colors.muted, fontSize: font.sm }}>{m.address_text}</Text></Pressable>
            {m.description ? <Text style={{ color: colors.ink }}>{m.description}</Text> : null}
            {!open ? <Text style={{ color: colors.orange600, fontWeight: '700' }}>Toko sedang tutup. Kamu masih bisa melihat menu, tapi belum bisa memesan.</Text> : null}
            {!list.length ? <Empty icon="fast-food-outline" title="Belum ada produk" text="Toko ini belum menambahkan menu." />
              : list.map((p) => <ProductRow key={p.id} p={p} onAdd={open ? () => add(p) : undefined} />)}
            {!done && list.length >= PAGE ? <Button title="Muat lebih banyak" variant="secondary" onPress={loadMore} /> : null}
          </>
        )}
      </Screen>
    </>
  );
}
