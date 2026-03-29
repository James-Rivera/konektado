import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfile, type ProfileRecord } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, error, refresh } = useProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthdate: '',
    streetAddress: '',
    city: '',
    serviceType: '',
    phone: '',
    about: '',
    availability: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.first_name ?? profile.full_name?.split(' ')[0] ?? '',
      lastName: profile.last_name ?? profile.full_name?.split(' ').slice(1).join(' ') ?? '',
      birthdate: profile.birthdate ?? '',
      streetAddress: profile.street_address ?? '',
      city: profile.city ?? '',
      serviceType: profile.service_type ?? '',
      phone: profile.phone ?? '',
      about: profile.about ?? '',
      availability: profile.availability ?? '',
    });
  }, [profile]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const onSave = async () => {
    if (!profile) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Missing name', 'Please enter both first and last name.');
      return;
    }

    if (form.birthdate && isNaN(Date.parse(form.birthdate))) {
      Alert.alert('Invalid birthdate', 'Birthdate must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    const updates: Record<string, any> = {
      id: profile.id,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      birthdate: form.birthdate ? form.birthdate : null,
      street_address: form.streetAddress.trim() || null,
      city: form.city.trim() || null,
      phone: form.phone.trim() || null,
      about: form.about.trim() || null,
      availability: form.availability.trim() || null,
    };

    const { error: updateError } = await supabase.from('profiles').upsert(updates);
    if (updateError) {
      setSaving(false);
      Alert.alert('Unable to save profile', updateError.message);
      return;
    }

    const { data: providerRoleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .eq('role', 'provider')
      .limit(1);

    const hasProviderRole =
      (providerRoleRows?.length ?? 0) > 0 ||
      profile.active_role === 'provider' ||
      profile.role === 'provider';

    if (hasProviderRole) {
      const { error: providerProfileError } = await supabase.from('provider_profiles').upsert({
        user_id: profile.id,
        service_type: form.serviceType.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (providerProfileError) {
        setSaving(false);
        Alert.alert('Profile saved, but provider details failed to save', providerProfileError.message);
        return;
      }
    }

    setSaving(false);

    setEditing(false);
    refresh();
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  if (!profile) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="title">No profile data</ThemedText>
        {error ? <ThemedText style={styles.helper}>{error}</ThemedText> : null}
        <TouchableOpacity style={styles.button} onPress={refresh}>
          <ThemedText style={styles.buttonText}>Retry</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onSignOut}>
          <ThemedText style={styles.secondaryButtonText}>Sign out</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ThemedView style={styles.card}>
        <ThemedText type="title">{getDisplayName(profile)}</ThemedText>
        <ThemedText style={styles.muted}>{profile.email}</ThemedText>
        <ThemedText style={styles.badge}>{profile.role?.toUpperCase() ?? 'UNSET'}</ThemedText>
        <View style={styles.statusRow}>
          {profile.has_certifications || profile.certification_status === 'approved' ? (
            <ThemedText style={styles.certified}>Certified Skills</ThemedText>
          ) : null}
          {profile.verified_at ? (
            <ThemedText style={styles.verified}>Barangay Verified</ThemedText>
          ) : (
            <ThemedText style={styles.helper}>Not verified yet</ThemedText>
          )}
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <SectionRow label="First name" value={profile.first_name ?? 'Not set'} />
        <SectionRow label="Last name" value={profile.last_name ?? 'Not set'} />
        <SectionRow label="Birthdate" value={profile.birthdate ?? 'Not set'} />
        <SectionRow label="Age" value={getAgeLabel(profile.birthdate)} />
        <SectionRow label="Barangay" value={profile.barangay ?? 'Unknown'} />
        <SectionRow
          label="Street"
          value={profile.street_address ?? 'Not provided'}
        />
        <SectionRow label="City" value={profile.city ?? 'Not set'} />
        <SectionRow label="Services" value={profile.service_type ?? 'Not set'} />
        <SectionRow label="Phone" value={profile.phone ?? 'Not set'} />
        <SectionRow label="Availability" value={profile.availability ?? 'Not set'} />
        <SectionRow label="About" value={profile.about ?? 'Tell people about yourself'} multiline />
      </ThemedView>

      {editing ? (
        <View style={styles.form}>
          <Field label="First name">
            <TextInput
              style={styles.input}
              value={form.firstName}
              onChangeText={(text) => setForm((prev) => ({ ...prev, firstName: text }))}
              autoCapitalize="words"
            />
          </Field>
          <Field label="Last name">
            <TextInput
              style={styles.input}
              value={form.lastName}
              onChangeText={(text) => setForm((prev) => ({ ...prev, lastName: text }))}
              autoCapitalize="words"
            />
          </Field>
          <Field label="Birthdate (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              value={form.birthdate}
              onChangeText={(text) => setForm((prev) => ({ ...prev, birthdate: text }))}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
          <Field label="Street / Sitio">
            <TextInput
              style={styles.input}
              value={form.streetAddress}
              onChangeText={(text) => setForm((prev) => ({ ...prev, streetAddress: text }))}
            />
          </Field>
          <Field label="City / Municipality">
            <TextInput
              style={styles.input}
              value={form.city}
              onChangeText={(text) => setForm((prev) => ({ ...prev, city: text }))}
            />
          </Field>
          <Field label="Services you offer">
            <TextInput
              style={styles.input}
              value={form.serviceType}
              onChangeText={(text) => setForm((prev) => ({ ...prev, serviceType: text }))}
              placeholder="e.g. IT support, cleaning"
            />
          </Field>
          <Field label="Phone number">
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm((prev) => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </Field>
          <Field label="Availability">
            <TextInput
              style={styles.input}
              value={form.availability}
              onChangeText={(text) => setForm((prev) => ({ ...prev, availability: text }))}
              placeholder="Weekdays 9am-5pm"
            />
          </Field>
          <Field label="About you">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.about}
              onChangeText={(text) => setForm((prev) => ({ ...prev, about: text }))}
              placeholder="Share experience, certifications, etc."
              multiline
            />
          </Field>
          <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
            <ThemedText style={styles.buttonText}>{saving ? 'Saving...' : 'Save changes'}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              setEditing(false);
              refresh();
            }}
            disabled={saving}
          >
            <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => setEditing(true)}>
          <ThemedText style={styles.buttonText}>Edit profile</ThemedText>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={onSignOut}>
        <ThemedText style={styles.dangerButtonText}>Sign out</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.row, multiline && styles.rowMultiline]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function getDisplayName(profile: ProfileRecord | null) {
  if (!profile) return 'Unnamed user';
  const joined = [profile.first_name, profile.last_name]
    .filter((part) => Boolean(part && part.trim()))
    .join(' ')
    .trim();
  return joined || profile.full_name || 'Unnamed user';
}

function getAgeLabel(birthdate?: string | null) {
  if (!birthdate || isNaN(Date.parse(birthdate))) {
    return 'Not available';
  }
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return `${age} years old`;
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  verified: {
    color: '#059669',
    fontWeight: '600',
  },
  certified: {
    color: '#166534',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  section: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowMultiline: {
    flexDirection: 'column',
  },
  rowValue: {
    color: '#4b5563',
  },
  form: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
  },
  dangerButtonText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  helper: {
    color: '#6b7280',
  },
  muted: {
    color: '#6b7280',
  },
});
