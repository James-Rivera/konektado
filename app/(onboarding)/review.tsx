import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useOnboarding } from './onboarding-context';

export default function ReviewStep() {
  const router = useRouter();
  const { draft, role, saveProfile, saving } = useOnboarding();
  const isProvider = role === 'provider';

  const submit = async () => {
    await saveProfile({ requiresCertificationReview: isProvider && !!draft.hasCertifications });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Review your info</ThemedText>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Name</ThemedText>
        <ThemedText>{draft.firstName} {draft.lastName}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Birthdate</ThemedText>
        <ThemedText>{draft.birthdate || '—'}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">Location</ThemedText>
        <ThemedText>{draft.streetAddress || '—'}, {draft.city || '—'}</ThemedText>
      </View>

      {isProvider ? (
        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Job</ThemedText>
          <ThemedText>{draft.serviceType || '—'}</ThemedText>
        </View>
      ) : null}

      {isProvider ? (
        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Certifications</ThemedText>
          <ThemedText>
            {draft.hasCertifications ? draft.certificationDetails || 'Provided' : 'None'}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={submit} disabled={saving}>
          <ThemedText type="defaultSemiBold" style={styles.primaryText}>
            {saving ? 'Saving...' : 'Submit'}
          </ThemedText>
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
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
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
