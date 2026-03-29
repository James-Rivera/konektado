import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useOnboarding } from './onboarding-context';

export default function LocationStep() {
  const router = useRouter();
  const { draft, role, updateDraft } = useOnboarding();
  const [street, setStreet] = useState(draft.streetAddress);
  const [city] = useState(draft.city);
  const [barangay] = useState(draft.barangay);

  const next = () => {
    if (!city.trim()) {
      Alert.alert('Add your city', 'City is required.');
      return;
    }
    const isProvider = role === 'provider';

    updateDraft({
      streetAddress: street,
      city,
      barangay,
      ...(isProvider
        ? {}
        : {
            serviceType: '',
            hasCertifications: null,
            certificationDetails: '',
            wantsBarangayVerification: false,
            verificationNote: '',
            verificationFiles: [],
          }),
    });

    router.push(isProvider ? '/(onboarding)/job' : '/(onboarding)/review');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Where are you located?</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Street (optional)"
        value={street}
        onChangeText={setStreet}
      />
      <TextInput style={styles.inputDisabled} value={barangay} editable={false} />
      <TextInput style={styles.inputDisabled} value={city} editable={false} />

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
  inputDisabled: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    color: '#6b7280',
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
