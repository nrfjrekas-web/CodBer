import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Button, Chip, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { OrderCard } from '@/components/OrderCard';
import { FINAL_STATUS, STATUS_LABEL } from '@/utils/format';
import { PAGE } from '@/services/catalog';
import type { Order, OrderStatus } from '@/types';

const FILTERS: { k: string; l: string; s: OrderStatus[] | null }[] = [
  { k: 'queue', l: 'Perlu driver', s: ['ready_for_pickup'] },
  { k: 'active', l: 'Aktif', s: ['pending_payment', 'pending_merchant', 'accepted', 'preparing', 'assigned_to_driver', 'driver_to_merchant', 'picked_up', 'delivering'] },
  { k: 'done', l: 'Selesai', s: ['completed'] },
  { k: 'bad', l: 'Gagal/batal', s: ['rejected', 'cancelled', 'failed'] },
  { k: 'all', l: 'Semua', s: null },
];

export default function AdminOrders() {
  const [f, setF] = useState('queue');
  const [more, setMore] = useState<Order[]>([]);
  const [done, setDone] = useState(false);
  const statuses = FILTERS.find((x) => x.k === f)!.s;
  const page = async (from: number) => {
    let qb = supabase.from('orders').select('*, merchants(name), order_items(quantity)').order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    if (statuses) qb = qb.in('status', statuses);
    return unwrap(await qb) as Order[];
  };
  const q = useQuery(() => { setMore([]); setDone(false); return page(0); }, [f]);
  useRealtime('adm-orders', 'orders', undefined, useCallback(() => q.refetch(), [q.refetch]));
  const all = [...(q.data ?? []), ...more];
  void FINAL_STATUS; void STATUS_LABEL;
  return (
    <>
      <Header title="Pesanan" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((x) => <Chip key={x.k} label={x.l} active={f === x.k} onPress={() => setF(x.k)} />)}
        </ScrollView>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !all.length ? <Empty icon="receipt-outline" title="Tidak ada pesanan" />
          : all.map((o) => <OrderCard key={o.id} order={o} href={`/admin/order/${o.id}`} title={`${o.order_number} · ${o.merchants?.name ?? ''}`} />)}
        {!done && all.length >= PAGE ? <Button title="Muat lebih banyak" variant="secondary" onPress={async () => { const r = await page(all.length); setMore((m) => [...m, ...r]); if (r.length < PAGE) setDone(true); }} /> : null}
      </Screen>
    </>
  );
}
