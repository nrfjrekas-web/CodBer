import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, radius } from '@/constants/theme';

type P = { latitude: number; longitude: number } | null;
/** Peta pelacakan: toko, tujuan, dan posisi driver terbaru. Dimuat hanya saat pengantaran aktif. */
export function TrackMap({ store, dest, driver }: { store: P; dest: P; driver: P }) {
  const ref = useRef<MapView>(null);
  const pts = [store, dest, driver].filter(Boolean) as { latitude: number; longitude: number }[];
  useEffect(() => {
    if (pts.length > 1) ref.current?.fitToCoordinates(pts, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.latitude, driver?.longitude]);
  const first = pts[0] ?? { latitude: -8.1724, longitude: 113.7005 };
  return (
    <View style={{ height: 240, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
      <MapView ref={ref} style={StyleSheet.absoluteFill} toolbarEnabled={false} initialRegion={{ ...first, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
        {store ? <Marker coordinate={store} title="Toko" pinColor={colors.orange500} /> : null}
        {dest ? <Marker coordinate={dest} title="Tujuan" pinColor={colors.red600} /> : null}
        {driver ? <Marker coordinate={driver} title="Driver" pinColor={colors.green600} /> : null}
      </MapView>
    </View>
  );
}
