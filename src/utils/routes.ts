import type { Role } from '@/types';

/** Layar detail pesanan menurut mode aktif. */
export function orderHref(mode: Role, id: string) {
  if (mode === 'driver') return `/driver/order/${id}`;
  if (mode === 'merchant') return `/merchant/order/${id}`;
  if (mode === 'admin') return `/admin/order/${id}`;
  return `/customer/tracking/${id}`;
}
export const homeFor = (mode: Role) =>
  mode === 'driver' ? '/driver' : mode === 'merchant' ? '/merchant' : mode === 'admin' ? '/admin' : '/(tabs)';
