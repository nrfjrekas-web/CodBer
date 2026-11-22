import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

/** Pilih foto dari galeri. Kualitas diturunkan sejak awal agar unggahan kecil. */
export async function pickImage(aspect: [number, number] = [4, 3]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Izin galeri diperlukan untuk memilih foto.');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.5 });
  return res.canceled ? null : res.assets[0].uri;
}

/** Unggah ke bucket; path selalu diawali id pengguna agar lolos kebijakan storage. */
export async function uploadImage(bucket: 'public-media' | 'private-docs', uri: string, folder: string, uid: string): Promise<string> {
  const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
  const path = `${uid}/${folder}-${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Tautan sementara (60 detik) untuk dokumen privat. Hanya admin yang lolos kebijakan. */
export async function signedDocUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('private-docs').createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}
