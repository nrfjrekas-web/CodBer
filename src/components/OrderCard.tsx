import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, StatusBadge, Price } from './ui';
import { colors, font } from '@/constants/theme';
import { dateTime } from '@/utils/format';
import type { Order } from '@/types';

/** Kartu ringkas pesanan, dipakai semua role. `href` menentukan layar detail menurut role. */
export function OrderCard({ order, href, title }: { order: Order; href: string; title?: string }) {
  const items = order.order_items?.reduce((n, i) => n + i.quantity, 0);
  return (
    <Card onPress={() => router.push(href as never)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: font.md, fontWeight: '800', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{title ?? order.merchants?.name ?? order.order_number}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={{ fontSize: font.sm, color: colors.muted }}>
        {order.order_number} · {dateTime(order.created_at)}{items ? ` · ${items} item` : ''}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: font.sm, color: colors.muted }}>{order.payment_method === 'cod' ? 'Bayar di tempat (COD)' : 'QRIS'}</Text>
        <Price value={order.grand_total} />
      </View>
    </Card>
  );
}
