import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Field, OfflineBanner } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { normalizePhone, validPhone, friendlyError } from '@/utils/format';

export default function PhoneScreen() {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!validPhone(raw)) return setError('Masukkan nomor HP yang benar, contoh 0812 3456 7890.');
    setError(null); setLoading(true);
    const phone = '+' + normalizePhone(raw);
    const { error: e } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (e) return setError(/rate|limit|seconds/i.test(e.message) ? 'Terlalu sering meminta kode. Tunggu sebentar lalu coba lagi.' : friendlyError(e));
    router.push({ pathname: '/(auth)/otp', params: { phone } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <OfflineBanner />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Image source={require('../../assets/logo.png')} style={{ width: 150, height: 150 }} accessibilityLabel="Logo CodBer" />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: font.xxl, fontWeight: '800', color: colors.green900 }}>Masuk ke CodBer</Text>
            <Text style={{ fontSize: font.md, color: colors.muted }}>Pesan makanan dan barang dari toko di Jember. Kami kirim kode verifikasi lewat SMS.</Text>
          </View>
          <Field label="Nomor HP" value={raw} onChangeText={(t) => { setRaw(t); setError(null); }} placeholder="0812 3456 7890" keyboardType="phone-pad" autoComplete="tel" error={error} />
          <Button title="Kirim kode" onPress={send} loading={loading} disabled={!raw} />
          <Text style={{ fontSize: font.xs, color: colors.muted, textAlign: 'center' }}>Dengan masuk, kamu menyetujui Syarat Layanan dan Kebijakan Privasi CodBer.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
