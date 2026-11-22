import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/stores/auth';
import { Button, Field, OfflineBanner } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { friendlyError } from '@/utils/format';

export default function ProfileSetup() {
  const { completeProfileName, signOut } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const full = name.trim();
    if (full.length < 3) return setError('Tulis nama lengkap minimal 3 huruf.');
    setLoading(true);
    setError(null);
    try {
      await completeProfileName(full);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: font.xxl, fontWeight: '800', color: colors.green900 }}>Kenalan dulu</Text>
        <Text style={{ fontSize: font.md, color: colors.muted }}>Nama ini terlihat oleh toko dan driver yang mengantar pesananmu.</Text>
        <Field label="Nama lengkap" value={name} onChangeText={setName} placeholder="Contoh: Siti Rahma" autoCapitalize="words" error={error} />
        <Button title="Lanjut" onPress={save} loading={loading} disabled={!name.trim()} />
        <Button title="Keluar" variant="ghost" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}
