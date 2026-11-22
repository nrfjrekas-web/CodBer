import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { mediaUrl } from '@/lib/supabase';
import { cartSubtotal, useCart } from '@/stores/cart';
import { Button, Card, Empty, Header, Price, Row, Screen, Thumb } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { rupiah } from '@/utils/format';

function Qty({ qty, onMinus, onPlus, max }: { qty: number; onMinus: () => void; onPlus: () => void; max: number }) {
  const b = { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.green600, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable style={b} onPress={onMinus} accessibilityLabel="Kurangi"><Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={20} color={colors.green700} /></Pressable>
      <Text style={{ minWidth: 22, textAlign: 'center', fontWeight: '800', fontSize: font.md }}>{qty}</Text>
      <Pressable style={[b, qty >= max && { opacity: 0.4 }]} disabled={qty >= max} onPress={onPlus} accessibilityLabel="Tambah"><Ionicons name="add" size={20} color={colors.green700} /></Pressable>
    </View>
  );
}

export default function Cart() {
  const { lines, merchantName, setQty, remove, clear } = useCart();
  const subtotal = useCart(cartSubtotal);
  return (
    <>
      <Header title="Keranjang" subtitle={merchantName ?? undefined} back right={lines.length ? <Button title="Kosongkan" variant="ghost" small onPress={clear} /> : undefined} />
      <Screen footer={lines.length ? (
        <>
          <Row label="Subtotal produk" value={rupiah(subtotal)} bold />
          <Text style={{ fontSize: font.xs, color: colors.muted }}>Ongkir dihitung di langkah berikutnya berdasarkan alamat. Harga & stok dicek ulang oleh server saat checkout.</Text>
          <Button title="Lanjut ke checkout" onPress={() => router.push('/customer/checkout' as never)} />
        </>
      ) : undefined}>
        {!lines.length ? <Empty icon="bag-handle-outline" title="Keranjang kosong" text="Pilih toko dan tambahkan produk yang kamu mau."
          action={<Button title="Cari toko" onPress={() => router.replace('/(tabs)/search')} />} />
          : lines.map((l) => (
            <Card key={l.productId} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Thumb uri={mediaUrl(l.photo, 120)} size={60} icon="fast-food-outline" />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={2}>{l.name}</Text>
                <Price value={l.price * l.qty} />
              </View>
              <Qty qty={l.qty} max={l.stock} onMinus={() => (l.qty === 1 ? remove(l.productId) : setQty(l.productId, l.qty - 1))} onPlus={() => setQty(l.productId, l.qty + 1)} />
            </Card>
          ))}
      </Screen>
    </>
  );
}
