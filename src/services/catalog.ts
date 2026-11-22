import { supabase } from '@/lib/supabase';
import { unwrap } from '@/hooks/useQuery';
import type { Address, Merchant, Product } from '@/types';

export const PAGE = 20;
const clean = (q: string) => q.replace(/[%,_()]/g, ' ').trim();

export type StoreRow = Merchant & { rating?: number; ratingCount?: number };

export async function fetchStores(opts: { q?: string; categoryId?: string | null; from?: number; limit?: number }): Promise<StoreRow[]> {
  let qb = supabase.from('merchants').select('*').eq('is_approved', true).order('is_open', { ascending: false }).order('name');
  if (opts.categoryId) qb = qb.eq('category_id', opts.categoryId);
  if (opts.q && clean(opts.q)) qb = qb.ilike('name', `%${clean(opts.q)}%`);
  const from = opts.from ?? 0;
  const rows = unwrap(await qb.range(from, from + (opts.limit ?? PAGE) - 1)) as Merchant[];
  if (!rows.length) return [];
  const stats = unwrap(await supabase.from('rating_stats').select('merchant_id, avg_rating, total').in('merchant_id', rows.map((r) => r.id))) as
    { merchant_id: string; avg_rating: number; total: number }[];
  return rows.map((r) => {
    const st = stats.find((x) => x.merchant_id === r.id);
    return { ...r, rating: st ? Number(st.avg_rating) : undefined, ratingCount: st?.total };
  });
}

export async function fetchProducts(opts: { q?: string; categoryId?: string | null; merchantId?: string; from?: number; limit?: number }): Promise<Product[]> {
  let qb = supabase.from('products').select('*, merchants!inner(name, is_approved)').eq('is_archived', false).eq('merchants.is_approved', true)
    .order('is_available', { ascending: false }).order('created_at', { ascending: false });
  if (opts.merchantId) qb = qb.eq('merchant_id', opts.merchantId);
  if (opts.categoryId) qb = qb.eq('category_id', opts.categoryId);
  if (opts.q && clean(opts.q)) qb = qb.ilike('name', `%${clean(opts.q)}%`);
  const from = opts.from ?? 0;
  return unwrap(await qb.range(from, from + (opts.limit ?? PAGE) - 1)) as Product[];
}

export async function fetchDefaultAddress(uid: string): Promise<Address | null> {
  const rows = unwrap(await supabase.from('customer_addresses').select('*').eq('user_id', uid)
    .order('is_default', { ascending: false }).order('created_at', { ascending: false }).limit(1)) as Address[];
  return rows[0] ?? null;
}
