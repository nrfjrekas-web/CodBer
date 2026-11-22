import React from 'react';
import {
  ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font, radius, space, TAP } from '@/constants/theme';
import { useOnline } from '@/hooks/useNetwork';
import { STATUS_LABEL, TRACK_STEPS, stepIndex, rupiah } from '@/utils/format';
import type { OrderStatus } from '@/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <View style={s.offline} accessibilityRole="alert">
      <Ionicons name="cloud-offline" size={16} color={colors.white} />
      <Text style={s.offlineText}>Tidak ada koneksi. Data mungkin belum terbaru.</Text>
    </View>
  );
}

/** `inset`: beri jarak status bar bila layar tidak memakai <Header> (Header sudah menangani inset sendiri). */
export function Screen({ children, scroll = true, onRefresh, refreshing = false, footer, padded = true, inset = false }: {
  children: React.ReactNode; scroll?: boolean; onRefresh?: () => void; refreshing?: boolean; footer?: React.ReactNode; padded?: boolean; inset?: boolean;
}) {
  const ins = useSafeAreaInsets();
  return (
    <SafeAreaView style={s.screen} edges={inset ? ['top'] : []}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padded && { padding: space.lg }, { paddingBottom: space.xxl, gap: space.md }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green600} colors={[colors.green600]} /> : undefined}
        >{children}</ScrollView>
      ) : <View style={{ flex: 1 }}>{children}</View>}
      {footer ? <View style={[s.footer, { paddingBottom: space.lg + Math.max(0, ins.bottom - 8) }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: top + space.md }]}>
      {back ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.back} accessibilityLabel="Kembali" hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, small, style }: {
  title: string; onPress: () => void; variant?: BtnVariant; loading?: boolean; disabled?: boolean; icon?: IconName; small?: boolean; style?: ViewStyle;
}) {
  const v = btn[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress} disabled={off} accessibilityRole="button" accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [s.btn, small && { minHeight: 40, paddingHorizontal: space.md }, { backgroundColor: v.bg, borderColor: v.border }, off && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
          <Text style={[s.btnText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
const btn: Record<BtnVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.green600, fg: colors.white, border: colors.green600 },
  accent: { bg: colors.orange500, fg: colors.ink, border: colors.orange500 },
  secondary: { bg: colors.white, fg: colors.green700, border: colors.green600 },
  danger: { bg: colors.white, fg: colors.red600, border: colors.red600 },
  ghost: { bg: 'transparent', fg: colors.muted, border: 'transparent' },
};

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = <View style={[s.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>{body}</Pressable> : body;
}

export function Field({ label, error, hint, style, ...p }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8A9A8D" accessibilityLabel={label}
        style={[s.input, p.multiline && { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }, error ? { borderColor: colors.red600 } : null, style]}
        {...p}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={[s.chip, active && { backgroundColor: colors.green600, borderColor: colors.green600 }]}>
      {icon ? <Ionicons name={icon} size={16} color={active ? colors.white : colors.green700} /> : null}
      <Text style={[s.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'green' | 'orange' | 'red' | 'blue' | 'amber' | 'gray';
const tones: Record<Tone, [string, string]> = {
  green: [colors.green100, colors.green700], orange: [colors.orange100, colors.orange600], red: [colors.red100, colors.red600],
  blue: [colors.blue100, colors.blue600], amber: [colors.amber100, colors.amber700], gray: ['#EAEEE8', colors.muted],
};
export function Badge({ label, tone = 'gray' }: { label: string; tone?: Tone }) {
  return <View style={[s.badge, { backgroundColor: tones[tone][0] }]}><Text style={[s.badgeText, { color: tones[tone][1] }]}>{label}</Text></View>;
}
const statusTone = (st: OrderStatus): Tone =>
  st === 'completed' ? 'green' : ['rejected', 'cancelled', 'failed'].includes(st) ? 'red' : st === 'pending_payment' ? 'amber'
  : ['delivering', 'picked_up', 'driver_to_merchant', 'assigned_to_driver'].includes(st) ? 'blue' : 'orange';
export const StatusBadge = ({ status }: { status: OrderStatus }) => <Badge label={STATUS_LABEL[status]} tone={statusTone(status)} />;

export function Loading({ label = 'Memuat…' }: { label?: string }) {
  return <View style={s.center}><ActivityIndicator size="large" color={colors.green600} /><Text style={s.hint}>{label}</Text></View>;
}
export function Empty({ icon = 'file-tray-outline', title, text, action }: { icon?: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <View style={s.center}>
      <View style={s.emptyIcon}><Ionicons name={icon} size={30} color={colors.green700} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={[s.hint, { textAlign: 'center' }]}>{text}</Text> : null}
      {action}
    </View>
  );
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Ionicons name="alert-circle-outline" size={36} color={colors.red600} />
      <Text style={s.emptyTitle}>Gagal memuat</Text>
      <Text style={[s.hint, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button title="Coba lagi" variant="secondary" small onPress={onRetry} /> : null}
    </View>
  );
}

export function Section({ title, action }: { title: string; action?: React.ReactNode }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{action}</View>;
}
export function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'orange' | 'red' }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, bold && { color: colors.ink, fontWeight: '700' }]}>{label}</Text>
      <Text style={[s.rowValue, bold && { fontSize: font.lg }, tone === 'orange' && { color: colors.orange600 }, tone === 'red' && { color: colors.red600 }]}>{value}</Text>
    </View>
  );
}
export const Divider = () => <View style={{ height: 1, backgroundColor: colors.line }} />;
export const Price = ({ value, style }: { value: number; style?: object }) => <Text style={[s.price, style]}>{rupiah(value)}</Text>;

