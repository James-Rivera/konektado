import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius } from '@/constants/theme';

/**
 * Contextual verification / profile-completion prompt shown at the top of the
 * Home feed. The greeting, location, search entry, category grid, and section
 * headers now live in `HomeDiscoveryUI`.
 */
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

const styles = StyleSheet.create({
  bannerBand: {
    backgroundColor: color.background,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  pressed: {
    opacity: 0.75,
  },
});
