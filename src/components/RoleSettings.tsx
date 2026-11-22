import React from 'react';
import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { Button, Card } from '@/components/ui';
import { colors, font } from '@/constants/theme';

/** Blok pengaturan umum untuk mode Driver, Merchant, dan Admin. */
export function RoleSettings() {
  const { profile, signOut } = useAuth();
  return (
    <>
      <Card>
        <Text style={{ fontSize: font.lg, fontWeight: '800', color: colors.ink }}>{profile?.full_name}</Text>
        <Text style={{ color: colors.muted }}>+{profile?.phone}</Text>
      </Card>
      <Button title="Notifikasi" icon="notifications-outline" variant="secondary" onPress={() => router.push('/notifications' as never)} />
      <Button title="Ganti mode" icon="swap-horizontal-outline" variant="secondary" onPress={() => router.push('/settings' as never)} />
      <Button title="Keluar" icon="log-out-outline" variant="danger" onPress={() => Alert.alert('Keluar dari CodBer?', undefined, [{ text: 'Batal', style: 'cancel' }, { text: 'Keluar', style: 'destructive', onPress: signOut }])} />
    </>
  );
}
