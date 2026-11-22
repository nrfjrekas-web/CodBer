import React from 'react';
import { Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Card, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { dateTime } from '@/utils/format';

type Log = { id: string; action: string; target_type: string; details: Record<string, unknown>; created_at: string };
export default function Audit() {
  const q = useQuery(async () => unwrap(await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100)) as Log[], []);
  return (
    <>
      <Header title="Audit log" back />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="shield-checkmark-outline" title="Belum ada catatan" />
          : q.data.map((l) => (
            <Card key={l.id}>
              <Text style={{ fontWeight: '800', color: colors.ink }}>{l.action} · {l.target_type}</Text>
              <Text style={{ color: colors.muted, fontSize: font.sm }}>{dateTime(l.created_at)}</Text>
              <Text style={{ color: colors.muted, fontSize: font.xs }} numberOfLines={3}>{JSON.stringify(l.details)}</Text>
            </Card>
          ))}
      </Screen>
    </>
  );
}
