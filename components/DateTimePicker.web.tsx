import { useId, useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import { color } from '@/constants/theme';
import type { DateTimePickerProps } from '@/types/date-time-picker.types';
import { formatLocalDate, formatLocalTime, initialPickerValue, isPickerValueInRange, parseLocalDate, parseLocalTime } from '@/utils/date-time';

/** Browser controls are isolated here so native bundles never import DOM elements. */
export default function DateTimePicker({ label, mode, value, minimumDate, maximumDate, onSelect, onDismiss }: DateTimePickerProps) {
  const id = useId();
  const [initial] = useState(() => initialPickerValue(value, mode, minimumDate, maximumDate));
  const [draft, setDraft] = useState(() => mode === 'date' ? formatLocalDate(initial) : formatLocalTime(initial));
  const selected = mode === 'date' ? parseLocalDate(draft) : parseLocalTime(draft, initial);
  const valid = !!selected && isPickerValueInRange(selected, mode, minimumDate, maximumDate);

  return (
    <Modal transparent animationType="fade" accessibilityLabel={label} onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <form
                aria-labelledby={`${id}-label`}
                onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onDismiss(); } }}
                onSubmit={(event) => { event.preventDefault(); if (selected && valid) onSelect(selected); }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                <label id={`${id}-label`} htmlFor={id} style={{ fontFamily: 'Satoshi-Bold, sans-serif', fontSize: 18, color: color.text }}>{label}</label>
                <input
                  autoFocus
                  required
                  id={id}
                  type={mode}
                  value={draft}
                  min={mode === 'date' && minimumDate ? formatLocalDate(minimumDate) : undefined}
                  max={mode === 'date' && maximumDate ? formatLocalDate(maximumDate) : undefined}
                  step={mode === 'time' ? 60 : undefined}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 46, padding: '10px 12px', border: '1px solid #AFAFAF', borderRadius: 12, fontFamily: 'Satoshi-Regular, sans-serif', fontSize: 16, color: color.text, backgroundColor: color.surface, colorScheme: 'light' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <button type="button" onClick={onDismiss} style={{ ...buttonStyle, backgroundColor: color.surfaceAlt, color: color.text }}>Cancel</button>
                  <button type="submit" disabled={!valid} style={{ ...buttonStyle, backgroundColor: color.primaryText, color: color.surface, opacity: valid ? 1 : 0.5 }}>Done</button>
                </div>
              </form>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const buttonStyle = { border: 0, borderRadius: 12, padding: '12px 20px', minHeight: 44, fontFamily: 'Satoshi-Medium, sans-serif', fontSize: 16, cursor: 'pointer' } as const;
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'rgba(17,17,17,0.34)' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: color.surface, borderRadius: 16 },
  content: { padding: 20 },
});
