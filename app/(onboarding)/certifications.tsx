import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import {
  OnboardingButton,
  OnboardingFormScaffold,
  OnboardingTextInput,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

import { useOnboarding } from './onboarding-context';

export default function CertificationsStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const [hasCerts, setHasCerts] = useState(draft.hasCertifications ?? false);
  const [details, setDetails] = useState(draft.certificationDetails);

  useEffect(() => {
    if (role === 'client') {
      router.replace('/(onboarding)/review');
    }
  }, [role, router]);

  const next = () => {
    updateDraft({
      certificationDetails: details,
      hasCertifications: hasCerts,
    });
    router.push('/(onboarding)/verification');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="This is optional, but TESDA or related proof can help clients trust your work."
        onBack={() => router.back()}
        title="Certified skills">
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>I have certifications</Text>
            <Text style={styles.toggleDescription}>TESDA, trade certificates, or proof of related experience</Text>
          </View>
          <Switch
            onValueChange={setHasCerts}
            thumbColor={hasCerts ? onboardingColors.brandYellow : '#F4F4F4'}
            trackColor={{ false: '#D5D7DA', true: '#F5F5EF' }}
            value={hasCerts}
          />
        </View>

        {hasCerts ? (
          <OnboardingTextInput
            multiline
            onChangeText={setDetails}
            placeholder="Add TESDA NC level or related experience"
            style={styles.multilineInput}
            textAlignVertical="top"
            value={details}
          />
        ) : null}
      </OnboardingFormScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    alignItems: 'center',
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  toggleDescription: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  multilineInput: {
    height: 112,
    paddingTop: 12,
  },
});
