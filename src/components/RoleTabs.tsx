import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/stores/auth';
import { homeFor } from '@/utils/routes';
import type { Role } from '@/types';

type N = React.ComponentProps<typeof Ionicons>['name'];
export interface TabDef { name: string; title: string; icon: N; iconOn: N }

/** Tab bawah per role. Penjaga di sini hanya soal tampilan; izin sebenarnya ditegakkan RLS dan RPC di server. */
export function RoleTabs({ role, tabs, hidden = [], children }: { role: Role; tabs: TabDef[]; hidden?: string[]; children?: React.ReactNode }) {
  const { mode, roles } = useAuth();
  if (!roles.includes(role)) return <Redirect href="/" />;
  if (mode !== role) return <Redirect href={homeFor(mode) as never} />;
  return (
    <>
      {children}
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green600, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.line } }}>
        {tabs.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.iconOn : t.icon} size={size} color={color} /> }} />
        ))}
        {hidden.map((h) => <Tabs.Screen key={h} name={h} options={{ href: null }} />)}
      </Tabs>
    </>
  );
}
