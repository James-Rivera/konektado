import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { color, radius, space, typography } from '@/constants/theme';
import { supabase } from '@/utils/supabase';

export type AdminSection = 'verifications' | 'reports' | 'photos' | 'settings';
export type AdminTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type AdminScreenShellProps = {
  activeSection: AdminSection;
  title: string;
  subtitle: string;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  footerOverlay?: ReactNode;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  showRefreshAction?: boolean;
  bottomPadding?: number;
};

export const adminPalette = {
  canvas: '#FFFFFF',
  canvasSoft: '#F8FAFC',
  blue: '#0D99FF',
  blueDeep: '#0575E6',
  blueSoft: '#EEF7FF',
  blueLine: '#69A4EC',
  orange: '#F5A623',
  orangeSoft: '#FFF7E8',
  surface: color.background,
  line: '#E5E7EB',
  lineStrong: '#C8D1DC',
  ink: '#111111',
  muted: '#46576C',
  faint: '#738293',
  successDeep: '#31945A',
  successSoft: '#EAF7EF',
  dangerDeep: color.danger,
  dangerSoft: '#FFF1F1',
  shadow: '#1B365D',
} as const;

const adminSections: {
  icon: MaterialIconName;
  label: string;
  route: string;
  value: AdminSection;
}[] = [
  { icon: 'verified-user', label: 'Verifications', route: '/admin/verifications', value: 'verifications' },
  { icon: 'article', label: 'Reports', route: '/admin/reports', value: 'reports' },
  { icon: 'photo-library', label: 'Photos', route: '/admin/photos', value: 'photos' },
  { icon: 'settings', label: 'Settings', route: '/admin/settings', value: 'settings' },
];

export function AdminScreenShell({
  activeSection,
  bottomPadding = 0,
  children,
  contentStyle,
  footerOverlay,
  loading = false,
  onRefresh,
  refreshing = false,
  showRefreshAction = true,
  subtitle,
  title,
}: AdminScreenShellProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const signOut = () => {
    Alert.alert('Log out', 'End this barangay admin session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert('Log out', error.message);
            return;
          }

          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const goToSection = (section: AdminSection) => {
    if (section === activeSection) return;
    const target = adminSections.find((item) => item.value === section);
    if (target) router.push(target.route as never);
  };

  const bottomNavHeight = 84 + Math.max(insets.bottom, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <AdminTopHeader onLogout={signOut} />
        <AdminPageHeader
          loading={loading}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showRefreshAction={showRefreshAction}
          subtitle={subtitle}
          title={title}
        />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomNavHeight + bottomPadding + space.lg },
            contentStyle,
          ]}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <AdminBottomNav
          active={activeSection}
          bottomInset={insets.bottom}
          onSelect={goToSection}
        />
        {footerOverlay}
      </View>
    </SafeAreaView>
  );
}

export function AdminTopHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={styles.topHeader}>
      <View style={styles.brandStack}>
        <KonektadoWordmark color="light" size="large" />
        <Text style={styles.adminLabel}>Barangay Admin</Text>
      </View>
      <Pressable
        accessibilityLabel="Log out"
        accessibilityRole="button"
        onPress={onLogout}
        style={({ pressed }) => [styles.topIconButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.white} name="logout" size={31} />
      </Pressable>
    </View>
  );
}

