import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { Button, Field, Header, Screen, Section } from '@/components/ui';
import { RoleSettings } from '@/components/RoleSettings';
import { friendlyError } from '@/utils/format';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export default function MerchantSettings() {
  const uid = useAuth((s) => s.session?.user.id ?? '');
  const [f, setF] = useState({ name: '', description: '', phone: '', open: '08:00', close: '21:00' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from('merchants').select('name,description,phone,open_time,close_time').eq('owner_user_id', uid).maybeSingle().then(({ data }) => {
      if (data) setF({ name: data.name, description: data.description ?? '', phone: data.phone, open: data.open_time.slice(0, 5), close: data.close_time.slice(0, 5) });
    });
  }, [uid]);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.name.trim() || !TIME.test(f.open) || !TIME.test(f.close)) return Alert.alert('Periksa isian', 'Nama toko wajib diisi dan jam berformat 08:00.');
    setBusy(true);
    const { error } = await supabase.from('merchants').update({ name: f.name.trim(), description: f.description.trim() || null, phone: f.phone.trim(), open_time: f.open, close_time: f.close }).eq('owner_user_id', uid);
    setBusy(false);
    Alert.alert(error ? 'Gagal' : 'Tersimpan', error ? friendlyError(error) : 'Data toko diperbarui.');
  };
  return (
    <>
      <Header title="Pengaturan" />
      <Screen>
        <Section title="Data toko" />
        <Field label="Nama toko" value={f.name} onChangeText={set('name')} />
        <Field label="Deskripsi" value={f.description} onChangeText={set('description')} multiline />
        <Field label="Nomor HP toko" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Jam buka" value={f.open} onChangeText={set('open')} placeholder="08:00" />
        <Field label="Jam tutup" value={f.close} onChangeText={set('close')} placeholder="21:00" />
        <Button title="Simpan data toko" onPress={save} loading={busy} />
        <Section title="Akun" />
        <RoleSettings />
      </Screen>
    </>
  );
}
