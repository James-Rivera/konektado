import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  FloatingOnboardingInput,
  OnboardingButton,
  OnboardingFormScaffold,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

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
    if (!localFirst.trim() || !localLast.trim() || !localBirthdate.trim()) {
      Alert.alert('Add your details', 'First name, last name, and date of birth are required.');
      return;
    }

    updateDraft({
      birthdate: localBirthdate,
      firstName: localFirst,
      lastName: localLast,
    });
    router.push('/(onboarding)/location');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="Make sure each detail matches official documents"
        onBack={() => router.back()}
        title="Enter your details">
        <FloatingOnboardingInput
          autoCapitalize="words"
          label="First Name"
          onChangeText={setLocalFirst}
          textContentType="givenName"
          value={localFirst}
        />
        <FloatingOnboardingInput
          autoCapitalize="words"
          label="Last Name"
          onChangeText={setLocalLast}
          textContentType="familyName"
          value={localLast}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDatePicker(true)}
          style={[styles.dateInput, localBirthdate ? styles.dateInputActive : undefined]}>
          <Text style={[styles.dateLabel, !localBirthdate ? styles.dateLabelHidden : undefined]}>Date of Birth</Text>
          <Text style={[styles.dateText, !localBirthdate ? styles.placeholder : undefined]}>{localBirthdate || 'Date of Birth'}</Text>
          <MaterialIcons color={onboardingColors.placeholder} name="calendar-today" size={22} />
        </Pressable>

        {showDatePicker ? (
          <DateTimePicker
            display="default"
            maximumDate={new Date()}
            mode="date"
            onChange={onDateChange}
            value={selectedDate}
          />
        ) : null}
      </OnboardingFormScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  dateInput: {
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateInputActive: {
    borderColor: '#FCC03B',
  },
  dateLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    left: 12,
    lineHeight: 12,
    position: 'absolute',
    top: 8,
  },
  dateLabelHidden: {
    opacity: 0,
  },
  dateText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 10,
  },
  placeholder: {
    color: onboardingColors.placeholder,
    paddingTop: 0,
  },
});
