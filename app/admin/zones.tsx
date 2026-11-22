import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Button, Card, ErrorBox, Field, Header, Loading, Screen } from '@/components/ui';
import { colors } from '@/constants/theme';
import { friendlyError } from '@/utils/format';

type Z = { id: string; name: string; delivery_fee: number; rules: { max_km: number }; is_active: boolean };

function ZoneCard({ z, onSaved }: { z: Z; onSaved: () => void }) {
  const [fee, setFee] = useState(String(z.delivery_fee));
  const [km, setKm] = useState(String(z.rules.max_km));
  const [busy, setBusy] = useState(false);
  const save = async (active = z.is_active) => {
    const f = Number(fee), k = Number(km.replace(',', '.'));
    if (!(f >= 0) || !(k > 0)) return Alert.alert('Periksa isian', 'Ongkir dan jarak harus angka.');
    setBusy(true);
    const { error } = await supabase.from('zones').update({ delivery_fee: f, rules: { max_km: k }, is_active: active }).eq('id', z.id);
    setBusy(false);
    if (error) Alert.alert('Gagal', friendlyError(error)); else onSaved();
  };
  return (
    <Card>
      <Text style={{ fontWeight: '800', color: colors.ink }}>{z.name}{z.is_active ? '' : ' (nonaktif)'}</Text>
      <Field label="Ongkir (Rp)" value={fee} onChangeText={setFee} keyboardType="number-pad" />
      <Field label="Jarak maksimal toko ke alamat (km)" value={km} onChangeText={setKm} keyboardType="decimal-pad" />
      <Button title="Simpan" small loading={busy} onPress={() => save()} />
      <Button title={z.is_active ? 'Nonaktifkan zona' : 'Aktifkan zona'} variant="ghost" small onPress={() => save(!z.is_active)} />
    </Card>
  );
}

export default function Zones() {
  const q = useQuery(async () => unwrap(await supabase.from('zones').select('*').order('delivery_fee')) as Z[], []);
  return (
    <>
      <Header title="Zona & ongkir" back />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <Text style={{ color: colors.muted }}>Zona ditentukan server dari jarak lurus toko ke alamat. Pesanan memakai zona terkecil yang mencakup jaraknya. Perubahan tercatat di audit log.</Text>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : q.data?.map((z) => <ZoneCard key={z.id + z.delivery_fee + z.is_active} z={z} onSaved={q.refetch} />)}
      </Screen>
    </>
  );
}
