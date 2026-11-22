import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };
export const JEMBER: Coords = { latitude: -8.1724, longitude: 113.7005 };

/** Izin lokasi diminta hanya saat fitur dipakai. Mengembalikan null bila ditolak. */
export async function currentPosition(): Promise<Coords | null> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return null;
  const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: p.coords.latitude, longitude: p.coords.longitude };
}
