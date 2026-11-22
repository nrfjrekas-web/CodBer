import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, mediaUrl } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Chip, Field, Header, Screen } from '@/components/ui';
import { ImagePick } from '@/components/ImagePick';
import { uploadImage } from '@/services/media';
import { colors, font } from '@/constants/theme';
import { friendlyError } from '@/utils/format';
import type { Category, Product } from '@/types';

export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const [f, setF] = useState({ name: '', description: '', price: '', stock: '' });
  const [cat, setCat] = useState<string | null>(null);
  const [avail, setAvail] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [oldPath, setOldPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cats = useQuery(async () => unwrap(await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')) as Category[], []);

  useEffect(() => {
    if (!id) return;
    supabase.from('products').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      const p = data as Product | null;
      if (!p) return;
      setF({ name: p.name, description: p.description ?? '', price: String(p.price), stock: String(p.stock) });
      setCat(p.category_id); setAvail(p.is_available); setOldPath(p.photo_path); setPhoto(mediaUrl(p.photo_path, 400) ?? null);
    });
  }, [id]);

  const save = async () => {
    const price = Number(f.price.replace(/\D/g, '')); const stock = Number(f.stock.replace(/\D/g, ''));
    if (!f.name.trim() || !price) return setErr('Nama dan harga wajib diisi.');
    setBusy(true); setErr(null);
    try {
      const m = unwrap(await supabase.from('merchants').select('id').eq('owner_user_id', uid).maybeSingle()) as { id: string } | null;
      if (!m) throw new Error('forbidden');
      const isNew = photo && !photo.startsWith('http');
      const path = isNew ? await uploadImage('public-media', photo!, 'produk', uid) : oldPath;
      const row = { merchant_id: m.id, category_id: cat, name: f.name.trim(), description: f.description.trim() || null, price, stock, is_available: avail, photo_path: path };
      const { error } = id ? await supabase.from('products').update(row).eq('id', id) : await supabase.from('products').insert(row);
      if (error) throw error;
      router.back();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };

  const archive = () => Alert.alert('Arsipkan produk?', 'Produk tidak tampil lagi, riwayat pesanan tetap aman.', [
    { text: 'Batal', style: 'cancel' },
    { text: 'Arsipkan', style: 'destructive', onPress: async () => { await supabase.from('products').update({ is_archived: true, is_available: false }).eq('id', id!); router.back(); } },
  ]);

  return (
    <>
      <Header title={id ? 'Ubah produk' : 'Tambah produk'} back />
      <Screen footer={<Button title="Simpan produk" onPress={save} loading={busy} />}>
        <ImagePick label="Foto produk" uri={photo} onPick={setPhoto} aspect={[1, 1]} height={160} />
        <Field label="Nama produk" value={f.name} onChangeText={(v) => setF((s) => ({ ...s, name: v }))} />
        <Field label="Deskripsi (opsional)" value={f.description} onChangeText={(v) => setF((s) => ({ ...s, description: v }))} multiline />
        <Field label="Harga (Rp)" value={f.price} onChangeText={(v) => setF((s) => ({ ...s, price: v }))} keyboardType="number-pad" />
        <Field label="Stok" value={f.stock} onChangeText={(v) => setF((s) => ({ ...s, stock: v }))} keyboardType="number-pad" />
        <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.ink }}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {cats.data?.map((c) => <Chip key={c.id} label={c.name} active={cat === c.id} onPress={() => setCat(c.id)} />)}
        </ScrollView>
        <Chip label={avail ? 'Tersedia' : 'Tidak tersedia'} icon={avail ? 'checkmark-circle' : 'close-circle'} active={avail} onPress={() => setAvail(!avail)} />
        {err ? <Text style={{ color: colors.red600 }}>{err}</Text> : null}
        {id ? <Button title="Arsipkan produk" variant="danger" onPress={archive} /> : null}
      </Screen>
    </>
  );
}
