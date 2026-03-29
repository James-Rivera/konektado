import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

function CreateJobScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(profile?.city || '');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!profile?.id) {
      Alert.alert('Not signed in', 'Please sign in again to continue.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a job title.');
      return;
    }

    const normalizedBudget = budget.trim() ? Number(budget) : null;
    if (budget.trim() && Number.isNaN(normalizedBudget)) {
      Alert.alert('Invalid budget', 'Budget must be a number.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('jobs').insert({
      owner_id: profile.id,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      budget: normalizedBudget,
      status: 'open',
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not create job', error.message);
      return;
    }

    Alert.alert('Job posted', 'Your job is now live.');
    router.replace('/(tabs)/explore');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Post a new job</ThemedText>
        <ThemedText style={styles.muted}>Create a listing so providers can apply.</ThemedText>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Title</ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="e.g. House wiring repair"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Description</ThemedText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multiline]}
            placeholder="Share details, timeline, and materials if needed"
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Location</ThemedText>
          <TextInput
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            placeholder="Barangay / City"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold">Budget (PHP)</ThemedText>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            style={styles.input}
            placeholder="e.g. 2500"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onCreate} disabled={saving}>
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            {saving ? 'Posting...' : 'Post job'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} disabled={saving}>
          <ThemedText>Cancel</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 26,
  },
  muted: {
    color: '#6b7280',
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default CreateJobScreen;
