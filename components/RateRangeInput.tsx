import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';
import {
  formatRateRange,
  MARKETPLACE_RATE_TYPE_OPTIONS,
} from '@/services/marketplace.helpers';
import type { RateType } from '@/types/marketplace.types';

type RateRangeInputProps = {
  label: string;
  minValue: string;
  maxValue: string;
  rateType: RateType;
  negotiable?: boolean;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  minLabel?: string;
  maxLabel?: string;
  helperText?: string;
  error?: string;
  previewPrefix?: string;
  showNegotiableToggle?: boolean;
  showPreview?: boolean;
  showRateTypeOptions?: boolean;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  onRateTypeChange: (value: RateType) => void;
  onNegotiableChange?: (value: boolean) => void;
};

function parseAmount(value: string) {
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function RateRangeInput({
  label,
  minValue,
  maxValue,
  rateType,
  negotiable = false,
  minPlaceholder = '200',
  maxPlaceholder = '300',
  minLabel = 'Minimum',
  maxLabel = 'Maximum',
  helperText = 'Set a fair expected range. Final price can still depend on task size, distance, materials, and agreement.',
  error,
  previewPrefix,
  showNegotiableToggle = true,
  showPreview = true,
  showRateTypeOptions = true,
  onMinChange,
  onMaxChange,
  onRateTypeChange,
  onNegotiableChange,
}: RateRangeInputProps) {
  const preview = formatRateRange({
    min: parseAmount(minValue),
    max: parseAmount(maxValue),
    rateType,
    negotiable,
    fallback: 'Enter a minimum and maximum amount',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helper}>{helperText}</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{minLabel}</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={onMinChange}
            placeholder={minPlaceholder}
            placeholderTextColor="#AFAFAF"
            style={[styles.input, error && styles.inputError]}
            value={minValue}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{maxLabel}</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={onMaxChange}
            placeholder={maxPlaceholder}
            placeholderTextColor="#AFAFAF"
            style={[styles.input, error && styles.inputError]}
            value={maxValue}
          />
        </View>
      </View>

      {showRateTypeOptions ? (
        <View style={styles.chipWrap}>
          {MARKETPLACE_RATE_TYPE_OPTIONS.map((option) => {
            const active = option.value === rateType;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={option.value}
                onPress={() => onRateTypeChange(option.value)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {showNegotiableToggle && onNegotiableChange ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: negotiable }}
          onPress={() => onNegotiableChange(!negotiable)}
          style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Open to negotiation within this range</Text>
            <Text style={styles.toggleDescription}>This does not replace the required min and max.</Text>
          </View>
          <View style={[styles.toggleTrack, negotiable && styles.toggleTrackOn]}>
            <View style={[styles.toggleKnob, negotiable && styles.toggleKnobOn]} />
          </View>
        </Pressable>
      ) : null}

      {showPreview ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>{previewPrefix ?? 'Preview'}</Text>
          <Text style={styles.previewText}>{preview}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  label: {
    ...typography.captionMedium,
    color: color.text,
  },
  helper: {
    ...typography.caption,
    color: color.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  inputGroup: {
    flex: 1,
    gap: space.xs,
  },
  inputLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  input: {
    ...typography.body,
    backgroundColor: color.background,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  inputError: {
    borderColor: color.danger,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  chipActive: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  chipTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 44,
    padding: space.md,
  },
  toggleCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  toggleTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  toggleDescription: {
    ...typography.caption,
    color: color.textMuted,
  },
  toggleTrack: {
    backgroundColor: '#A1A1AA',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    padding: 4,
    width: 40,
  },
  toggleTrackOn: {
    backgroundColor: color.verificationBlue,
  },
  toggleKnob: {
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 16,
    width: 16,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  previewBox: {
    backgroundColor: color.primarySoft,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space['2xs'],
    padding: space.md,
  },
  previewLabel: {
    ...typography.tiny,
    color: color.textMuted,
  },
  previewText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  error: {
    ...typography.caption,
    color: color.danger,
  },
  pressed: {
    opacity: 0.72,
  },
});