export function Thumb({ uri, size = 64, icon = 'image-outline' }: { uri?: string; size?: number; icon?: IconName }) {
  return uri
    ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.green50 }} />
    : <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: colors.green50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={size / 2.6} color={colors.green700} />
      </View>;
}

export function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onChange} onPress={() => onChange?.(n)} accessibilityLabel={`${n} bintang`} hitSlop={4}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.orange500} />
        </Pressable>
      ))}
    </View>
  );
}

/** Lini waktu 6 langkah status pelanggan (PRD 5.6). */
export function Stepper({ status }: { status: OrderStatus }) {
  const idx = stepIndex(status);
  const labels = ['Menunggu Toko', 'Toko Memproses', 'Siap Diambil', 'Driver Menuju Toko', 'Driver Mengantar', 'Selesai'];
  return (
    <View style={{ gap: 0 }}>
      {TRACK_STEPS.map((_, i) => {
        const done = i <= idx;
        return (
          <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ alignItems: 'center', width: 22 }}>
              <View style={[s.dot, done && { backgroundColor: colors.green600, borderColor: colors.green600 }, i === idx && { borderColor: colors.orange500, backgroundColor: colors.orange500 }]}>
                {done && i !== idx ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
              </View>
              {i < 5 ? <View style={[s.stem, i < idx && { backgroundColor: colors.green600 }]} /> : null}
            </View>
            <Text style={[s.stepLabel, i === idx && { color: colors.ink, fontWeight: '700' }, done && i !== idx && { color: colors.green700 }]}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  footer: { padding: space.lg, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.bg },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.green900 },
  subtitle: { fontSize: font.sm, color: colors.muted },
  btn: { minHeight: TAP, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: font.md, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.sm },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.ink },
  input: { minHeight: TAP, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: space.md, fontSize: font.md, color: colors.ink },
  error: { fontSize: font.sm, color: colors.red600 },
  hint: { fontSize: font.sm, color: colors.muted },
  chip: { minHeight: 40, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  chipText: { fontSize: font.sm, fontWeight: '600', color: colors.green700 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: font.xs, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl, paddingVertical: 48 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: font.lg, fontWeight: '700', color: colors.ink },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  sectionTitle: { fontSize: font.lg, fontWeight: '800', color: colors.green900 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  rowLabel: { fontSize: font.sm, color: colors.muted, flexShrink: 1 },
  rowValue: { fontSize: font.md, color: colors.ink, fontWeight: '600', textAlign: 'right' },
  price: { fontSize: font.md, fontWeight: '800', color: colors.orange600 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stem: { width: 2, height: 22, backgroundColor: colors.line },
  stepLabel: { fontSize: font.md, color: colors.muted, paddingTop: 1, paddingBottom: 18 },
  offline: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.ink, paddingHorizontal: space.lg, paddingVertical: 8 },
  offlineText: { color: colors.white, fontSize: font.sm, flex: 1 },
});
