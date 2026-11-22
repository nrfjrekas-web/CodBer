import React from 'react';
import { RoleTabs } from '@/components/RoleTabs';
import { useQuery } from '@/hooks/useQuery';
import { useShareLocation } from '@/hooks/useShareLocation';
import { useAuth } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

export default function DriverLayout() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const d = useQuery(async () => (await supabase.from('drivers').select('id').eq('user_id', uid).maybeSingle()).data?.id ?? null, [uid]);
  useShareLocation(d.data ?? null);
  return (
    <RoleTabs role="driver" hidden={['order/[id]']} tabs={[
      { name: 'index', title: 'Tugas', icon: 'bicycle-outline', iconOn: 'bicycle' },
      { name: 'history', title: 'Riwayat', icon: 'time-outline', iconOn: 'time' },
      { name: 'earnings', title: 'Pendapatan', icon: 'wallet-outline', iconOn: 'wallet' },
      { name: 'settings', title: 'Pengaturan', icon: 'settings-outline', iconOn: 'settings' },
    ]} />
  );
}
