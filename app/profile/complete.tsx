import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { NoticeBanner } from '@/components/NoticeBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  getMyProfileCompletion,
  saveCoreProfile,
  saveHiringProfile,
  saveWorkProfile,
} from '@/services/profile-completion.service';
import type {
  CoreProfileInput,
  HiringProfileInput,
  ProfileCompletionMode,
  ProfileCompletionStatus,
  WorkProfileInput,
} from '@/types/profile.types';

type FormMode = ProfileCompletionMode;

const emptyCore: CoreProfileInput = {
  firstName: '',
  lastName: '',
  barangay: '',
  city: '',
  about: '',
  availability: '',
};

const emptyWork: WorkProfileInput = {
  headline: '',
  bio: '',
  offeredServices: [],
  serviceArea: '',
  availability: '',
  rateText: '',
};

const emptyHiring: HiringProfileInput = {
  headline: '',
  bio: '',
  neededServices: [],
  preferredSchedule: '',
  budgetPreference: '',
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeMode(value: string | string[] | undefined): FormMode {
  const mode = getParamValue(value);
  if (mode === 'work' || mode === 'hiring' || mode === 'core') return mode;
  return 'core';
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const initialMode = useMemo(() => normalizeMode(params.mode), [params.mode]);
  const { refresh } = useProfile();
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ProfileCompletionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [core, setCore] = useState<CoreProfileInput>(emptyCore);
  const [work, setWork] = useState<WorkProfileInput>(emptyWork);
  const [workServicesText, setWorkServicesText] = useState('');
  const [hiring, setHiring] = useState<HiringProfileInput>(emptyHiring);
  const [hiringServicesText, setHiringServicesText] = useState('');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    let active = true;

    getMyProfileCompletion().then((result) => {
      if (!active) return;

      if (result.error || !result.data) {
        setError(result.error ?? 'Could not load profile details.');
      } else {
        hydrateForms(result.data);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const hydrateForms = (nextStatus: ProfileCompletionStatus) => {
    setStatus(nextStatus);
    setCore({
      firstName: nextStatus.core.firstName,
      lastName: nextStatus.core.lastName,
      barangay: nextStatus.core.barangay,
      city: nextStatus.core.city,
      about: nextStatus.core.about,
      availability: nextStatus.core.availability,
    });
    setWork({
      headline: nextStatus.work.headline,
      bio: nextStatus.work.bio,
      offeredServices: nextStatus.work.offeredServices,
      serviceArea: nextStatus.work.serviceArea,
      availability: nextStatus.work.availability,
      rateText: nextStatus.work.rateText,
    });
    setWorkServicesText(nextStatus.work.offeredServices.join(', '));
    setHiring({
      headline: nextStatus.hiring.headline,
      bio: nextStatus.hiring.bio,
      neededServices: nextStatus.hiring.neededServices,
      preferredSchedule: nextStatus.hiring.preferredSchedule,
      budgetPreference: nextStatus.hiring.budgetPreference,
    });
    setHiringServicesText(nextStatus.hiring.neededServices.join(', '));
  };

  const save = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);

    const result =
      mode === 'core'
        ? await saveCoreProfile(core)
        : mode === 'work'
          ? await saveWorkProfile({ ...work, offeredServices: parseList(workServicesText) })
          : await saveHiringProfile({ ...hiring, neededServices: parseList(hiringServicesText) });

    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Could not save profile.');
      return;
    }

    hydrateForms(result.data);
    await refresh();

    Alert.alert('Profile updated', getSuccessMessage(mode), [
      { text: 'Continue', onPress: () => router.back() },
    ]);
  };

  const currentMeta = getModeMeta(mode);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <MaterialIcons color={color.text} name="chevron-left" size={30} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{currentMeta.title}</Text>
            <Text style={styles.headerSubtitle}>{currentMeta.subtitle}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <CompleteProfileSkeleton />
          ) : (
            <>
              <View style={styles.modeTabs}>
                <ModeButton label="Core" mode="core" selected={mode === 'core'} onPress={setMode} />
                <ModeButton label="Work" mode="work" selected={mode === 'work'} onPress={setMode} />
                <ModeButton label="Hiring" mode="hiring" selected={mode === 'hiring'} onPress={setMode} />
              </View>

              {error ? (
                <NoticeBanner message={error} title="Profile needs attention" variant="warning" />
              ) : null}

              {status?.photoRecommended ? (
                <NoticeBanner
                  message="A public profile photo is recommended later, but verification selfie or ID files stay private and are never reused here."
                  title="Photo is optional for now"
                  variant="info"
                />
              ) : null}

              {mode !== 'core' && status && !status.coreComplete ? (
                <NoticeBanner
                  message="Finish your Core Profile first so neighbors can see who they are talking to."
                  title="Core Profile comes first"
                  variant="warning"
                />
              ) : null}

              {mode === 'core' ? (
                <CoreForm value={core} onChange={setCore} />
              ) : mode === 'work' ? (
                <WorkForm
                  servicesText={workServicesText}
                  value={work}
                  onChange={setWork}
                  onServicesTextChange={setWorkServicesText}
                />
              ) : (
                <HiringForm
                  servicesText={hiringServicesText}
                  value={hiring}
                  onChange={setHiring}
                  onServicesTextChange={setHiringServicesText}
                />
              )}

              <View style={styles.footerCard}>
                <Text style={styles.footerTitle}>Why this matters</Text>
                <Text style={styles.footerText}>
                  Verification says this is a real resident. Profile completion gives the other person enough public context before they message, hire, or accept work.
                </Text>
                <PrimaryButton
                  icon="check-circle"
                  label={saving ? 'Saving...' : currentMeta.buttonLabel}
                  loading={saving}
                  onPress={save}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CoreForm({
  value,
  onChange,
}: {
  value: CoreProfileInput;
  onChange: (value: CoreProfileInput) => void;
}) {
  return (
    <View style={styles.formCard}>
      <Field
        label="First name"
        placeholder="Juan"
        value={value.firstName}
        onChangeText={(firstName) => onChange({ ...value, firstName })}
      />
      <Field
        label="Last name"
        placeholder="Dela Cruz"
        value={value.lastName}
        onChangeText={(lastName) => onChange({ ...value, lastName })}
      />
      <Field
        label="Barangay"
        placeholder="Barangay San Pedro"
        value={value.barangay}
        onChangeText={(barangay) => onChange({ ...value, barangay })}
      />
      <Field
        label="City or municipality"
        placeholder="San Pedro"
        value={value.city}
        onChangeText={(city) => onChange({ ...value, city })}
      />
      <Field
        label="Public intro"
        multiline
        placeholder="A short, friendly intro that helps neighbors feel safe starting a conversation."
        value={value.about}
        onChangeText={(about) => onChange({ ...value, about })}
      />
      <Field
        label="Availability"
        multiline
        placeholder="Example: Weekdays after 5 PM, weekends by request"
        value={value.availability}
        onChangeText={(availability) => onChange({ ...value, availability })}
      />
    </View>
  );
}

function WorkForm({
  servicesText,
  value,
  onChange,
  onServicesTextChange,
}: {
  servicesText: string;
  value: WorkProfileInput;
  onChange: (value: WorkProfileInput) => void;
  onServicesTextChange: (value: string) => void;
}) {
  return (
    <View style={styles.formCard}>
      <Field
        label="Work headline"
        placeholder="Reliable home repair help nearby"
        value={value.headline}
        onChangeText={(headline) => onChange({ ...value, headline })}
      />
      <Field
        label="Work bio"
        multiline
        placeholder="Tell clients what you can help with, how you work, and what they should prepare."
        value={value.bio}
        onChangeText={(bio) => onChange({ ...value, bio })}
      />
      <Field
        label="Services offered"
        multiline
        placeholder="Cleaning, basic home repair, laundry"
        value={servicesText}
        onChangeText={onServicesTextChange}
      />
      <Field
        label="Service area"
        placeholder="San Pedro, nearby barangays"
        value={value.serviceArea}
        onChangeText={(serviceArea) => onChange({ ...value, serviceArea })}
      />
      <Field
        label="Work availability"
        multiline
        placeholder="Example: Saturday mornings and weekday afternoons"
        value={value.availability}
        onChangeText={(availability) => onChange({ ...value, availability })}
      />
      <Field
        label="Rate note"
        placeholder="Optional: Starts at PHP 500"
        value={value.rateText}
        onChangeText={(rateText) => onChange({ ...value, rateText })}
      />
    </View>
  );
}

function HiringForm({
  servicesText,
  value,
  onChange,
  onServicesTextChange,
}: {
  servicesText: string;
  value: HiringProfileInput;
  onChange: (value: HiringProfileInput) => void;
  onServicesTextChange: (value: string) => void;
}) {
  return (
    <View style={styles.formCard}>
      <Field
        label="Hiring headline"
        placeholder="Hiring trusted help around the barangay"
        value={value.headline}
        onChangeText={(headline) => onChange({ ...value, headline })}
      />
      <Field
        label="Hiring intro"
        multiline
        placeholder="Tell workers what kind of help you usually need and how you coordinate work."
        value={value.bio}
        onChangeText={(bio) => onChange({ ...value, bio })}
      />
      <Field
        label="Services you need"
        multiline
        placeholder="Cleaning, plumbing, tutoring"
        value={servicesText}
        onChangeText={onServicesTextChange}
      />
      <Field
        label="Preferred schedule"
        multiline
        placeholder="Example: Mornings before work, weekends for bigger jobs"
        value={value.preferredSchedule}
        onChangeText={(preferredSchedule) => onChange({ ...value, preferredSchedule })}
      />
      <Field
        label="Budget preference"
        placeholder="Optional: I usually coordinate per visit"
        value={value.budgetPreference}
        onChangeText={(budgetPreference) => onChange({ ...value, budgetPreference })}
      />
    </View>
  );
}

function Field({
  label,
  multiline = false,
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
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.textSubtle}
        style={[styles.input, multiline && styles.multilineInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function ModeButton({
  label,
  mode,
  onPress,
  selected,
}: {
  label: string;
  mode: FormMode;
  onPress: (mode: FormMode) => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(mode)}
      style={({ pressed }) => [
        styles.modeButton,
        selected && styles.modeButtonSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.modeButtonText, selected && styles.modeButtonTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function CompleteProfileSkeleton() {
  return (
    <>
      <View style={styles.modeTabs}>
        <Skeleton height={34} width="31%" borderRadius={radius.pill} />
        <Skeleton height={34} width="31%" borderRadius={radius.pill} />
        <Skeleton height={34} width="31%" borderRadius={radius.pill} />
      </View>
      <View style={styles.formCard}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.field}>
            <Skeleton height={14} width={index === 0 ? 92 : 132} />
            <Skeleton height={index > 2 ? 92 : 48} width="100%" borderRadius={radius.md} />
          </View>
        ))}
      </View>
    </>
  );
}

function getModeMeta(mode: FormMode) {
  if (mode === 'work') {
    return {
      title: 'Work Profile',
      subtitle: 'Public details clients see before messaging you.',
      buttonLabel: 'Save Work Profile',
    };
  }

  if (mode === 'hiring') {
    return {
      title: 'Hiring Profile',
      subtitle: 'Public details workers see before responding to you.',
      buttonLabel: 'Save Hiring Profile',
    };
  }

  return {
    title: 'Core Profile',
    subtitle: 'The shared trust basics for your account.',
    buttonLabel: 'Save Core Profile',
  };
}

function getSuccessMessage(mode: FormMode) {
  if (mode === 'work') return 'Your Work Profile is ready for service posts and client messages.';
  if (mode === 'hiring') return 'Your Hiring Profile is ready for job posts and worker messages.';
  return 'Your Core Profile is updated.';
}

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
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
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  headerIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  content: {
    gap: space.lg,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  modeTabs: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    padding: space.xs,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  modeButtonSelected: {
    backgroundColor: color.primary,
  },
  modeButtonText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  modeButtonTextSelected: {
    color: color.white,
  },
  formCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.lg,
    padding: space.lg,
  },
  field: {
    gap: space.xs,
  },
  fieldLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  input: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  multilineInput: {
    minHeight: 104,
  },
  footerCard: {
    backgroundColor: color.cardTint,
    borderColor: color.accentYellow,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  footerTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  footerText: {
    ...typography.body,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
