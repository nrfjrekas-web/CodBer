import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/stores/auth';
import { Button, Field, OfflineBanner } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { friendlyError, validPhone } from '@/utils/format';

export default function PhoneScreen() {
  const { loginOrRegisterWithoutOtp } = useAuth();
  const [modeTab, setModeTab] = useState<'register' | 'login'>('register');
  const [rawPhone, setRawPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [needNameForNewNumber, setNeedNameForNewNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!validPhone(rawPhone)) {
      return setError('Masukkan nomor HP yang benar, contoh 0812 3456 7890.');
    }

    const requiresName = modeTab === 'register' || needNameForNewNumber;
    if (requiresName && fullName.trim().length < 3) {
      return setError('Tulis nama lengkap minimal 3 huruf untuk mendaftar akun.');
    }

    setError(null);
    setLoading(true);

    try {
      await loginOrRegisterWithoutOtp({
        phone: rawPhone,
        fullName: requiresName ? fullName : undefined,
      });
      // Berhasil: sesi & profil tersimpan, penjaga navigasi di _layout mengarahkan ke beranda.
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (msg.includes('profile_name_required')) {
        setNeedNameForNewNumber(true);
        setError('Nomor ini belum terdaftar. Isi nama lengkap dulu untuk membuat akun.');
      } else {
        setError(friendlyError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const showNameField = modeTab === 'register' || needNameForNewNumber;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <OfflineBanner />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: space.xl, gap: space.lg, flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 150, height: 150 }}
              accessibilityLabel="Logo CodBer"
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: font.xxl, fontWeight: '800', color: colors.green900 }}>
              {modeTab === 'register' ? 'Daftar Akun CodBer' : 'Masuk ke CodBer'}
            </Text>
            <Text style={{ fontSize: font.md, color: colors.muted }}>
              {modeTab === 'register'
                ? 'Buat akun dulu tanpa verifikasi OTP, lalu langsung masuk ke beranda.'
                : 'Masuk langsung memakai nomor HP terdaftar tanpa verifikasi OTP.'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => {
                setModeTab('register');
                setNeedNameForNewNumber(false);
                setError(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: modeTab === 'register' ? colors.green700 : colors.green100,
              }}
            >
              <Text style={{ fontWeight: '700', color: modeTab === 'register' ? colors.white : colors.green900 }}>
                Daftar Akun
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setModeTab('login');
                setError(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: modeTab === 'login' ? colors.green700 : colors.green100,
              }}
            >
              <Text style={{ fontWeight: '700', color: modeTab === 'login' ? colors.white : colors.green900 }}>
                Sudah Punya Akun
              </Text>
            </Pressable>
          </View>

          <Field
            label="Nomor HP"
            value={rawPhone}
            onChangeText={(t) => {
              setRawPhone(t);
              setError(null);
            }}
            placeholder="0812 3456 7890"
            keyboardType="phone-pad"
            autoComplete="tel"
            error={showNameField ? null : error}
          />

          {showNameField ? (
            <Field
              label="Nama lengkap"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setError(null);
              }}
              placeholder="Contoh: Nur Fajar Eka Saputra"
              autoCapitalize="words"
              error={error}
            />
          ) : null}

          <Button
            title={modeTab === 'register' ? 'Daftar & Masuk' : 'Masuk Sekarang'}
            onPress={submit}
            loading={loading}
            disabled={!rawPhone.trim() || (showNameField && fullName.trim().length < 3)}
          />

          <Text style={{ fontSize: font.xs, color: colors.muted, textAlign: 'center' }}>
            Dengan melanjutkan, kamu menyetujui Syarat Layanan dan Kebijakan Privasi CodBer.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
