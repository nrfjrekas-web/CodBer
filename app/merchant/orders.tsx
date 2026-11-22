import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Chip, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { OrderCard } from '@/components/OrderCard';
import { space } from '@/constants/theme';
import { FINAL_STATUS } from '@/utils/format';
import type { Order } from '@/types';

export default function MerchantOrders() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const q = useQuery(async () => {
    const m = unwrap(await supabase.from('merchants').select('id').eq('owner_user_id', uid).maybeSingle()) as { id: string } | null;
    if (!m) return [];
    const base = supabase.from('orders').select('*, order_items(quantity)').eq('merchant_id', m.id).order('created_at', { ascending: false }).limit(50);
    return unwrap(await (tab === 'active' ? base.not('status', 'in', `(${FINAL_STATUS.join(',')})`) : base.in('status', FINAL_STATUS))) as Order[];
  }, [uid, tab]);
  useRealtime('mer-orders', 'orders', undefined, useCallback(() => q.refetch(), [q.refetch]));
  return (
    <>
      <Header title="Pesanan" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="Aktif" active={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label="Riwayat" active={tab === 'history'} onPress={() => setTab('history')} />
        </View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="receipt-outline" title="Tidak ada pesanan" />
          : q.data.map((o) => <OrderCard key={o.id} order={o} href={`/merchant/order/${o.id}`} title={`Pesanan ${o.order_number}`} />)}
      </Screen>
    </>
  );
}
