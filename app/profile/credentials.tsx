import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyProfilePanel, ProfileHistoryCard } from '@/components/profile/ProfilePrimitives';
import { useFeedback } from '@/components/FeedbackProvider';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { createCredential, listMyCredentials } from '@/services/credential.service';
import type {
  CredentialSummary,
  CredentialType,
  CreateCredentialInput,
} from '@/types/marketplace.types';

const CREDENTIAL_TYPES: { value: CredentialType; label: string }[] = [
  { value: 'tesda', label: 'TESDA' },
  { value: 'training_certificate', label: 'Training' },
  { value: 'barangay_certificate', label: 'Barangay' },
  { value: 'work_proof', label: 'Work proof' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Other' },
];

type PickedFile = NonNullable<CreateCredentialInput['file']>;

export default function ProfileCredentialsScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<CredentialType>('tesda');
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);

  const refresh = async () => {
    setLoading(true);
    const result = await listMyCredentials();
    setLoading(false);

    if (result.error || !result.data) {
      Alert.alert('Credentials', result.error ?? 'Could not load credentials.');
      return;
    }

    setCredentials(result.data);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*', 'application/pdf'],
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setFile({
      uri: asset.uri,
      name: asset.name ?? null,
      mimeType: asset.mimeType ?? null,
    });
  };

  const saveCredential = async () => {
    if (!title.trim()) {
      Alert.alert('Credential title', 'Enter the credential or proof name.');
      return;
    }

    setSaving(true);
    const result = await createCredential({
      type,
      title,
      issuer,
      issuedAt,
      file,
    });
    setSaving(false);

    if (result.error || !result.data) {
      Alert.alert('Credentials', result.error ?? 'Could not save this credential.');
      return;
    }

    setTitle('');
    setIssuer('');
    setIssuedAt('');
    setFile(null);
    setCredentials((current) => [result.data as CredentialSummary, ...current]);
    showSuccessToast('Credential added');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <MaterialIcons color={color.text} name="chevron-left" size={30} />
          </Pressable>
          <Text style={styles.headerTitle}>Credentials</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <CredentialSection>
            <View style={styles.infoBox}>
              <MaterialIcons color={color.verificationBlue} name="workspace-premium" size={22} />
              <Text style={styles.infoText}>
                Credentials are optional trust boosters. They do not block profile completion, publishing, or matching.
              </Text>
            </View>
          </CredentialSection>

          <CredentialSection>
            <Text style={styles.sectionTitle}>Add credential</Text>
            <View style={styles.chipWrap}>
              {CREDENTIAL_TYPES.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === option.value }}
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={({ pressed }) => [styles.chip, type === option.value && styles.chipActive, pressed && styles.pressed]}>
                  <Text style={[styles.chipText, type === option.value && styles.chipTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Title" onChangeText={setTitle} placeholder="Example: TESDA Housekeeping NC II" value={title} />
            <Field label="Issuer" onChangeText={setIssuer} placeholder="Example: TESDA, training center" value={issuer} />
            <Field label="Issue date" onChangeText={setIssuedAt} placeholder="YYYY-MM-DD (optional)" value={issuedAt} />
            <Pressable
              accessibilityRole="button"
              onPress={pickFile}
              style={({ pressed }) => [styles.filePicker, pressed && styles.pressed]}>
              <MaterialIcons color={color.verificationBlue} name="attach-file" size={20} />
              <Text numberOfLines={1} style={styles.fileText}>
                {file?.name || 'Attach proof file (optional)'}
              </Text>
            </Pressable>
            <PrimaryButton icon="add" label="Save credential" loading={saving} onPress={saveCredential} />
          </CredentialSection>

          <CredentialSection>
            <Text style={styles.sectionTitle}>Saved credentials</Text>
            {loading ? (
              <>
                <Skeleton height={74} width="100%" borderRadius={radius.lg} />
                <Skeleton height={74} width="100%" borderRadius={radius.lg} />
              </>
            ) : credentials.length ? (
              credentials.map((credential) => (
                <ProfileHistoryCard
                  description={credential.issuer ? `Issued by ${credential.issuer}` : 'Optional proof'}
                  footerRight={formatCredentialStatus(credential.status)}
                  key={credential.id}
                  meta={formatCredentialType(credential.type)}
                  rightLabel={formatShortDate(credential.createdAt)}
                  title={credential.title}
                />
              ))
            ) : (
              <EmptyProfilePanel
                icon="workspace-premium"
                message="Add certificates or proof of training when you have them."
                title="No credentials yet"
              />
            )}
          </CredentialSection>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={color.textSubtle}
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
      />
    </View>
  );
}

function CredentialSection({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

function formatCredentialStatus(status: CredentialSummary['status']) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Needs update';
  return 'Pending review';
}

function formatCredentialType(type: CredentialType) {
  const match = CREDENTIAL_TYPES.find((option) => option.value === type);
  return match?.label ?? 'Credential';
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 55,
    paddingHorizontal: space.xl,
  },
  headerIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  content: {
    gap: space.sm,
    paddingBottom: space['3xl'],
  },
  infoBox: {
    alignItems: 'flex-start',
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  infoText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  section: {
    backgroundColor: color.background,
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  field: {
    gap: space.xs,
  },
  label: {
    ...typography.caption,
    color: color.textMuted,
  },
  input: {
    ...typography.body,
    backgroundColor: color.background,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  inputFocused: {
    borderColor: color.verificationBlue,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  chipActive: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  chipTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  filePicker: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 46,
    paddingHorizontal: space.md,
  },
  fileText: {
    ...typography.body,
    color: color.text,
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
