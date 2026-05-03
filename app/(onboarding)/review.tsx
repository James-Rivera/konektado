import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  CheckRow,
  OnboardingButton,
  OnboardingFormScaffold,
  ReviewField,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

import { useOnboarding } from './onboarding-context';

export default function ReviewStep() {
  const router = useRouter();
  const { draft, role, saveProfile, saving } = useOnboarding();
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [confirmedInfo, setConfirmedInfo] = useState(false);
  const offeredServices = [...draft.offeredServices, ...draft.customOfferedServices].join(', ');
  const neededServices = [...draft.neededServices, ...draft.customNeededServices].join(', ');

  const submit = async () => {
    if (!acceptedTerms || !confirmedInfo) {
      Alert.alert('Confirm your details', 'Please agree to the terms and confirm your information is correct.');
      return;
    }

    const saved = await saveProfile();
    if (saved) {
      router.replace('/(onboarding)/complete');
    }
  };

  const fullName = `${draft.firstName} ${draft.lastName}`.trim() || 'Not provided';
  const address = [
    draft.streetAddress.trim(),
    draft.barangay ? `Brgy. ${draft.barangay}` : '',
    [draft.city, 'Batangas'].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        currentStep={4}
        footer={<OnboardingButton label={saving ? 'Saving...' : 'Next'} loading={saving} onPress={submit} />}
        helper="Review your information before entering Konektado"
        onBack={() => router.back()}
        title="Almost there.">
        <View style={styles.reviewCard}>
          <ReviewField label="Full Name" value={fullName} />
          <ReviewField label="Address" multiline value={address || 'Not provided'} />
          <ReviewField label="Birthdate" value={draft.birthdate || 'Not provided'} />
          {role === 'provider' || role === 'both' ? (
            <ReviewField label="Offered services" value={offeredServices || 'Not provided'} />
          ) : null}
          {role === 'client' || role === 'both' ? (
            <ReviewField label="Needed services" value={neededServices || 'Not provided'} />
          ) : null}
        </View>

        <View style={styles.checks}>
          <CheckRow checked={acceptedTerms} onPress={() => setAcceptedTerms((value) => !value)}>
            I agree to the Terms of Use and Privacy Policy
          </CheckRow>
          <CheckRow checked={confirmedInfo} onPress={() => setConfirmedInfo((value) => !value)}>
            I confirm that the information I provided is correct
          </CheckRow>
        </View>
      </OnboardingFormScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  reviewCard: {
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  checks: {
    gap: 7,
    marginTop: 2,
  },
});
