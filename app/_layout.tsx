import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { registerPush } from '@/services/push';
import { homeFor, orderHref } from '@/utils/routes';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, session, profile, mode, init } = useAuth();
  const hydrate = useCart((s) => s.hydrate);
  const segments = useSegments();

  useEffect(() => { init(); hydrate(); }, [init, hydrate]);
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);

  // Penjaga navigasi: belum login -> OTP; belum punya nama -> lengkapi profil; selesai -> beranda sesuai mode.
  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!session) { if (!inAuth) router.replace('/(auth)/phone'); return; }
    if (!profile) return;
    if (!profile.full_name.trim()) { if (segments[1] !== 'profile-setup') router.replace('/(auth)/profile-setup'); return; }
    if (inAuth) router.replace(homeFor(mode) as never);
  }, [ready, session, profile, segments, mode]);

  useEffect(() => { if (session?.user.id) registerPush(session.user.id); }, [session?.user.id]);

  // Ketuk notifikasi -> buka pesanan. Isi notifikasi bukan sumber kebenaran; layar tujuan memuat ulang dari database.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = (r.notification.request.content.data as { order_id?: string })?.order_id;
      if (id) router.push(orderHref(useAuth.getState().mode, id) as never);
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} />
    </>
  );
}
