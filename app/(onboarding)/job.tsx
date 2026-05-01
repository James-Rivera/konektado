import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  OnboardingButton,
  OnboardingFormScaffold,
  OnboardingTextInput,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

import { useOnboarding } from './onboarding-context';

const JOB_OPTIONS = [
  'Cleaner',
  'Electrician',
  'Plumber',
  'Construction Worker',
  'Mason',
  'PC Repair',
  'Carpenter',
  'Appliance Repair',
  'Painter',
  'Tutor',
  'Gardener',
  'Welder',
  'Mechanic',
  'Delivery Rider',
  'House Helper',
];

const CERT_RECOMMENDED_JOBS = new Set([
  'Electrician',
  'Plumber',
  'Construction Worker',
  'Mason',
  'PC Repair',
  'Carpenter',
  'Appliance Repair',
  'Welder',
  'Mechanic',
]);

export default function JobStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const [selectedJobs, setSelectedJobs] = useState<string[]>(
    draft.serviceType
      ? draft.serviceType
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  );
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    if (role === 'client') {
      router.replace('/(onboarding)/review');
    }
  }, [role, router]);

  const toggleJob = (job: string) => {
    setSelectedJobs((prev) =>
      prev.includes(job) ? prev.filter((value) => value !== job) : [...prev, job]
    );
  };

  const next = () => {
    const customValue = customSkill.trim();
    const merged = customValue ? [...selectedJobs, customValue] : selectedJobs;
    const unique = Array.from(new Set(merged));

    if (!unique.length) {
      Alert.alert('Add your work', 'Select one or more services you can offer nearby.');
      return;
    }

    const shouldShowCertifications = unique.some((job) => CERT_RECOMMENDED_JOBS.has(job));

    updateDraft({
      serviceType: unique.join(', '),
      ...(shouldShowCertifications ? {} : { certificationDetails: '', hasCertifications: false }),
    });

    router.push(shouldShowCertifications ? '/(onboarding)/certifications' : '/(onboarding)/verification');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        contentStyle={styles.content}
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="Select one or more services you can offer nearby"
        onBack={() => router.back()}
        title="What do you do?">
        <View style={styles.chipContainer}>
          {JOB_OPTIONS.map((job) => {
            const selected = selectedJobs.includes(job);
            return (
              <Pressable
                key={job}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => toggleJob(job)}
                style={[styles.chip, selected ? styles.chipSelected : undefined]}>
                <Text style={[styles.chipText, selected ? styles.chipTextSelected : undefined]}>{job}</Text>
              </Pressable>
            );
          })}
        </View>

        <OnboardingTextInput
          onChangeText={setCustomSkill}
          placeholder="Other skill (optional)"
          value={customSkill}
        />
      </OnboardingFormScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 44,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#F5F5EF',
    borderColor: onboardingColors.brandYellow,
  },
  chipText: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  chipTextSelected: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
  },
});
