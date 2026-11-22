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

export default function Orders() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const q = useQuery(async () => {
    const base = supabase.from('orders').select('*, merchants(name), order_items(quantity)').eq('customer_id', uid).order('created_at', { ascending: false }).limit(50);
    const list = tab === 'active' ? base.not('status', 'in', `(${FINAL_STATUS.join(',')})`) : base.in('status', FINAL_STATUS);
    return unwrap(await list) as Order[];
  }, [uid, tab]);
  useRealtime(`orders-${uid}`, 'orders', `customer_id=eq.${uid}`, useCallback(() => q.refetch(), [q.refetch]));

  return (
    <>
      <Header title="Pesanan" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="Aktif" active={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label="Riwayat" active={tab === 'history'} onPress={() => setTab('history')} />
        </View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} />
          : !q.data?.length ? <Empty icon="receipt-outline" title={tab === 'active' ? 'Tidak ada pesanan aktif' : 'Belum ada riwayat'} text="Pesanan yang kamu buat akan muncul di sini." />
          : q.data.map((o) => <OrderCard key={o.id} order={o} href={`/customer/tracking/${o.id}`} />)}
      </Screen>
    </>
  );
}
