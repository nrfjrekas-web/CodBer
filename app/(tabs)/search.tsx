import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Chip, Empty, ErrorBox, Loading, Screen } from '@/components/ui';
import { ProductRow, StoreCard } from '@/components/StoreCard';
import { colors, font, radius, space } from '@/constants/theme';
import { fetchProducts, fetchStores, PAGE } from '@/services/catalog';
import type { Category, Product } from '@/types';
import type { StoreRow } from '@/services/catalog';

export default function Search() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(params.category ?? null);
  const [tab, setTab] = useState<'stores' | 'products'>('stores');
  const [more, setMore] = useState<(StoreRow | Product)[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => { if (params.category) setCat(params.category); }, [params.category]);
  useEffect(() => { const t = setTimeout(() => setQ(text), 350); return () => clearTimeout(t); }, [text]);
  useEffect(() => { setMore([]); setDone(false); }, [q, cat, tab]);

  const cats = useQuery(async () => unwrap(await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')) as Category[], []);
  const res = useQuery(async () => (tab === 'stores' ? fetchStores({ q, categoryId: cat }) : fetchProducts({ q, categoryId: cat })), [q, cat, tab]);

  const loadMore = async () => {
    const from = (res.data?.length ?? 0) + more.length;
    const rows = tab === 'stores' ? await fetchStores({ q, categoryId: cat, from }) : await fetchProducts({ q, categoryId: cat, from });
    setMore((m) => [...m, ...rows]);
    if (rows.length < PAGE) setDone(true);
  };
  const all = [...(res.data ?? []), ...more] as (StoreRow & Product)[];

  return (
    <Screen inset onRefresh={res.refresh} refreshing={res.refreshing}>
      <View style={{ minHeight: 48, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.md }}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput value={text} onChangeText={setText} placeholder="Cari toko atau produk" placeholderTextColor="#8A9A8D" style={{ flex: 1, fontSize: font.md, color: colors.ink, minHeight: 46 }} returnKeyType="search" accessibilityLabel="Kolom pencarian" />
        {text ? <Ionicons name="close-circle" size={20} color={colors.muted} onPress={() => setText('')} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip label="Toko" icon="storefront-outline" active={tab === 'stores'} onPress={() => setTab('stores')} />
        <Chip label="Produk" icon="fast-food-outline" active={tab === 'products'} onPress={() => setTab('products')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="Semua" active={!cat} onPress={() => setCat(null)} />
        {cats.data?.map((c) => <Chip key={c.id} label={c.name} active={cat === c.id} onPress={() => setCat(cat === c.id ? null : c.id)} />)}
      </ScrollView>

      {res.loading ? <Loading /> : res.error ? <ErrorBox message={res.error} onRetry={res.refetch} />
        : !all.length ? <Empty icon="search-outline" title="Tidak ketemu" text="Coba kata kunci lain atau ganti kategori." />
        : (
          <>
            {tab === 'stores' ? all.map((m) => <StoreCard key={m.id} m={m} />) : all.map((p) => <ProductRow key={p.id} p={p} showStore />)}
            {!done && all.length >= PAGE ? <Button title="Muat lebih banyak" variant="secondary" onPress={loadMore} /> : null}
          </>
        )}
    </Screen>
  );
}
