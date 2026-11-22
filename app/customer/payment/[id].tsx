import React, { useCallback, useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Button, Card, ErrorBox, Header, Loading, Row, Screen } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { friendlyError, rupiah } from '@/utils/format';

type Pay = { status: string; amount: number; qr_string: string | null; qr_image_url: string | null; expires_at: string | null; provider: string };

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery(async () => {
    const pay = unwrap(await supabase.from('payments').select('*').eq('order_id', id).maybeSingle()) as Pay | null;
    const order = unwrap(await supabase.from('orders').select('order_number,status').eq('id', id).maybeSingle()) as { order_number: string; status: string } | null;
    return { pay, order };
  }, [id]);
  useRealtime(`pay-${id}`, 'orders', `id=eq.${id}`, useCallback(() => q.refetch(), [q.refetch]));

  // Minta server membuat tagihan QRIS bila belum ada (nominal diambil server dari database).
  useEffect(() => {
    if (q.data?.pay && !q.data.pay.qr_string && !q.data.pay.qr_image_url && q.data.order?.status === 'pending_payment') {
      supabase.functions.invoke('create-qris', { body: { order_id: id } }).then(({ error }) => {
        if (error) setErr('Tagihan QRIS belum bisa dibuat. Coba lagi.'); else q.refetch();
      });
    }
  }, [q.data?.pay?.qr_string, q.data?.order?.status]);

  useEffect(() => { if (q.data?.order && q.data.order.status !== 'pending_payment') router.replace(`/customer/tracking/${id}` as never); }, [q.data?.order?.status]);

  const cancel = async () => {
    const { error } = await supabase.rpc('cancel_order', { p_order: id, p_reason: 'Dibatalkan sebelum membayar' });
    if (error) setErr(friendlyError(error)); else router.replace('/(tabs)/orders');
  };

  const p = q.data?.pay;
  return (
    <>
      <Header title="Bayar dengan QRIS" back />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : (
          <>
            <Card style={{ alignItems: 'center', gap: 12 }}>
              <Text style={{ color: colors.muted }}>Pesanan {q.data?.order?.order_number}</Text>
              <Text style={{ fontSize: font.xxl, fontWeight: '800', color: colors.orange600 }}>{rupiah(p?.amount)}</Text>
              {p?.qr_image_url ? <Image source={{ uri: p.qr_image_url }} style={{ width: 240, height: 240 }} accessibilityLabel="Kode QRIS" />
                : p?.qr_string ? <View style={{ padding: 16, backgroundColor: colors.green50, borderRadius: 12 }}><Text selectable style={{ fontFamily: 'monospace', color: colors.ink }}>{p.qr_string}</Text></View>
                : <Loading label="Menyiapkan kode QRIS…" />}
              {p?.expires_at ? <Text style={{ color: colors.muted, fontSize: font.sm }}>Berlaku sampai {new Date(p.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text> : null}
            </Card>
            <Text style={{ color: colors.muted, fontSize: font.sm }}>Halaman ini otomatis berpindah setelah pembayaranmu terkonfirmasi oleh penyedia pembayaran. Jangan tutup aplikasi bila baru membayar.</Text>
            {err ? <Text style={{ color: colors.red600 }}>{err}</Text> : null}
            <Button title="Cek status pembayaran" variant="secondary" onPress={q.refetch} />
            <Button title="Batalkan pesanan" variant="danger" onPress={cancel} />
            <Row label="Metode" value={p?.provider === 'mock' ? 'QRIS (mode uji)' : 'QRIS'} />
          </>
        )}
      </Screen>
    </>
  );
}