export function AdminPageHeader({
  loading,
  onRefresh,
  refreshing,
  showRefreshAction = true,
  subtitle,
  title,
}: {
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  showRefreshAction?: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSubtitle}>{subtitle}</Text>
      </View>
      {onRefresh && showRefreshAction ? (
        <Pressable
          accessibilityLabel={`Refresh ${title}`}
          accessibilityRole="button"
          disabled={refreshing || loading}
          onPress={onRefresh}
          style={({ pressed }) => [
            styles.refreshButton,
            (refreshing || loading) && styles.disabled,
            pressed && !refreshing && !loading && styles.pressed,
          ]}>
          <MaterialIcons color={adminPalette.blue} name="refresh" size={23} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminBottomNav({
  active,
  bottomInset,
  onSelect,
}: {
  active: AdminSection;
  bottomInset?: number;
  onSelect: (section: AdminSection) => void;
}) {
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset ?? 0, 10) }]}>
      {adminSections.map((section) => {
        const selected = active === section.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={section.value}
            onPress={() => onSelect(section.value)}
            style={({ pressed }) => [styles.bottomNavItem, pressed && styles.pressed]}>
            <MaterialIcons
              color={selected ? adminPalette.blue : adminPalette.faint}
              name={section.icon}
              size={26}
            />
            <Text style={[styles.bottomNavText, selected && styles.bottomNavTextActive]}>
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdminSectionNav({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
}) {
  return <AdminBottomNav active={active} onSelect={onSelect} />;
}

export function AdminFilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { count?: number; label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.filterTabs}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.filterTab, selected && styles.filterTabActive, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={[styles.filterTabText, selected && styles.filterTabTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const AdminFilterChips = AdminFilterTabs;

export function AdminMetricCard({
  active,
  icon,
  label,
  value,
}: {
  active?: boolean;
  icon: MaterialIconName;
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricLabel, active && styles.metricLabelActive]}>{label}</Text>
      <View style={styles.metricValueRow}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={20} />
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

export function AdminMetricRow({ children }: { children: ReactNode }) {
  return <View style={styles.metricRow}>{children}</View>;
}

export function AdminPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function AdminEmptyState({
  actionLabel,
  description,
  icon = 'inbox',
  onActionPress,
  title,
}: {
  actionLabel?: string;
  description: string;
  icon?: MaterialIconName;
  onActionPress?: () => void;
  title: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <MaterialIcons color={adminPalette.faint} name={icon} size={32} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onActionPress}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminLoadingState({ label }: { label: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={adminPalette.blue} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function AdminErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <AdminEmptyState
      actionLabel={onRetry ? 'Try again' : undefined}
      description={message}
      icon="error-outline"
      onActionPress={onRetry}
      title="Could not load this section"
    />
  );
}

export function AdminPrivacyNotice({
  children,
  icon = 'security',
}: {
  children: ReactNode;
  icon?: MaterialIconName;
}) {
  return (
    <View style={styles.privacyBanner}>
      <MaterialIcons color={adminPalette.blue} name={icon} size={23} />
      <Text style={styles.privacyText}>{children}</Text>
    </View>
  );
}

export function AdminStatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: AdminTone;
}) {
  return (
    <View style={[styles.statusBadge, styles[`status_${tone}`]]}>
      <Text style={[styles.statusBadgeText, styles[`statusText_${tone}`]]}>{label}</Text>
    </View>
  );
}

export function AdminInfoRow({
  icon,
  label,
  value,
}: {
  icon: MaterialIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelWrap}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={18} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function AdminListCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.listCard, style]}>{children}</View>;
}

export function AdminRequestCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <AdminListCard style={style}>{children}</AdminListCard>;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: adminPalette.blue,
    flex: 1,
  },
  screen: {
    backgroundColor: adminPalette.canvas,
    flex: 1,
  },
  topHeader: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 90,
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  brandStack: {
    alignItems: 'flex-start',
    gap: 2,
  },
  adminLabel: {
    color: color.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 18,
    lineHeight: 22,
  },
  topIconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pageHeader: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  pageHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pageTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  pageSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  refreshButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    marginLeft: space.md,
    width: 40,
  },
  content: {
    backgroundColor: adminPalette.canvas,
    gap: 0,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    minHeight: 84,
    paddingHorizontal: 22,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  bottomNavItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 56,
  },
  bottomNavText: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  bottomNavTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  filterTabs: {
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  filterTab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  filterTabActive: {
    borderBottomColor: adminPalette.blueLine,
  },
  filterTabText: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  filterTabTextActive: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Medium',
  },
  metricRow: {
    backgroundColor: color.white,
    flexDirection: 'row',
    gap: 13,
    paddingBottom: 14,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  metricCard: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    height: 68,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metricLabel: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  metricLabelActive: {
    color: adminPalette.blue,
  },
  metricValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricValue: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    lineHeight: 24,
  },
  panel: {
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: 0,
    paddingVertical: 0,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: color.white,
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 360,
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#F1F3F7',
    borderRadius: radius.pill,
    height: 76,
    justifyContent: 'center',
    marginBottom: 16,
    width: 76,
  },
  emptyTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  emptyText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: space.sm,
    minHeight: 38,
    paddingHorizontal: space.lg,
  },
  secondaryButtonText: {
    ...typography.captionMedium,
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: color.white,
    gap: space.sm,
    minHeight: 300,
    justifyContent: 'center',
    padding: space.lg,
  },
  loadingText: {
    ...typography.body,
    color: adminPalette.muted,
  },
  privacyBanner: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  privacyText: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  status_neutral: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
  },
  status_primary: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  status_success: {
    backgroundColor: adminPalette.successSoft,
    borderColor: '#D9EED8',
  },
  status_warning: {
    backgroundColor: adminPalette.orangeSoft,
    borderColor: adminPalette.orange,
  },
  status_danger: {
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
  },
  statusBadgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 15,
    textTransform: 'capitalize',
  },
  statusText_neutral: {
    color: adminPalette.muted,
  },
  statusText_primary: {
    color: adminPalette.blueDeep,
  },
  statusText_success: {
    color: adminPalette.successDeep,
  },
  statusText_warning: {
    color: adminPalette.ink,
  },
  statusText_danger: {
    color: adminPalette.dangerDeep,
  },
  infoRow: {
    alignItems: 'center',
    borderTopColor: adminPalette.lineStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingVertical: 12,
  },
  infoLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  infoLabel: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  infoValue: {
    color: adminPalette.ink,
    flexShrink: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  listCard: {
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    gap: 14,
    paddingHorizontal: 13,
    paddingVertical: 15,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.58,
  },
});
