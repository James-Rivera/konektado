import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createService } from '@/services/service-profile.service';

export default function CreateServiceScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [availability, setAvailability] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    setSaving(true);
    const result = await createService({
      category,
      title,
      description,
      availabilityText: availability,
      rateText: rate,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Could not create service', result.error);
      return;
    }

    Alert.alert('Service posted', 'Your service is now visible to nearby residents.');
    router.replace('/(tabs)/post');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Offer a service</ThemedText>
        <ThemedText style={styles.muted}>Show nearby residents what work you can do.</ThemedText>

        <Field label="Category" onChangeText={setCategory} placeholder="e.g. Cleaning" value={category} />
        <Field label="Service title" onChangeText={setTitle} placeholder="e.g. Home cleaning help" value={title} />
        <Field
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="Describe your service, tools, and experience"
          value={description}
        />
        <Field
          label="Availability"
          onChangeText={setAvailability}
          placeholder="e.g. Weekends, afternoons"
          value={availability}
        />
        <Field label="Rate" onChangeText={setRate} placeholder="e.g. Starts at PHP 500" value={rate} />

        <TouchableOpacity disabled={saving} onPress={onCreate} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText} type="defaultSemiBold">
            {saving ? 'Posting...' : 'Post service'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity disabled={saving} onPress={() => router.back()} style={styles.secondaryButton}>
          <ThemedText>Cancel</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

function Field({
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.input, multiline && styles.multiline]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 26,
  },
  muted: {
    color: '#6b7280',
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d1d5db',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#d1d5db',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
});
