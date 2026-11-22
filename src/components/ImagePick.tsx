import React from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius } from '@/constants/theme';
import { pickImage } from '@/services/media';

/** Kotak pilih foto. Foto baru diunggah saat formulir dikirim, bukan saat dipilih. */
export function ImagePick({ label, uri, onPick, aspect = [4, 3], height = 140 }: {
  label: string; uri?: string | null; onPick: (uri: string) => void; aspect?: [number, number]; height?: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.ink }}>{label}</Text>
      <Pressable
        accessibilityRole="button" accessibilityLabel={`Pilih ${label}`}
        onPress={async () => { try { const u = await pickImage(aspect); if (u) onPick(u); } catch (e) { Alert.alert('Foto', (e as Error).message); } }}
        style={{ height, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.green600, backgroundColor: colors.green50, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} /> : (
          <>
            <Ionicons name="camera-outline" size={28} color={colors.green700} />
            <Text style={{ color: colors.green700, fontWeight: '600' }}>Ketuk untuk memilih foto</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
