import { create } from 'zustand';
import { secureStorage } from '@/lib/storage';

export interface CartLine { productId: string; name: string; price: number; qty: number; stock: number; photo: string | null }
interface CartState {
  merchantId: string | null;
  merchantName: string | null;
  lines: CartLine[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** 'conflict' bila keranjang berisi toko lain: UI harus bertanya sebelum replace. */
  add: (m: { id: string; name: string }, line: Omit<CartLine, 'qty'>) => 'ok' | 'conflict';
  replaceWith: (m: { id: string; name: string }, line: Omit<CartLine, 'qty'>) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const KEY = 'codber.cart';
const save = (s: CartState) =>
  secureStorage.setItem(KEY, JSON.stringify({ merchantId: s.merchantId, merchantName: s.merchantName, lines: s.lines })).catch(() => {});

export const useCart = create<CartState>((set, get) => ({
  merchantId: null, merchantName: null, lines: [], hydrated: false,
  hydrate: async () => {
    try {
      const raw = await secureStorage.getItem(KEY);
      if (raw) set({ ...JSON.parse(raw), hydrated: true });
      else set({ hydrated: true });
    } catch { set({ hydrated: true }); }
  },
  add: (m, line) => {
    const s = get();
    if (s.merchantId && s.merchantId !== m.id && s.lines.length) return 'conflict';
    const exist = s.lines.find((l) => l.productId === line.productId);
    const lines = exist
      ? s.lines.map((l) => (l.productId === line.productId ? { ...l, qty: Math.min(l.qty + 1, l.stock) } : l))
      : [...s.lines, { ...line, qty: 1 }];
    set({ merchantId: m.id, merchantName: m.name, lines });
    save(get());
    return 'ok';
  },
  replaceWith: (m, line) => { set({ merchantId: m.id, merchantName: m.name, lines: [{ ...line, qty: 1 }] }); save(get()); },
  setQty: (id, qty) => {
    const lines = get().lines.map((l) => (l.productId === id ? { ...l, qty: Math.max(1, Math.min(qty, l.stock)) } : l));
    set({ lines }); save(get());
  },
  remove: (id) => {
    const lines = get().lines.filter((l) => l.productId !== id);
    set({ lines, merchantId: lines.length ? get().merchantId : null, merchantName: lines.length ? get().merchantName : null });
    save(get());
  },
  clear: () => { set({ lines: [], merchantId: null, merchantName: null }); save(get()); },
}));

export const cartCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (s: CartState) => s.lines.reduce((n, l) => n + l.qty * l.price, 0);
