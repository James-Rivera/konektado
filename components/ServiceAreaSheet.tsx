import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { OnboardingButton, onboardingColors } from '@/components/onboarding/FigmaOnboarding';
import { DEFAULT_BARANGAY, DEFAULT_CITY, DEFAULT_PROVINCE } from '@/services/onboarding.service';

/**
 * Shared "choose service area" sheet.
 *
 * Konektado's MVP covers a single barangay, so this sheet doubles as the place
 * that explains the coverage boundary. Onboarding passes `onChoose` to select
 * the area; Home opens the same sheet without a handler, where it simply shows
 * the current area and why no others are listed yet.
 */
export function ServiceAreaSheet({
  onChoose,
  onClose,
  title = 'Choose service area',
  visible,
}: {
  onChoose?: () => void;
  onClose: () => void;
  title?: string;
  visible: boolean;
}) {
  const selectable = Boolean(onChoose);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="58%">
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{title}</Text>
      </View>

      <View style={styles.sheetSection}>
        <Text style={styles.sheetSectionTitle}>
          {selectable ? 'Available now' : 'Your barangay'}
        </Text>
        <Pressable
          accessibilityRole={selectable ? 'button' : 'text'}
          accessibilityState={{ selected: true }}
          disabled={!selectable}
          onPress={onChoose}
          style={({ pressed }) => [styles.sheetListRow, pressed && selectable && styles.pressed]}>
          <View style={styles.optionIcon}>
            <MaterialIcons color={onboardingColors.actionBlue} name="check" size={14} />
          </View>
          <View style={styles.sheetOptionCopy}>
            <Text style={styles.sheetOptionText}>Brgy. {DEFAULT_BARANGAY}</Text>
            <Text style={styles.sheetOptionSubtext}>
              {DEFAULT_CITY}, {DEFAULT_PROVINCE}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.sheetSection}>
        <Text style={styles.sheetSectionTitle}>More areas</Text>
        <View style={[styles.sheetListRow, styles.sheetOptionDisabled]}>
          <View style={styles.optionIconPlaceholder} />
          <View style={styles.sheetOptionCopy}>
            <Text style={styles.sheetOptionTextMuted}>Other barangays in {DEFAULT_CITY}</Text>
            <Text style={styles.sheetOptionSubtextMuted}>Not available yet</Text>
          </View>
        </View>
      </View>

      <View style={styles.sheetFooter}>
        <OnboardingButton label="Done" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -2,
  },
  sheetTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  sheetSection: {
    gap: 6,
  },
  sheetSectionTitle: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  sheetListRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  optionIconPlaceholder: {
    height: 20,
    width: 20,
  },
  sheetOptionCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  sheetOptionDisabled: {
    opacity: 0.62,
  },
  sheetOptionText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  sheetOptionSubtext: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  sheetOptionTextMuted: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  sheetOptionSubtextMuted: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  sheetFooter: {
    paddingTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
