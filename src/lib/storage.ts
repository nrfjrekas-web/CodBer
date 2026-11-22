import * as SecureStore from 'expo-secure-store';

// SecureStore membatasi ±2 KB per nilai, sedangkan sesi Supabase bisa lebih besar.
// Adapter ini memecah nilai menjadi potongan; sesi tetap dikelola penuh oleh Supabase SDK.
const CHUNK = 1800;
const countKey = (k: string) => `${k}.n`;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = Number(await SecureStore.getItemAsync(countKey(key)));
    if (!n) return SecureStore.getItemAsync(key);
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const p = await SecureStore.getItemAsync(`${key}.${i}`);
      if (p == null) return null;
      parts.push(p);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    if (value.length <= CHUNK) return SecureStore.setItemAsync(key, value);
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(countKey(key), String(n));
  },
  async removeItem(key: string): Promise<void> {
    const n = Number(await SecureStore.getItemAsync(countKey(key)));
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(countKey(key));
    await SecureStore.deleteItemAsync(key);
  },
};
