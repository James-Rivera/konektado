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
  const [purokSitio, setPurokSitio] = useState(draft.purokSitio);
  const [street, setStreet] = useState(draft.street);
  const [blockLot, setBlockLot] = useState(draft.blockLot);
  const [houseNumber, setHouseNumber] = useState(draft.houseNumber);
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    draft.preferredContactMethod || 'app_message',
  );
  const [city, setCity] = useState(draft.city);
  const [barangay, setBarangay] = useState(draft.barangay);

  const next = () => {
    if (!city.trim() || !barangay.trim() || !street.trim()) {
      Alert.alert('Add your address', 'City, barangay, and street are required.');
      return;
    }

    if (!blockLot.trim() && !houseNumber.trim()) {
      Alert.alert('Add your address', 'Block/lot or house number is needed for verification review.');
      return;
    }

    const privateAddress = [houseNumber, blockLot, street, purokSitio, barangay, city]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(', ');

    const needsTasteSetup = role === 'provider' || role === 'client';

    updateDraft({
      barangay: barangay.trim(),
      city: city.trim(),
      streetAddress: privateAddress,
      purokSitio: purokSitio.trim(),
      street: street.trim(),
      blockLot: blockLot.trim(),
      houseNumber: houseNumber.trim(),
      preferredContactMethod: preferredContactMethod.trim() || 'app_message',
      certificationDetails: '',
      hasCertifications: null,
      serviceType: '',
      verificationFiles: [],
      verificationNote: '',
      wantsBarangayVerification: false,
    });

    router.push(needsTasteSetup ? '/(onboarding)/job' : '/(onboarding)/review');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="Only your approximate location is shown publicly. House number and block/lot stay private."
        onBack={() => router.back()}
        title="Add your address">
        <ReadonlyField label="Province" value="Batangas" />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setCity} placeholder="City" value={city} />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setBarangay} placeholder="Barangay" value={barangay} />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setPurokSitio} placeholder="Purok/Sitio" value={purokSitio} />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setStreet} placeholder="Street" value={street} />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setBlockLot} placeholder="Block/Lot" value={blockLot} />
        <OnboardingTextInput autoCapitalize="words" onChangeText={setHouseNumber} placeholder="House number" value={houseNumber} />
        <OnboardingTextInput
          autoCapitalize="none"
          onChangeText={setPreferredContactMethod}
          placeholder="Preferred contact method"
          value={preferredContactMethod}
        />
      </OnboardingFormScaffold>
    </>
  );
}
