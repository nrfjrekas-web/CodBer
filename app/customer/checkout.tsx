import React, { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { cartSubtotal, useCart } from '@/stores/cart';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Card, Divider, Empty, ErrorBox, Field, Header, Loading, Row, Screen, Section } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { distanceKm, friendlyError, rupiah } from '@/utils/format';
import type { Address, Merchant } from '@/types';

type Zone = { id: string; name: string; delivery_fee: number; rules: { max_km: number } };

export default function Checkout() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const { lines, merchantId, clear } = useCart();
  const subtotal = useCart(cartSubtotal);
  const [addrId, setAddrId] = useState<string | null>(null);
  const [pay, setPay] = useState<'cod' | 'qris'>('cod');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // Kunci idempotensi dibuat sekali per percobaan checkout: tombol ditekan berulang tidak membuat pesanan ganda.
  const idem = useRef(`${uid.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const q = useQuery(async () => {
    const [addrs, zones, m] = await Promise.all([
      supabase.from('customer_addresses').select('*').eq('user_id', uid).order('is_default', { ascending: false }).then(unwrap) as Promise<Address[]>,
      supabase.from('zones').select('*').eq('is_active', true).then(unwrap) as Promise<Zone[]>,
      supabase.from('merchants').select('*').eq('id', merchantId).maybeSingle().then(unwrap) as Promise<Merchant | null>,
    ]);
    return { addrs, zones, m };
  }, [uid, merchantId]);

  const addr = q.data?.addrs.find((a) => a.id === (addrId ?? q.data?.addrs[0]?.id)) ?? null;
  // Estimasi untuk tampilan. Angka resmi dihitung server saat pesanan dibuat.
  const km = addr && q.data?.m ? distanceKm(addr.latitude, addr.longitude, q.data.m.latitude, q.data.m.longitude) : null;
  const zone = km != null ? [...(q.data?.zones ?? [])].sort((a, b) => a.rules.max_km - b.rules.max_km).find((z) => z.rules.max_km >= km) : undefined;
  const outOfArea = km != null && !zone;
  const fee = zone?.delivery_fee ?? 0;

  const place = async () => {
    if (!addr || !merchantId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('create_order', {
      p_merchant_id: merchantId, p_address_id: addr.id, p_payment_method: pay, p_note: note || null,
      p_idempotency_key: idem.current, p_items: lines.map((l) => ({ product_id: l.productId, quantity: l.qty })),
    });
    setBusy(false);
    if (error) {
      Alert.alert('Pesanan belum dibuat', friendlyError(error));
      if (/stock|unavailable|closed/i.test(error.message)) q.refetch();
      return;
    }
    clear();
    // Pesanan dianggap berhasil hanya setelah server mengonfirmasi (id dikembalikan).
    router.replace((pay === 'qris' ? `/customer/payment/${data}` : `/customer/tracking/${data}`) as never);
  };

  if (!lines.length) return <><Header title="Checkout" back /><Empty icon="bag-handle-outline" title="Keranjang kosong" /></>;

  return (
    <>
      <Header title="Checkout" back />
      <Screen footer={
        <>
          <Row label="Total pembayaran" value={rupiah(subtotal + fee)} bold tone="orange" />
          <Button title={pay === 'cod' ? 'Pesan sekarang (bayar di tempat)' : 'Pesan & bayar QRIS'} onPress={place} loading={busy} disabled={!addr || outOfArea || q.loading} />
        </>
      }>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : (
          <>
            <Section title="Alamat pengantaran" action={<Button title="Kelola" variant="ghost" small onPress={() => router.push('/customer/addresses' as never)} />} />
            {!q.data?.addrs.length ? (
              <Card><Text style={{ color: colors.muted }}>Belum ada alamat tersimpan.</Text><Button title="Tambah alamat" onPress={() => router.push('/customer/address-form' as never)} /></Card>
            ) : q.data.addrs.map((a) => {
              const on = a.id === addr?.id;
              return (
                <Pressable key={a.id} onPress={() => setAddrId(a.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Card style={[{ flexDirection: 'row', gap: 12, alignItems: 'center' }, on && { borderColor: colors.green600, borderWidth: 2 }]}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.green600 : colors.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: colors.ink }}>{a.label} · {a.recipient_name}</Text>
                      <Text style={{ color: colors.muted, fontSize: font.sm }} numberOfLines={2}>{a.address_text}</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
            {outOfArea ? <Text style={{ color: colors.red600, fontWeight: '700' }}>Alamat ini di luar area pengantaran CodBer. Pilih alamat lain.</Text> : null}

            <Section title="Pembayaran" />
            {(process.env.EXPO_PUBLIC_QRIS_ENABLED === '1' ? (['cod', 'qris'] as const) : (['cod'] as const)).map((m) => (
              <Pressable key={m} onPress={() => setPay(m)} accessibilityRole="radio" accessibilityState={{ selected: pay === m }}>
                <Card style={[{ flexDirection: 'row', gap: 12, alignItems: 'center' }, pay === m && { borderColor: colors.green600, borderWidth: 2 }]}>
                  <Ionicons name={pay === m ? 'radio-button-on' : 'radio-button-off'} size={22} color={pay === m ? colors.green600 : colors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: colors.ink }}>{m === 'cod' ? 'COD (bayar di tempat)' : 'QRIS'}</Text>
                    <Text style={{ color: colors.muted, fontSize: font.sm }}>{m === 'cod' ? 'Bayar tunai ke driver saat pesanan tiba.' : 'Bayar dulu lewat QRIS, toko memproses setelah lunas.'}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}

            <Section title="Rincian" />
            <Card>
              {lines.map((l) => <Row key={l.productId} label={`${l.qty}× ${l.name}`} value={rupiah(l.qty * l.price)} />)}
              <Divider />
              <Row label="Subtotal produk" value={rupiah(subtotal)} />
              <Row label={zone ? `Ongkir (${zone.name}${km != null ? `, ±${km.toFixed(1)} km` : ''})` : 'Ongkir'} value={zone ? rupiah(fee) : '—'} />
              <Row label="Diskon" value={rupiah(0)} />
            </Card>
            <Field label="Catatan untuk toko (opsional)" value={note} onChangeText={setNote} multiline maxLength={300} placeholder="Contoh: tanpa sambal" />
            <Text style={{ fontSize: font.xs, color: colors.muted }}>Total akhir dihitung ulang oleh server dari harga, stok, dan zona terbaru.</Text>
          </>
        )}
      </Screen>
    </>
  );
}
