import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { color, radius } from '@/constants/theme';

export function HomeTopHeader({
  topInset,
  onNotifications,
}: {
  topInset: number;
  onNotifications: () => void;
}) {
  return (
    <View style={[styles.topHeader, { paddingTop: topInset + 10 }]}>
      <KonektadoWordmark color="dark" size="small" />
      <Pressable
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        onPress={onNotifications}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.verificationBlue} name="notifications" size={24} />
      </Pressable>
    </View>
  );
}

export function HomeSearchBar({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.searchBand}>
      <Pressable
        accessibilityLabel="Search nearby jobs or workers"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}>
        <Text style={styles.searchPlaceholder}>Search nearby jobs or workers</Text>
        <MaterialIcons color={color.verificationBlue} name="search" size={24} />
      </Pressable>
    </View>
  );
}

export function HomeSetupChecklist({
  status,
  note,
  onDismiss,
  onVerify,
  onAddServices,
  onAddPhoto,
}: {
  status: 'none' | 'pending' | 'rejected' | 'needs_more_info' | 'approved';
  note: string | null;
  onDismiss: () => void;
  onVerify: () => void;
  onAddServices: () => void;
  onAddPhoto: () => void;
}) {
  const title =
    status === 'pending'
      ? 'Verification pending'
      : status === 'rejected' || status === 'needs_more_info'
        ? 'Verification needs updates'
        : 'Finish your Konektado setup';

  const body =
    status === 'pending'
      ? 'Your barangay verification has been submitted and is currently being reviewed.'
      : status === 'rejected' || status === 'needs_more_info'
        ? note ?? 'Your barangay verification was reviewed and needs updates before you can publish.'
        : 'Verify your account to unlock posting, messaging, saving, and reviews.';

  const primaryLabel = status === 'none' ? 'Verify yourself' : 'View status';

  return (
    <View style={styles.bannerBand}>
      <View style={styles.bannerCard}>
        <View style={styles.bannerHeader}>
          <Text style={styles.bannerTitle}>{title}</Text>
          <Pressable
            accessibilityLabel="Dismiss setup card"
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.bannerDismiss, pressed && styles.pressed]}>
            <Text style={styles.bannerDismissText}>×</Text>
          </Pressable>
        </View>
        <Text style={styles.bannerBody}>{body}</Text>
        <View style={styles.bannerActions}>
          <BannerPill label={primaryLabel} onPress={onVerify} selected />
          <BannerPill label="Add services" onPress={onAddServices} />
          <BannerPill label="Add photo" onPress={onAddPhoto} />
        </View>
      </View>
    </View>
  );
}

export function HomeFilterTabs({
  children,
}: {
  children: ReactNode;
}) {
  return <View style={styles.filterBand}>{children}</View>;
}

export function HomeFilterPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        selected && styles.filterPillSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function HomeSectionHeader({ onFilterPress }: { onFilterPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Latest in your barangay</Text>
      <Pressable
        accessibilityLabel="Feed filters"
        accessibilityRole="button"
        onPress={onFilterPress}
        style={({ pressed }) => [styles.sectionIcon, pressed && styles.pressed]}>
        <MaterialIcons color={color.verificationBlue} name="tune" size={22} />
      </Pressable>
    </View>
  );
}

function BannerPill({
  label,
  onPress,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bannerPill,
        selected && styles.bannerPillSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.bannerPillText, selected && styles.bannerPillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  iconButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  searchBand: {
    backgroundColor: color.background,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchPlaceholder: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  bannerBand: {
    backgroundColor: color.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    overflow: 'hidden',
    padding: 16,
  },
  bannerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  bannerTitle: {
    color: '#050505',
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  bannerDismiss: {
    alignItems: 'center',
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  bannerDismissText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 18,
  },
  bannerBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 17,
  },
  bannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bannerPill: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 11,
    paddingVertical: 1,
  },
  bannerPillSelected: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  bannerPillText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  bannerPillTextSelected: {
    color: color.primary,
  },
  filterBand: {
    backgroundColor: color.background,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterPill: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 81,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillSelected: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  filterText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  filterTextSelected: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  sectionHeader: {
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  sectionIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  pressed: {
    opacity: 0.75,
  },
});
