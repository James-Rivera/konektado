import NativeDateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Button, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, space } from '@/constants/theme';
import type { DateTimePickerProps } from '@/types/date-time-picker.types';
import { initialPickerValue, isPickerValueInRange } from '@/utils/date-time';

export default function DateTimePicker({ label, mode, value, minimumDate, maximumDate, onSelect, onDismiss }: DateTimePickerProps) {
  const [draft, setDraft] = useState(() => initialPickerValue(value, mode, minimumDate, maximumDate));
  const picker = (
    <NativeDateTimePicker
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      maximumDate={mode === 'date' ? maximumDate : undefined}
      minimumDate={mode === 'date' ? minimumDate : undefined}
      mode={mode}
      themeVariant="light"
      value={draft}
      onChange={(event, selected) => {
        if (event.type !== 'set' || !selected) {
          onDismiss();
          return;
        }
        if (Platform.OS === 'ios') setDraft(selected);
        else if (isPickerValueInRange(selected, mode, minimumDate, maximumDate)) onSelect(selected);
        else onDismiss();
      }}
    />
  );

  if (Platform.OS !== 'ios') return picker;

  return (
    <Modal transparent animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>{label}</Text>
            {picker}
            <View style={styles.actions}>
              <Button title="Cancel" onPress={onDismiss} color={color.textMuted} />
              <Button title="Done" onPress={() => onSelect(draft)} disabled={!isPickerValueInRange(draft, mode, minimumDate, maximumDate)} color={color.primaryText} />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,17,17,0.34)' },
  sheet: { backgroundColor: color.surface, borderRadius: 16, maxHeight: '90%', margin: space.md },
  content: { padding: space.lg },
  title: { color: color.text, fontFamily: 'Satoshi-Bold', fontSize: 18 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
});
