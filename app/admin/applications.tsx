import React, { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useQuery, unwrap } from '@/hooks/useQuery';
import { Badge, Button, Card, Chip, Empty, ErrorBox, Field, Header, Loading, Screen } from '@/components/ui';
import { signedDocUrl } from '@/services/media';
import { colors, font, space } from '@/constants/theme';
import { dateTime, friendlyError } from '@/utils/format';

type DApp = { id: string; full_name: string; phone: string; address: string; ktp_path: string; sim_path: string; vehicle_photo_path: string; vehicle_type: string; vehicle_plate: string; payout_info: string | null; status: string; review_note: string | null; created_at: string };
type MApp = { id: string; owner_name: string; store_name: string; phone: string; store_address: string; document_path: string | null; store_photo_path: string; open_time: string; close_time: string; status: string; review_note: string | null; created_at: string };

export default function Applications() {
  const [type, setType] = useState<'driver' | 'merchant'>('driver');
  const [pending, setPending] = useState(true);
  const [rej, setRej] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useQuery(async () => {
    let qb = supabase.from(type === 'driver' ? 'driver_applications' : 'merchant_applications').select('*').order('created_at', { ascending: false }).limit(40);
    qb = pending ? qb.eq('status', 'pending') : qb.neq('status', 'pending');
    return unwrap(await qb) as (DApp & MApp)[];
  }, [type, pending]);

  const open = async (path: string | null) => {
    if (!path) return;
    const url = await signedDocUrl(path);
    if (url) Linking.openURL(url); else Alert.alert('Dokumen', 'Tautan tidak bisa dibuat.');
  };
  const decide = async (id: string, approve: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_review_application', { p_type: type, p_id: id, p_approve: approve, p_note: approve ? null : reason.trim() });
    setBusy(false);
    if (error) return Alert.alert('Gagal', friendlyError(error));
    setRej(null); setReason(''); q.refetch();
  };

  return (
    <>
      <Header title="Pengajuan" />
      <Screen onRefresh={q.refresh} refreshing={q.refreshing}>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Chip label="Driver" active={type === 'driver'} onPress={() => setType('driver')} />
          <Chip label="Merchant" active={type === 'merchant'} onPress={() => setType('merchant')} />
          <Chip label="Menunggu" active={pending} onPress={() => setPending(true)} />
          <Chip label="Selesai diperiksa" active={!pending} onPress={() => setPending(false)} />
        </View>
        {q.loading ? <Loading /> : q.error ? <ErrorBox message={q.error} onRetry={q.refetch} /> : !q.data?.length ? <Empty icon="document-text-outline" title="Tidak ada pengajuan" /> : q.data.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: font.md, fontWeight: '800', color: colors.ink, flex: 1 }}>{type === 'driver' ? a.full_name : a.store_name}</Text>
              <Badge label={a.status === 'pending' ? 'Menunggu' : a.status === 'approved' ? 'Disetujui' : 'Ditolak'} tone={a.status === 'pending' ? 'amber' : a.status === 'approved' ? 'green' : 'red'} />
            </View>
            <Text style={{ color: colors.muted }}>{dateTime(a.created_at)} · +{a.phone}</Text>
            {type === 'driver' ? (
              <>
                <Text style={{ color: colors.ink }}>{a.address}</Text>
                <Text style={{ color: colors.ink }}>{a.vehicle_type} · {a.vehicle_plate}{a.payout_info ? ` · ${a.payout_info}` : ''}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button title="KTP" icon="id-card-outline" variant="secondary" small onPress={() => open(a.ktp_path)} />
                  <Button title="SIM" icon="card-outline" variant="secondary" small onPress={() => open(a.sim_path)} />
                  <Button title="Kendaraan" icon="bicycle-outline" variant="secondary" small onPress={() => open(a.vehicle_photo_path)} />
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: colors.ink }}>Pemilik: {a.owner_name}</Text>
                <Text style={{ color: colors.ink }}>{a.store_address}</Text>
                <Text style={{ color: colors.muted }}>Jam {a.open_time.slice(0, 5)}–{a.close_time.slice(0, 5)}</Text>
                {a.document_path ? <Button title="Dokumen pendukung" icon="document-outline" variant="secondary" small onPress={() => open(a.document_path)} /> : null}
              </>
            )}
            {a.review_note ? <Text style={{ color: colors.red600 }}>Catatan: {a.review_note}</Text> : null}
            {a.status === 'pending' ? (rej === a.id ? (
              <View style={{ gap: 8 }}>
                <Field label="Alasan penolakan" value={reason} onChangeText={setReason} />
                <Button title="Kirim penolakan" variant="danger" loading={busy} disabled={!reason.trim()} onPress={() => decide(a.id, false)} />
                <Button title="Batal" variant="ghost" onPress={() => setRej(null)} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Button title="Tolak" variant="danger" onPress={() => setRej(a.id)} /></View>
                <View style={{ flex: 1 }}><Button title="Setujui" loading={busy} onPress={() => Alert.alert('Setujui pengajuan?', 'Role akan langsung aktif.', [{ text: 'Batal', style: 'cancel' }, { text: 'Setujui', onPress: () => decide(a.id, true) }])} /></View>
              </View>
            )) : null}
          </Card>
        ))}
      </Screen>
    </>
  );
}
