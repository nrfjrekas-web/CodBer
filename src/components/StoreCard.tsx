import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge, Card, Price, Thumb } from './ui';
import { colors, font } from '@/constants/theme';
import { mediaUrl } from '@/lib/supabase';
import { hhmm, isStoreOpen } from '@/utils/format';
import type { Product } from '@/types';
import type { StoreRow } from '@/services/catalog';

export function StoreCard({ m, km }: { m: StoreRow; km?: number }) {
  const open = isStoreOpen(m);
  return (
    <Card onPress={() => router.push(`/customer/store/${m.id}` as never)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', opacity: open ? 1 : 0.75 }}>
      <Thumb uri={mediaUrl(m.photo_url, 160)} size={72} icon="storefront-outline" />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: font.md, fontWeight: '800', color: colors.ink }} numberOfLines={1}>{m.name}</Text>
        <Text style={{ fontSize: font.sm, color: colors.muted }} numberOfLines={1}>
          {km != null ? `${km.toFixed(1)} km · ` : ''}{m.rating ? `★ ${m.rating.toFixed(1)} (${m.ratingCount}) · ` : ''}{hhmm(m.open_time)}–{hhmm(m.close_time)}
        </Text>
        <Badge label={open ? 'Buka' : 'Tutup'} tone={open ? 'green' : 'gray'} />
      </View>
    </Card>
  );
}

export function ProductRow({ p, onAdd, showStore }: { p: Product; onAdd?: () => void; showStore?: boolean }) {
  const out = !p.is_available || p.stock <= 0;
  return (
    <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Thumb uri={mediaUrl(p.photo_path, 160)} size={72} icon="fast-food-outline" />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: font.md, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{p.name}</Text>
        {showStore && p.merchants ? (
          <Pressable onPress={() => router.push(`/customer/store/${p.merchant_id}` as never)}>
            <Text style={{ fontSize: font.sm, color: colors.green700 }} numberOfLines={1}>{p.merchants.name}</Text>
          </Pressable>
        ) : p.description ? <Text style={{ fontSize: font.sm, color: colors.muted }} numberOfLines={2}>{p.description}</Text> : null}
        <Price value={p.price} />
        {out ? <Text style={{ fontSize: font.xs, color: colors.red600, fontWeight: '700' }}>Stok habis</Text>
          : p.stock <= 5 ? <Text style={{ fontSize: font.xs, color: colors.orange600, fontWeight: '700' }}>Sisa {p.stock}</Text> : null}
      </View>
      {onAdd ? (
        <Pressable onPress={onAdd} disabled={out} accessibilityLabel={`Tambah ${p.name}`} hitSlop={6}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: out ? colors.line : colors.green600, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      ) : null}
    </Card>
  );
}
