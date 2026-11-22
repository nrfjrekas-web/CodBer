import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { Card, Header, Screen, Divider } from '@/components/ui';
import { colors, font } from '@/constants/theme';

function Item({ icon, label, onPress, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ionicons name={icon} size={22} color={danger ? colors.red600 : colors.green700} />
      <Text style={{ flex: 1, fontSize: font.md, color: danger ? colors.red600 : colors.ink, fontWeight: '600' }}>{label}</Text>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

export default function Profile() {
  const { profile, roles, signOut } = useAuth();
  return (
    <>
      <Header title="Profil" />
      <Screen>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: font.xl, fontWeight: '800', color: colors.green700 }}>{profile?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: font.lg, fontWeight: '800', color: colors.ink }}>{profile?.full_name}</Text>
            <Text style={{ color: colors.muted }}>+{profile?.phone}</Text>
          </View>
        </Card>
        <Card>
          <Item icon="location-outline" label="Alamat pengantaran" onPress={() => router.push('/customer/addresses' as never)} />
          <Divider />
          <Item icon="notifications-outline" label="Notifikasi" onPress={() => router.push('/notifications' as never)} />
          <Divider />
          <Item icon="swap-horizontal-outline" label={roles.length > 1 ? 'Ganti mode & pengajuan role' : 'Jadi driver atau mitra toko'} onPress={() => router.push('/settings' as never)} />
        </Card>
        <Card>
          <Item icon="log-out-outline" label="Keluar" danger onPress={() => Alert.alert('Keluar dari CodBer?', undefined, [{ text: 'Batal', style: 'cancel' }, { text: 'Keluar', style: 'destructive', onPress: signOut }])} />
        </Card>
      </Screen>
    </>
  );
}
