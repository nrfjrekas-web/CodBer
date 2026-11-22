import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from '@/utils/format';

/** Pengambil data sederhana: loading awal, refresh, dan pesan galat ramah. Tanpa dependency tambahan. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await fn();
      if (alive.current) setData(d);
    } catch (e) {
      if (alive.current) setError(friendlyError(e));
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  const refresh = useCallback(() => { setRefreshing(true); return run(true); }, [run]);
  return { data, loading, refreshing, error, refetch: () => run(), refresh, setData };
}

/** Ambil hasil supabase-js dan lempar galatnya. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
