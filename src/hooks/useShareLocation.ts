import { useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useQuery } from './useQuery';
import { useRealtime } from './useRealtime';
import { useTracking } from '@/stores/tracking';

/**
 * Bagikan lokasi driver HANYA selama ada pesanan aktif (menuju toko, diambil, mengantar) dan aplikasi terbuka.
 * Berhenti otomatis saat pesanan selesai/batal. Tidak ada pelacakan ketika offline atau tanpa tugas.
 */
export function useShareLocation(driverId: string | null) {
  const { version, set } = useTracking();
  const q = useQuery(async () => {
    if (!driverId) return null;
    const { data } = await supabase.from('orders').select('id').eq('driver_id', driverId).in('status', ['driver_to_merchant', 'picked_up', 'delivering']).limit(1);
    return data?.[0]?.id ?? null;
  }, [driverId]);
  useRealtime('drv-active-order', 'orders', undefined, useCallback(() => { q.refetch(); }, [q.refetch]));
  const orderId = q.data ?? null;

  useEffect(() => {
    set({ orderId });
    if (!orderId) { set({ sharing: false, needsPermission: false }); return; }
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    let last = 0;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) { set({ needsPermission: true, sharing: false }); return; }
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 }, (p) => {
        if (Date.now() - last < 8000) return;
        last = Date.now();
        supabase.rpc('report_location', { p_order: orderId, p_lat: p.coords.latitude, p_lng: p.coords.longitude }).then(() => {});
      });
      if (cancelled) sub.remove(); else set({ sharing: true, needsPermission: false });
    })();
    return () => { cancelled = true; sub?.remove(); set({ sharing: false }); };
  }, [orderId, version, set]);
}

export async function askLocationPermission() {
  const r = await Location.requestForegroundPermissionsAsync();
  useTracking.getState().retry();
  return r.granted;
}
