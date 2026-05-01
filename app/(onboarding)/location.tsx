import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  OnboardingButton,
  OnboardingFormScaffold,
  OnboardingTextInput,
  ReadonlyField,
} from '@/components/onboarding/FigmaOnboarding';

import { useOnboarding } from './onboarding-context';

export default function LocationStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const [street, setStreet] = useState(draft.streetAddress);
  const [city, setCity] = useState(draft.city);
  const [barangay, setBarangay] = useState(draft.barangay);

  const next = () => {
    if (!city.trim() || !barangay.trim()) {
      Alert.alert('Add your address', 'City and barangay are required.');
      return;
    }

    const isProvider = role === 'provider';

    updateDraft({
      barangay: barangay.trim(),
      city: city.trim(),
      streetAddress: street,
      ...(isProvider
        ? {}
        : {
            certificationDetails: '',
            hasCertifications: null,
            serviceType: '',
            verificationFiles: [],
            verificationNote: '',
            wantsBarangayVerification: false,
          }),
    });

    router.push(isProvider ? '/(onboarding)/job' : '/(onboarding)/review');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="Please input your address"
        onBack={() => router.back()}
        title="Add your address">
        <ReadonlyField label="Province" value="Batangas" />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setCity} placeholder="City" value={city} />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setBarangay} placeholder="Barangay" value={barangay} />
        <OnboardingTextInput
          autoCapitalize="words"
          onChangeText={setStreet}
          placeholder="Address line"
          value={street}
        />
      </OnboardingFormScaffold>
    </>
  );
}
