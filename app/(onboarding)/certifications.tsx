import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
      hasCertifications: hasCerts,
      certificationDetails: details,
    });
    router.push('/(onboarding)/verification');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Certified skills</ThemedText>
      <ThemedText style={styles.helper}>
        This is optional, but adding TESDA or related certification helps you stand out.
      </ThemedText>

      <View style={styles.rowBetween}>
        <ThemedText>I have TESDA or other certifications</ThemedText>
        <Switch value={hasCerts} onValueChange={setHasCerts} />
      </View>
      {hasCerts && (
        <TextInput
          style={styles.input}
          placeholder="Add TESDA NC level or related experience (optional but helps clients trust you)"
          multiline
          value={details}
          onChangeText={setDetails}
        />
      )}

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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helper: {
    color: '#6b7280',
    marginBottom: 4,
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
