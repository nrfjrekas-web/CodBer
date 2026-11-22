import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/** Dengarkan perubahan tabel (RLS tetap berlaku). Pembaruan hanya memicu muat ulang dari database. */
export function useRealtime(name: string, table: string, filter: string | undefined, onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const ch = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => cb.current())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [name, table, filter]);
}
