import React from 'react';
import { Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, mediaUrl } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Card, Empty, ErrorBox, Header, Loading, Price, Screen, Thumb } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import type { Product } from '@/types';

export default function MerchantProducts() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const q = useQuery(async () => {
    const m = unwrap(await supabase.from('merchants').select('id').eq('owner_user_id', uid).maybeSingle()) as { id: string } | null;
    if (!m) return [];
    return unwrap(await supabase.from('products').select('*').eq('merchant_id', m.id).eq('is_archived', false).order('created_at', { ascending: false })) as Product[];
  }, [uid]);
  const toggle = async (p: Product, v: boolean) => { await supabase.from('products').update({ is_available: v }).eq('id', p.id); q.refetch(); };
  return (
    <>
      <Header title="Produk" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing} footer={<Button title="Tambah produk" icon="add" onPress={() => router.push('/merchant/product-form' as never)} />}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="cube-outline" title="Belum ada produk" text="Tambahkan menu atau barang jualanmu." />
          : q.data.map((p) => (
            <Card key={p.id} onPress={() => router.push({ pathname: '/merchant/product-form', params: { id: p.id } } as never)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Thumb uri={mediaUrl(p.photo_path, 120)} size={60} icon="fast-food-outline" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={1}>{p.name}</Text>
                <Price value={p.price} />
                <Text style={{ fontSize: font.sm, color: p.stock <= 0 ? colors.red600 : colors.muted }}>Stok {p.stock}</Text>
              </View>
              <Switch value={p.is_available} onValueChange={(v) => toggle(p, v)} trackColor={{ true: colors.green600 }} accessibilityLabel={`Tersedia: ${p.name}`} />
            </Card>
          ))}
      </Screen>
    </>
  );
}
