import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/utils/supabase';

type Role = 'client' | 'provider';

export default function RoleScreen() {
  const [submitting, setSubmitting] = useState<Role | null>(null);

  const handleSelect = async (role: Role) => {
    setSubmitting(role);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) {
      setSubmitting(null);
      Alert.alert('Not signed in', 'Please sign in again to continue.');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userResult.user.id, email: userResult.user.email, role, active_role: role });

    if (profileError) {
      setSubmitting(null);
      Alert.alert('Could not save role', profileError.message);
      return;
    }

    // Track role in user_roles to allow dual roles and switching
    const { error: rolesError } = await supabase
      .from('user_roles')
      .upsert({ user_id: userResult.user.id, role, is_active: true }, { onConflict: 'user_id,role' });

    if (rolesError) {
      setSubmitting(null);
      Alert.alert('Saved profile but could not record role', rolesError.message);
      return;
    }

    await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userResult.user.id)
      .neq('role', role);

    setSubmitting(null);

    // Metadata sync is optional; layout guard relies on profiles/user_roles.
    supabase.auth
      .updateUser({ data: { role, app_role: role } })
      .then(({ error: metaError }) => {
        if (!metaError) return;
        Alert.alert('Role saved', 'Role was saved, but account metadata sync failed. You can continue.');
      })
      .catch(() => {});
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Choose your role</ThemedText>
      <ThemedText style={styles.subtitle}>You can change this later in Profile.</ThemedText>

      <View style={styles.cards}>
        <RoleCard
          title="Client"
          description="I need to find providers for a task."
          onPress={() => handleSelect('client')}
          loading={submitting === 'client'}
        />
        <RoleCard
          title="Provider"
          description="I offer services and want to get hired."
          onPress={() => handleSelect('provider')}
          loading={submitting === 'provider'}
        />
      </View>
    </ThemedView>
  );
}

function RoleCard({
  title,
  description,
  onPress,
  loading,
}: {
  title: string;
  description: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress} disabled={loading}>
      <ThemedText type="subtitle" style={styles.cardTitle}>{title}</ThemedText>
      <ThemedText style={styles.cardDescription}>{loading ? 'Saving...' : description}</ThemedText>
    </Pressable>
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
  },
  subtitle: {
    marginBottom: 16,
    color: '#6b7280',
  },
  cards: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardDescription: {
    color: '#4b5563',
  },
});
