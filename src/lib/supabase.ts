import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!; // kunci anon boleh publik; service_role dilarang di sini

export const supabase = createClient(url, anonKey, {
  auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh token hanya saat aplikasi aktif (hemat baterai & data).
AppState.addEventListener('change', (s) => {
  if (s === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

const IMAGE_TRANSFORM = process.env.EXPO_PUBLIC_IMAGE_TRANSFORM === '1';

/** URL foto publik. Dengan transformasi aktif, minta ukuran thumbnail sesuai kebutuhan. */
export function mediaUrl(path?: string | null, width = 400): string | undefined {
  if (!path) return undefined;
  const { data } = supabase.storage.from('public-media').getPublicUrl(
    path, IMAGE_TRANSFORM ? { transform: { width, quality: 70 } } : undefined);
  return data.publicUrl;
}
