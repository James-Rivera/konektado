import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
    OnboardingButton,
    OnboardingFormScaffold,
    OnboardingTextInput,
    onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

import { useOnboarding } from './onboarding-context';

const SERVICE_OPTIONS = [
  'Cleaning',
  'Laundry',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Appliance Repair',
  'PC Repair',
  'Phone Setup',
  'Tutoring',
  'Gardening',
  'Painting',
  'Delivery',
  'Cooking',
  'House Helper',
  'Construction',
];

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseCustomServices(value: string) {
  return uniqueValues(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export default function JobStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const collectsOffered = role === 'provider';
  const collectsNeeded = role === 'client';
  const [offeredServices, setOfferedServices] = useState<string[]>(draft.offeredServices);
  const [neededServices, setNeededServices] = useState<string[]>(draft.neededServices);
  const [customOffered, setCustomOffered] = useState(draft.customOfferedServices.join(', '));
  const [customNeeded, setCustomNeeded] = useState(draft.customNeededServices.join(', '));

  const toggleOffered = (service: string) => {
    setOfferedServices((prev) =>
      prev.includes(service) ? prev.filter((value) => value !== service) : [...prev, service],
    );
  };

  const toggleNeeded = (service: string) => {
    setNeededServices((prev) =>
      prev.includes(service) ? prev.filter((value) => value !== service) : [...prev, service],
    );
  };

  const next = () => {
    const customOfferedServices = parseCustomServices(customOffered);
    const customNeededServices = parseCustomServices(customNeeded);
    const finalOffered = uniqueValues([...offeredServices, ...customOfferedServices]);
    const finalNeeded = uniqueValues([...neededServices, ...customNeededServices]);

    if (collectsOffered && !finalOffered.length) {
      Alert.alert('Add your services', 'Select one or more services you can offer nearby.');
      return;
    }

    if (collectsNeeded && !finalNeeded.length) {
      Alert.alert('Add what you need', 'Select one or more types of help you may need nearby.');
      return;
    }

    updateDraft({
      offeredServices,
      neededServices,
      customOfferedServices,
      customNeededServices,
      serviceType: finalOffered.join(', '),
      certificationDetails: '',
      hasCertifications: null,
      verificationFiles: [],
      verificationNote: '',
      wantsBarangayVerification: false,
    });

    router.push('/(onboarding)/review');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        contentStyle={styles.content}
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="Choose a few services so Home can show better jobs and workers first."
        onBack={() => router.back()}
        title={
          role === 'client'
            ? 'What help do you need nearby?'
            : 'What services can you offer?'
        }>
        {collectsOffered ? (
          <ServiceSection
            customLabel="Other service you can offer (optional)"
            customValue={customOffered}
            onCustomChange={setCustomOffered}
            onToggle={toggleOffered}
            selected={offeredServices}
            title="What services can you offer?"
          />
        ) : null}

        {collectsNeeded ? (
          <ServiceSection
            customLabel="Other help you need (optional)"
            customValue={customNeeded}
            onCustomChange={setCustomNeeded}
            onToggle={toggleNeeded}
            selected={neededServices}
            title="What help do you need nearby?"
          />
        ) : null}
      </OnboardingFormScaffold>
    </>
  );
}

function ServiceSection({
  customLabel,
  customValue,
  onCustomChange,
  onToggle,
  selected,
  title,
}: {
  customLabel: string;
  customValue: string;
  onCustomChange: (value: string) => void;
  onToggle: (service: string) => void;
  selected: string[];
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipContainer}>
        {SERVICE_OPTIONS.map((service) => {
          const isSelected = selected.includes(service);
          return (
            <Pressable
              key={service}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(service)}
              style={[styles.chip, isSelected ? styles.chipSelected : undefined]}>
              <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : undefined]}>
                {service}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <OnboardingTextInput
        onChangeText={onCustomChange}
        placeholder={customLabel}
        value={customValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingTop: 36,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
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
