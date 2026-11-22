import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import { Button } from './ui';
import { colors, radius } from '@/constants/theme';
import { currentPosition, Coords, JEMBER } from '@/services/location';

/** Peta pilih titik. Dimuat hanya di layar yang membutuhkannya (alamat, pendaftaran toko). */
export function MapPicker({ value, onChange, height = 240 }: { value: Coords | null; onChange: (c: Coords) => void; height?: number }) {
  const ref = useRef<MapView>(null);
  const [busy, setBusy] = useState(false);
  const center = value ?? JEMBER;
  const region: Region = { ...center, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  const locate = async () => {
    setBusy(true);
    try {
      const p = await currentPosition();
      if (!p) return Alert.alert('Izin lokasi ditolak', 'Aktifkan izin lokasi di pengaturan HP, atau ketuk peta untuk memilih titik.');
      onChange(p);
      ref.current?.animateToRegion({ ...p, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.wrap, { height }]}>
        <MapView ref={ref} style={StyleSheet.absoluteFill} initialRegion={region} onPress={(e: MapPressEvent) => onChange(e.nativeEvent.coordinate)} toolbarEnabled={false}>
          {value ? <Marker coordinate={value} draggable onDragEnd={(e) => onChange(e.nativeEvent.coordinate)} pinColor={colors.red600} /> : null}
        </MapView>
      </View>
      <Button title="Gunakan lokasi saya" icon="locate" variant="secondary" small loading={busy} onPress={locate} />
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line } });
