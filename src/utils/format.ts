import type { OrderStatus } from '@/types';

export const rupiah = (n: number | null | undefined) =>
  'Rp' + Math.round(Number(n ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export function dateTime(iso: string) {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}.${p(d.getMinutes())}`;
}
export const isoDate = (d = new Date()) => {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Normalisasi nomor HP Indonesia ke format E.164 tanpa plus: 08xx -> 628xx. */
export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('62')) return d;
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (d.startsWith('8')) return '62' + d;
  return d;
}
export const validPhone = (raw: string) => /^628\d{8,12}$/.test(normalizePhone(raw));

/** Toko dianggap buka bila diset buka dan masih dalam jam operasional (WIB perangkat). */
export function isStoreOpen(m: { is_open: boolean; open_time: string; close_time: string }, now = new Date()) {
  if (!m.is_open) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = m.open_time.split(':').map(Number);
  const [ch, cm] = m.close_time.split(':').map(Number);
  const o = oh * 60 + om, c = ch * 60 + cm;
  return o <= c ? cur >= o && cur < c : cur >= o || cur < c;
}
export const hhmm = (t: string) => t.slice(0, 5).replace(':', '.');

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Menunggu Pembayaran', pending_merchant: 'Menunggu Toko', accepted: 'Toko Menerima',
  preparing: 'Toko Memproses', ready_for_pickup: 'Siap Diambil', assigned_to_driver: 'Driver Ditugaskan',
  driver_to_merchant: 'Driver Menuju Toko', picked_up: 'Driver Sudah Mengambil', delivering: 'Driver Mengantar',
  completed: 'Selesai', rejected: 'Ditolak Toko', cancelled: 'Dibatalkan', failed: 'Gagal Diproses',
};
export const FINAL_STATUS: OrderStatus[] = ['completed', 'rejected', 'cancelled', 'failed'];
export const isFinal = (s: OrderStatus) => FINAL_STATUS.includes(s);
export const TRACK_STEPS: OrderStatus[] = ['pending_merchant', 'preparing', 'ready_for_pickup', 'driver_to_merchant', 'delivering', 'completed'];
/** Posisi status pada lini waktu pelanggan (6 langkah di PRD 5.6). */
export function stepIndex(s: OrderStatus) {
  const map: Partial<Record<OrderStatus, number>> = {
    pending_merchant: 0, accepted: 1, preparing: 1, ready_for_pickup: 2, assigned_to_driver: 2,
    driver_to_merchant: 3, picked_up: 4, delivering: 4, completed: 5,
  };
  return map[s] ?? -1;
}

const ERRORS: Record<string, string> = {
  out_of_area: 'Alamat di luar area pengantaran CodBer.', merchant_closed: 'Toko sedang tutup.',
  merchant_not_found: 'Toko tidak ditemukan atau belum aktif.', product_unavailable: 'Ada produk yang sudah tidak tersedia.',
  insufficient_stock: 'Stok salah satu produk tidak cukup.', cannot_order_own_store: 'Kamu tidak bisa memesan dari tokomu sendiri.',
  cancel_requires_admin: 'Pesanan sudah diproses toko. Hubungi admin untuk membatalkan.', reason_required: 'Alasan wajib diisi.',
  driver_not_available: 'Driver tidak tersedia.', order_not_assignable: 'Pesanan belum bisa ditugaskan.',
  invalid_transition: 'Status pesanan sudah berubah. Muat ulang.', forbidden: 'Kamu tidak punya akses untuk aksi ini.',
  qris_disabled: 'Pembayaran QRIS belum tersedia. Pilih COD.', account_inactive: 'Akun dinonaktifkan. Hubungi admin.', address_not_found: 'Pilih alamat pengantaran dulu.',
};
export function friendlyError(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const hit = Object.keys(ERRORS).find((k) => msg.includes(k));
  if (hit) return ERRORS[hit];
  if (/network|fetch|timeout/i.test(msg)) return 'Koneksi bermasalah. Coba lagi.';
  return 'Terjadi kendala. Coba lagi sebentar.';
}
