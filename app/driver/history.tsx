import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { OrderCard } from '@/components/OrderCard';
import { FINAL_STATUS } from '@/utils/format';
import { PAGE } from '@/services/catalog';
import type { Order } from '@/types';

export default function DriverHistory() {
  const [more, setMore] = useState<Order[]>([]);
  const [done, setDone] = useState(false);
  const fetchPage = async (from: number) => unwrap(await supabase.from('orders').select('*, merchants(name)').in('status', FINAL_STATUS).not('driver_id', 'is', null).order('created_at', { ascending: false }).range(from, from + PAGE - 1)) as Order[];
  const q = useQuery(() => fetchPage(0), []);
  const all = [...(q.data ?? []), ...more];
  return (
    <>
      <Header title="Riwayat pengantaran" />
      <Screen onRefresh={() => { setMore([]); setDone(false); q.refresh(); }} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !all.length ? <Empty icon="time-outline" title="Belum ada riwayat" text="Pengantaran yang selesai tampil di sini." /> : (
          <>
            {all.map((o) => <OrderCard key={o.id} order={o} href={`/driver/order/${o.id}`} />)}
            {!done && all.length >= PAGE ? <Button title="Muat lebih banyak" variant="secondary" onPress={async () => { const r = await fetchPage(all.length); setMore((m) => [...m, ...r]); if (r.length < PAGE) setDone(true); }} /> : null}
          </>
        )}
      </Screen>
    </>
  );
}
