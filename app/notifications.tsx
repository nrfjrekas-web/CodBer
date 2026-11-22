import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { useRealtime } from '@/hooks/useRealtime';
import { Button, Card, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { dateTime } from '@/utils/format';
import { orderHref } from '@/utils/routes';
import type { AppNotification } from '@/types';

export default function Notifications() {
  const { session, mode } = useAuth();
  const uid = (session?.user.id ?? '');
  const q = useQuery(async () => unwrap(await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)) as AppNotification[], [uid]);
  useRealtime(`notif-${uid}`, 'notifications', `user_id=eq.${uid}`, useCallback(() => q.refetch(), [q.refetch]));

  const open = async (n: AppNotification) => {
    if (!n.read_at) { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id); q.refetch(); }
    if (n.data?.order_id) router.push(orderHref(mode, n.data.order_id) as never);
  };
  const readAll = async () => { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null); q.refetch(); };

  return (
    <>
      <Header title="Notifikasi" back right={q.data?.some((n) => !n.read_at) ? <Button title="Tandai dibaca" variant="ghost" small onPress={readAll} /> : undefined} />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="notifications-outline" title="Belum ada notifikasi" text="Kabar pesanan dan pengajuanmu muncul di sini." />
          : q.data.map((n) => (
            <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button">
              <Card style={!n.read_at ? { borderColor: colors.green600, backgroundColor: colors.green50 } : undefined}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '800', color: colors.ink, flex: 1 }}>{n.title}</Text>
                  {!n.read_at ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange500, marginTop: 5 }} /> : null}
                </View>
                <Text style={{ color: colors.ink }}>{n.body}</Text>
                <Text style={{ color: colors.muted, fontSize: font.xs }}>{dateTime(n.created_at)}</Text>
              </Card>
            </Pressable>
          ))}
      </Screen>
    </>
  );
}
