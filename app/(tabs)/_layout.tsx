import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/stores/auth';
import { homeFor } from '@/utils/routes';

type N = React.ComponentProps<typeof Ionicons>['name'];
const tab = (title: string, icon: N, iconOn: N) => ({
  title,
  tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => <Ionicons name={focused ? iconOn : icon} size={size} color={color} />,
});

export default function CustomerTabs() {
  const mode = useAuth((s) => s.mode);
  if (mode !== 'customer') return <Redirect href={homeFor(mode) as never} />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green600, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.line } }}>
      <Tabs.Screen name="index" options={tab('Beranda', 'home-outline', 'home')} />
      <Tabs.Screen name="search" options={tab('Cari', 'search-outline', 'search')} />
      <Tabs.Screen name="orders" options={tab('Pesanan', 'receipt-outline', 'receipt')} />
      <Tabs.Screen name="profile" options={tab('Profil', 'person-outline', 'person')} />
    </Tabs>
  );
}
