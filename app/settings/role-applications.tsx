import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Chip, Field, Header, Screen } from '@/components/ui';
import { ImagePick } from '@/components/ImagePick';
import { MapPicker } from '@/components/MapPicker';
import { uploadImage } from '@/services/media';
import { colors, font } from '@/constants/theme';
import { friendlyError, normalizePhone, validPhone } from '@/utils/format';
import type { Coords } from '@/services/location';
import type { Category } from '@/types';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function RoleApplication() {
  const { type } = useLocalSearchParams<{ type: 'driver' | 'merchant' }>();
  const { session, profile, load } = useAuth();
  const uid = (session?.user.id ?? '');
  const [f, setF] = useState<Record<string, string>>({ name: profile?.full_name ?? '', phone: profile?.phone ? '0' + profile.phone.replace(/^62/, '') : '', vehicle_type: 'Motor', open: '08:00', close: '21:00' });
  const [img, setImg] = useState<Record<string, string>>({});
  const [pin, setPin] = useState<Coords | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const cats = useQuery(async () => unwrap(await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')) as Category[], []);

  const submit = async () => {
    setErr(null);
    if (!f.name?.trim() || !validPhone(f.phone ?? '') || !f.address?.trim()) return setErr('Lengkapi nama, nomor HP yang benar, dan alamat.');
    setBusy(true);
    try {
      if (type === 'driver') {
        if (!img.ktp || !img.sim || !img.vehicle || !f.plate?.trim()) throw new Error('Foto KTP, SIM, foto kendaraan, dan nomor polisi wajib diisi.');
        const [ktp, sim, veh] = await Promise.all([uploadImage('private-docs', img.ktp, 'ktp', uid), uploadImage('private-docs', img.sim, 'sim', uid), uploadImage('private-docs', img.vehicle, 'kendaraan', uid)]);
        const { error } = await supabase.from('driver_applications').insert({ user_id: uid, full_name: f.name.trim(), phone: normalizePhone(f.phone), address: f.address.trim(),
          ktp_path: ktp, sim_path: sim, vehicle_photo_path: veh, vehicle_type: f.vehicle_type || 'Motor', vehicle_plate: f.plate.trim().toUpperCase(), payout_info: f.payout?.trim() || null });
        if (error) throw error;
      } else {
        if (!f.store?.trim() || !pin || !img.photo || !cat) throw new Error('Nama toko, kategori, foto toko, dan titik peta wajib diisi.');
        if (!TIME.test(f.open) || !TIME.test(f.close)) throw new Error('Jam operasional harus berformat 08:00.');
        const photo = await uploadImage('public-media', img.photo, 'toko', uid);
        const doc = img.doc ? await uploadImage('private-docs', img.doc, 'dokumen', uid) : null;
        const { error } = await supabase.from('merchant_applications').insert({ user_id: uid, owner_name: f.name.trim(), store_name: f.store.trim(), phone: normalizePhone(f.phone),
          store_address: f.address.trim(), latitude: pin.latitude, longitude: pin.longitude, category_id: cat, open_time: f.open, close_time: f.close, store_photo_path: photo, document_path: doc });
        if (error) throw error;
      }
      await load();
      Alert.alert('Pengajuan terkirim', 'Admin akan memeriksa datamu. Kamu akan dapat notifikasi hasilnya.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      setErr((e as Error).message.includes('duplicate') ? 'Kamu sudah punya pengajuan yang menunggu.' : (e as Error).message.length < 90 && !/[{}]/.test((e as Error).message) ? (e as Error).message : friendlyError(e));
    } finally { setBusy(false); }
  };

  const isDriver = type === 'driver';
  return (
    <>
      <Header title={isDriver ? 'Pendaftaran driver' : 'Pendaftaran toko'} back />
      <Screen footer={<Button title="Kirim pengajuan" onPress={submit} loading={busy} />}>
        <Text style={{ color: colors.muted }}>{isDriver ? 'Dokumen identitas disimpan privat dan hanya dilihat admin untuk verifikasi.' : 'Toko baru bisa menerima pesanan setelah disetujui admin.'}</Text>
        <Field label={isDriver ? 'Nama lengkap (sesuai KTP)' : 'Nama pemilik'} value={f.name} onChangeText={set('name')} autoCapitalize="words" />
        <Field label="Nomor HP" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        {isDriver ? (
          <>
            <Field label="Alamat" value={f.address} onChangeText={set('address')} multiline />
            <Field label="Jenis kendaraan" value={f.vehicle_type} onChangeText={set('vehicle_type')} />
            <Field label="Nomor polisi" value={f.plate} onChangeText={set('plate')} autoCapitalize="characters" placeholder="P 1234 XX" />
            <ImagePick label="Foto KTP" uri={img.ktp} onPick={(u) => setImg((s) => ({ ...s, ktp: u }))} />
            <ImagePick label="Foto SIM (masih berlaku)" uri={img.sim} onPick={(u) => setImg((s) => ({ ...s, sim: u }))} />
            <ImagePick label="Foto kendaraan" uri={img.vehicle} onPick={(u) => setImg((s) => ({ ...s, vehicle: u }))} />
            <Field label="Rekening / metode pencairan (opsional)" value={f.payout} onChangeText={set('payout')} hint="Contoh: BRI 1234567890 a.n. nama" />
          </>
        ) : (
          <>
            <Field label="Nama toko" value={f.store} onChangeText={set('store')} />
            <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.ink }}>Kategori toko</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {cats.data?.map((c) => <Chip key={c.id} label={c.name} active={cat === c.id} onPress={() => setCat(c.id)} />)}
            </ScrollView>
            <Field label="Alamat toko" value={f.address} onChangeText={set('address')} multiline />
            <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.ink }}>Titik toko di peta</Text>
            <MapPicker value={pin} onChange={setPin} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Buka" value={f.open} onChangeText={set('open')} placeholder="08:00" keyboardType="numbers-and-punctuation" /></View>
              <View style={{ flex: 1 }}><Field label="Tutup" value={f.close} onChangeText={set('close')} placeholder="21:00" keyboardType="numbers-and-punctuation" /></View>
            </View>
            <ImagePick label="Foto toko" uri={img.photo} onPick={(u) => setImg((s) => ({ ...s, photo: u }))} />
            <ImagePick label="Dokumen pendukung (opsional)" uri={img.doc} onPick={(u) => setImg((s) => ({ ...s, doc: u }))} />
          </>
        )}
        {err ? <Text style={{ color: colors.red600 }}>{err}</Text> : null}
      </Screen>
    </>
  );
}
