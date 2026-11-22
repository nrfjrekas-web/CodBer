import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { Button, Chip, Field, Header, Screen } from '@/components/ui';
import { MapPicker } from '@/components/MapPicker';
import { colors, font } from '@/constants/theme';
import { friendlyError, validPhone, normalizePhone } from '@/utils/format';
import type { Coords } from '@/services/location';
import type { Address } from '@/types';
import { View } from 'react-native';

export default function AddressForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, profile } = useAuth();
  const [label, setLabel] = useState('Rumah');
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ? '0' + profile.phone.replace(/^62/, '') : '');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState<Coords | null>(null);
  const [isDefault, setDefault] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('customer_addresses').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      const a = data as Address | null;
      if (!a) return;
      setLabel(a.label); setName(a.recipient_name); setPhone('0' + a.recipient_phone.replace(/^62/, '')); setText(a.address_text);
      setNote(a.delivery_note ?? ''); setPin({ latitude: Number(a.latitude), longitude: Number(a.longitude) }); setDefault(a.is_default);
    });
  }, [id]);

  const save = async () => {
    if (!name.trim() || !text.trim()) return setErr('Nama penerima dan alamat lengkap wajib diisi.');
    if (!validPhone(phone)) return setErr('Nomor HP penerima belum benar.');
    if (!pin) return setErr('Tandai titik lokasi di peta dulu.');
    setBusy(true); setErr(null);
    const row = { user_id: (session?.user.id ?? ''), label: label.trim() || 'Alamat', recipient_name: name.trim(), recipient_phone: normalizePhone(phone), address_text: text.trim(),
      latitude: pin.latitude, longitude: pin.longitude, delivery_note: note.trim() || null, is_default: isDefault };
    const { error } = id ? await supabase.from('customer_addresses').update(row).eq('id', id) : await supabase.from('customer_addresses').insert(row);
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    router.back();
  };

  return (
    <>
      <Header title={id ? 'Ubah alamat' : 'Tambah alamat'} back />
      <Screen footer={<Button title="Simpan alamat" onPress={save} loading={busy} />}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Rumah', 'Kantor', 'Lainnya'].map((l) => <Chip key={l} label={l} active={label === l} onPress={() => setLabel(l)} />)}
        </View>
        <Field label="Nama penerima" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Nomor HP penerima" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Alamat lengkap" value={text} onChangeText={setText} multiline placeholder="Jalan, nomor, RT/RW, kelurahan" />
        <Field label="Patokan untuk driver (opsional)" value={note} onChangeText={setNote} placeholder="Contoh: pagar hijau depan masjid" />
        <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.ink }}>Titik lokasi</Text>
        <MapPicker value={pin} onChange={setPin} />
        <Text style={{ fontSize: font.xs, color: colors.muted }}>{pin ? 'Geser pin atau ketuk peta untuk menyesuaikan titik.' : 'Ketuk peta atau gunakan lokasi saya. Titik ini menentukan ongkir.'}</Text>
        <Chip label="Jadikan alamat utama" icon={isDefault ? 'checkmark-circle' : 'ellipse-outline'} active={isDefault} onPress={() => setDefault(!isDefault)} />
        {err ? <Text style={{ color: colors.red600 }}>{err}</Text> : null}
      </Screen>
    </>
  );
}
