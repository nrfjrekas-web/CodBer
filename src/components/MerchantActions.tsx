import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button, Field } from '@/components/ui';
import { friendlyError } from '@/utils/format';
import type { OrderStatus } from '@/types';

/** Aksi merchant sesuai status. Server menolak transisi yang tidak sah. */
export function MerchantActions({ id, status, onDone }: { id: string; status: OrderStatus; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const run = async (action: string, why?: string) => {
    setBusy(true);
    const { error } = await supabase.rpc('merchant_order_action', { p_order: id, p_action: action, p_reason: why ?? null });
    setBusy(false);
    if (error) Alert.alert('Gagal', friendlyError(error)); else { setRejecting(false); onDone(); }
  };
  if (status === 'pending_merchant') {
    return rejecting ? (
      <View style={{ gap: 8 }}>
        <Field label="Alasan menolak" value={reason} onChangeText={setReason} placeholder="Contoh: stok habis" />
        <Button title="Kirim penolakan" variant="danger" loading={busy} disabled={!reason.trim()} onPress={() => run('reject', reason.trim())} />
        <Button title="Batal" variant="ghost" onPress={() => setRejecting(false)} />
      </View>
    ) : (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Tolak" variant="danger" onPress={() => setRejecting(true)} /></View>
        <View style={{ flex: 1 }}><Button title="Terima" loading={busy} onPress={() => run('accept')} /></View>
      </View>
    );
  }
  if (status === 'accepted') return <Button title="Mulai siapkan" icon="flame" loading={busy} onPress={() => run('prepare')} />;
  if (status === 'preparing') return <Button title="Tandai siap diambil" icon="checkmark-circle" loading={busy} onPress={() => run('ready')} />;
  return null;
}
