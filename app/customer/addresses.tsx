import React from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Badge, Button, Card, Empty, ErrorBox, Header, Loading, Screen } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import type { Address } from '@/types';

export default function Addresses() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const q = useQuery(async () => unwrap(await supabase.from('customer_addresses').select('*').eq('user_id', uid).order('is_default', { ascending: false }).order('created_at', { ascending: false })) as Address[], [uid]);

  const setDefault = async (a: Address) => { await supabase.from('customer_addresses').update({ is_default: true }).eq('id', a.id); q.refetch(); };
  const del = (a: Address) => Alert.alert('Hapus alamat?', a.label, [
    { text: 'Batal', style: 'cancel' },
    { text: 'Hapus', style: 'destructive', onPress: async () => { await supabase.from('customer_addresses').delete().eq('id', a.id); q.refetch(); } },
  ]);

  return (
    <>
      <Header title="Alamat pengantaran" back />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing} footer={<Button title="Tambah alamat" icon="add" onPress={() => router.push('/customer/address-form' as never)} />}>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="location-outline" title="Belum ada alamat" text="Tambahkan alamat dan tandai titiknya di peta agar driver mudah menemukanmu." />
          : q.data.map((a) => (
            <Card key={a.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: font.md, fontWeight: '800', color: colors.ink }}>{a.label}</Text>
                {a.is_default ? <Badge label="Utama" tone="green" /> : null}
              </View>
              <Text style={{ color: colors.ink }}>{a.recipient_name} · {a.recipient_phone}</Text>
              <Text style={{ color: colors.muted }}>{a.address_text}</Text>
              {a.delivery_note ? <Text style={{ color: colors.muted }}>Patokan: {a.delivery_note}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Button title="Ubah" variant="secondary" small onPress={() => router.push({ pathname: '/customer/address-form', params: { id: a.id } } as never)} />
                {!a.is_default ? <Button title="Jadikan utama" variant="secondary" small onPress={() => setDefault(a)} /> : null}
                <Button title="Hapus" variant="danger" small onPress={() => del(a)} />
              </View>
            </Card>
          ))}
      </Screen>
    </>
  );
}
