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

export function HomeSetupNudge({
  actionLabel,
  body,
  optional = false,
  onAction,
  onDismiss,
  title,
}: {
  actionLabel: string;
  body: string;
  optional?: boolean;
  onAction: () => void;
  onDismiss?: () => void;
  title: string;
}) {
  return (
    <View style={styles.bannerBand}>
      <View style={styles.bannerCard}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerTitleRow}>
            <View style={[styles.bannerIcon, optional && styles.bannerIconOptional]}>
              <MaterialIcons
                color={optional ? color.textSubtle : color.verificationBlue}
                name={optional ? 'person-add-alt' : 'task-alt'}
                size={18}
              />
            </View>
            <Text style={styles.bannerTitle}>{title}</Text>
          </View>
          {optional && onDismiss ? (
            <Pressable
              accessibilityLabel="Dismiss setup suggestion"
              accessibilityRole="button"
              onPress={onDismiss}
              style={({ pressed }) => [styles.bannerDismiss, pressed && styles.pressed]}>
              <MaterialIcons color={color.textSubtle} name="close" size={18} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.bannerBody}>{body}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.bannerPrimaryAction, pressed && styles.pressed]}>
          <Text style={styles.bannerPrimaryText}>{actionLabel}</Text>
        </Pressable>
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
    gap: 10,
    overflow: 'hidden',
    padding: 16,
  },
  bannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  bannerTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  bannerIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  bannerIconOptional: {
    backgroundColor: color.surfaceAlt,
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
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  bannerBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  bannerPrimaryAction: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerPrimaryText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
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
