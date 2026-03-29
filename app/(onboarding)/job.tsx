import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
      Alert.alert('Add your role', 'Service type or job category is required.');
      return;
    }

    const shouldShowCertifications = unique.some((job) => CERT_RECOMMENDED_JOBS.has(job));

    updateDraft({
      serviceType: unique.join(', '),
      ...(shouldShowCertifications ? {} : { hasCertifications: false, certificationDetails: '' }),
    });

    router.push(shouldShowCertifications ? '/(onboarding)/certifications' : '/(onboarding)/verification');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>What do you do?</ThemedText>
      <ThemedText style={styles.helper}>Select one or more services you can offer nearby.</ThemedText>

      <View style={styles.chipContainer}>
        {JOB_OPTIONS.map((job) => {
          const selected = selectedJobs.includes(job);
          return (
            <Pressable
              key={job}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleJob(job)}
            >
              <ThemedText style={selected ? styles.chipTextSelected : styles.chipText}>{job}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Other skill (optional), e.g., Appliance Repair"
        value={customSkill}
        onChangeText={setCustomSkill}
      />

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={next}>
          <ThemedText type="defaultSemiBold" style={styles.primaryText}>Continue</ThemedText>
        </TouchableOpacity>
      </View>
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
  helper: {
    color: '#6b7280',
    marginBottom: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  chipText: {
    color: '#374151',
  },
  chipTextSelected: {
    color: '#1d4ed8',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondary: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  primary: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
  },
});
