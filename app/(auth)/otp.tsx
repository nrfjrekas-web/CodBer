import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Field, Header, OfflineBanner } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { friendlyError } from '@/utils/format';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(60);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (token = code) => {
    if (token.length < 6) return;
    setLoading(true); setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setLoading(false);
    if (e) setError(/expired|invalid/i.test(e.message) ? 'Kode salah atau sudah kedaluwarsa.' : friendlyError(e));
    // Berhasil: sesi tersimpan oleh SDK, penjaga navigasi di _layout mengarahkan ke layar berikutnya.
  };

  const resend = async () => {
    const { error: e } = await supabase.auth.signInWithOtp({ phone });
    if (e) return setError('Belum bisa mengirim ulang. Coba beberapa saat lagi.');
    setWait(60); setError(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <OfflineBanner />
      <Header title="Verifikasi" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: font.md, color: colors.muted }}>Masukkan 6 angka yang kami kirim ke <Text style={{ fontWeight: '700', color: colors.ink }}>{phone}</Text>.</Text>
          <Field label="Kode verifikasi" value={code} onChangeText={(t) => { const c = t.replace(/\D/g, '').slice(0, 6); setCode(c); if (c.length === 6) verify(c); }}
            keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode" placeholder="••••••" error={error}
            style={{ fontSize: font.xl, letterSpacing: 8, textAlign: 'center' }} />
          <Button title="Masuk" onPress={() => verify()} loading={loading} disabled={code.length < 6} />
          <View style={{ alignItems: 'center' }}>
            {wait > 0 ? <Text style={{ color: colors.muted }}>Kirim ulang kode dalam {wait} detik</Text>
              : <Button title="Kirim ulang kode" variant="ghost" onPress={resend} />}
          </View>
          <Button title="Ganti nomor" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
