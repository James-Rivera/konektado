import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { SearchRateRangeSlider } from '@/components/search/SearchRateRangeSlider';
import { getPriceSliderMaximum, getRangeError, parsePriceAmount } from '@/services/pricing';

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


export type RateRangeInputHandle = { focusError: () => void };

export const RateRangeInput = forwardRef<RateRangeInputHandle,RateRangeInputProps>(function RateRangeInput({
  label,
  minValue,
  maxValue,
  rateType,
  negotiable = false,
  minPlaceholder = '200',
  maxPlaceholder = '300',
  minLabel = 'Minimum',
  maxLabel = 'Maximum',
  helperText = 'Drag to choose a range, or enter exact amounts. Use the same amount for a fixed price.',
  error,
  showNegotiableToggle = true,
  showRateTypeOptions = true,
  onMinChange,
  onMaxChange,
  onRateTypeChange,
  onNegotiableChange,
}: RateRangeInputProps, ref) {
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [exactEntryVisible, setExactEntryVisible] = useState(false);
  const min = parsePriceAmount(minValue);
  const max = parsePriceAmount(maxValue);
  const invalidRange = (minValue && !Number.isFinite(min)) || (maxValue && !Number.isFinite(max))
    ? 'Enter valid amounts in pesos.' : minValue && maxValue ? getRangeError(min, max) : null;
  const [sliderMaximum, setSliderMaximum] = useState(() => getPriceSliderMaximum(min, max));
  const [exactAttempted, setExactAttempted] = useState(false);
  const minimumRef = useRef<TextInput>(null);
  const maximumRef = useRef<TextInput>(null);
  const exactError = invalidRange || (exactAttempted ? getRangeError(min,max) : null);
  useImperativeHandle(ref,() => ({ focusError:() => { setExactAttempted(true); setExactEntryVisible(true); } }));
  const confirmExact = () => {
    setExactAttempted(true);
    if (invalidRange || getRangeError(min,max)) { (min !== null && max !== null && max < min ? maximumRef : minimumRef).current?.focus(); return; }
    setSliderMaximum(getPriceSliderMaximum(min,max)); setExactEntryVisible(false);
  };
  const preview = formatRateRange({
    min: invalidRange ? null : min,
    max: invalidRange ? null : max,
    rateType,
    negotiable,
    fallback: invalidRange || 'Choose your price range',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helper}>{helperText}</Text>

      <Text accessibilityLiveRegion="polite" style={styles.previewText}>{preview}</Text>
      <SearchRateRangeSlider minimumValue={0} maximumValue={sliderMaximum} step={50}
        value={{ minimum: Number.isFinite(min) ? min ?? 0 : 0, maximum: Number.isFinite(max) ? max ?? sliderMaximum : sliderMaximum }}
        onChange={(low, high) => { onMinChange(String(Number(Math.max(1, low).toFixed(2)))); onMaxChange(String(Number(Math.max(1, high).toFixed(2)))); }} />
      <Pressable accessibilityRole="button" onPress={() => { setExactAttempted(false); setExactEntryVisible(true); }} style={styles.chip}><Text style={styles.chipTextActive}>Enter exact amounts</Text></Pressable>
      <BottomSheet onShow={() => (min !== null && max !== null && max < min ? maximumRef : minimumRef).current?.focus()} visible={exactEntryVisible} onClose={() => setExactEntryVisible(false)} maxHeight="80%">
      <KeyboardAvoidingView style={{ gap: space.md }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={styles.toggleTitle}>Exact amounts (PHP)</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{minLabel}</Text>
          <TextInput
            ref={minimumRef}
            accessibilityHint={exactError || undefined}
            {...(Platform.OS === 'web' ? {'aria-invalid':Boolean(exactError), 'aria-describedby':'exact-price-error'} : {})}
            accessibilityLabel={`${label}: ${minLabel} in pesos`}
            keyboardType="decimal-pad"
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
            ref={maximumRef}
            accessibilityHint={exactError || undefined}
            {...(Platform.OS === 'web' ? {'aria-invalid':Boolean(exactError), 'aria-describedby':'exact-price-error'} : {})}
            accessibilityLabel={`${label}: ${maxLabel} in pesos`}
            keyboardType="decimal-pad"
            onChangeText={onMaxChange}
            placeholder={maxPlaceholder}
            placeholderTextColor="#AFAFAF"
            style={[styles.input, error && styles.inputError]}
            value={maxValue}
          />
        </View>
      </View>

      {exactError ? <Text nativeID="exact-price-error" accessibilityRole="alert" style={styles.error}>{exactError}</Text> : null}
      <Pressable accessibilityRole="button" onPress={confirmExact} style={styles.chip}><Text style={styles.chipTextActive}>Done</Text></Pressable>
      </KeyboardAvoidingView>
      </BottomSheet>

      {showRateTypeOptions ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Choose price unit" onPress={() => setUnitPickerVisible(true)} style={styles.toggleRow}>
          <Text style={styles.toggleTitle}>Price unit: {MARKETPLACE_RATE_TYPE_OPTIONS.find(option => option.value === rateType)?.label ?? 'Project'}</Text>
          <MaterialIcons name="keyboard-arrow-down" color={color.primaryText} size={24} />
        </Pressable>
      ) : null}
      <BottomSheet visible={unitPickerVisible} onClose={() => setUnitPickerVisible(false)} maxHeight="80%">
        <Text style={styles.toggleTitle}>What does this price cover?</Text>
        <Pressable accessibilityRole="button" onPress={() => setUnitPickerVisible(false)} style={styles.chip}><Text style={styles.chipTextActive}>Close</Text></Pressable>
        <View style={styles.chipWrap}>
          {MARKETPLACE_RATE_TYPE_OPTIONS.map((option) => {
            const active = option.value === rateType;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={option.value}
                onPress={() => { onRateTypeChange(option.value); setUnitPickerVisible(false); }}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      {showNegotiableToggle && onNegotiableChange ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: negotiable }}
          onPress={() => onNegotiableChange(!negotiable)}
          style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Price is negotiable</Text>
            <Text style={styles.toggleDescription}>Final amount can change by mutual agreement.</Text>
          </View>
          <View style={[styles.toggleTrack, negotiable && styles.toggleTrackOn]}>
            <View style={[styles.toggleKnob, negotiable && styles.toggleKnobOn]} />
          </View>
        </Pressable>
      ) : null}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
});

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
    minHeight: 44,
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
    color: color.primaryText,
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
