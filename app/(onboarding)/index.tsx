import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useOnboarding } from './onboarding-context';

export default function BasicsStep() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboarding();
  const [localFirst, setLocalFirst] = useState(draft.firstName);
  const [localLast, setLocalLast] = useState(draft.lastName);
  const [localBirthdate, setLocalBirthdate] = useState(draft.birthdate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDate = localBirthdate ? new Date(localBirthdate) : new Date('2000-01-01');

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (!date) return;
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    setLocalBirthdate(`${year}-${month}-${day}`);
  };

  const next = () => {
    if (!localFirst.trim() || !localLast.trim()) {
      Alert.alert('Add your name', 'First and last name are required.');
      return;
    }
    updateDraft({
      firstName: localFirst,
      lastName: localLast,
      birthdate: localBirthdate,
    });
    router.push('/(onboarding)/location');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Tell us about you</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="First name"
        value={localFirst}
        onChangeText={setLocalFirst}
      />
      <TextInput
        style={styles.input}
        placeholder="Last name"
        value={localLast}
        onChangeText={setLocalLast}
      />

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold">Birthdate</ThemedText>
        <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <ThemedText>{localBirthdate || 'Select your birthdate'}</ThemedText>
        </Pressable>
        <ThemedText style={styles.helper}>Use the calendar picker for faster and accurate input.</ThemedText>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      ) : null}

      <TouchableOpacity style={styles.primary} onPress={next}>
        <ThemedText type="defaultSemiBold" style={styles.primaryText}>Continue</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  fieldGroup: {
    gap: 6,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  helper: {
    color: '#6b7280',
    fontSize: 12,
  },
  primary: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
  },
});
