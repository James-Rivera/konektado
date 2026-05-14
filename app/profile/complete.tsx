import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
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

import { BottomSheet } from '@/components/BottomSheet';
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

const RATE_TYPE_OPTIONS: { value: WorkProfileInput['rateType']; label: string }[] = [
  { value: 'per_project', label: 'Per project' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'negotiable', label: 'Negotiable' },
];

const emptyCore: CoreProfileInput = {
  firstName: '',
  lastName: '',
  province: 'Batangas',
  barangay: 'San Pedro',
  purokSitio: '',
  street: '',
  subdivisionArea: '',
  blockLot: '',
  houseNumber: '',
  landmarkNote: '',
  city: 'Santo Tomas',
  preferredContactMethod: '',
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
  rateMin: '',
  rateMax: '',
  rateType: 'per_project',
  customOfferedServices: [],
};

const emptyHiring: HiringProfileInput = {
  headline: '',
  bio: '',
  neededServices: [],
  customNeededServices: [],
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
      province: nextStatus.core.province,
      barangay: nextStatus.core.barangay,
      purokSitio: nextStatus.core.purokSitio,
      street: nextStatus.core.street,
      subdivisionArea: nextStatus.core.subdivisionArea,
      blockLot: nextStatus.core.blockLot,
      houseNumber: nextStatus.core.houseNumber,
      landmarkNote: nextStatus.core.landmarkNote,
      city: nextStatus.core.city,
      preferredContactMethod: nextStatus.core.preferredContactMethod,
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
      rateMin: nextStatus.work.rateMin,
      rateMax: nextStatus.work.rateMax,
      rateType: nextStatus.work.rateType,
      customOfferedServices: nextStatus.work.customOfferedServices,
    });
    setWorkServicesText([...nextStatus.work.offeredServices, ...nextStatus.work.customOfferedServices].join(', '));
    setHiring({
      headline: nextStatus.hiring.headline,
      bio: nextStatus.hiring.bio,
      neededServices: nextStatus.hiring.neededServices,
      customNeededServices: nextStatus.hiring.customNeededServices,
      preferredSchedule: nextStatus.hiring.preferredSchedule,
      budgetPreference: nextStatus.hiring.budgetPreference,
    });
    setHiringServicesText([...nextStatus.hiring.neededServices, ...nextStatus.hiring.customNeededServices].join(', '));
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
  const [areaSheetVisible, setAreaSheetVisible] = useState(false);

  return (
    <>
      <View style={styles.formCard}>
        <AddressSection
          helper="These details identify your account."
          title="Profile basics">
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
        </AddressSection>

        <CurrentAreaCard onChange={() => setAreaSheetVisible(true)} />

        <AddressSection
          helper="Shown on your profile and posts."
          title="Public location">
          <Field
            label="Street / Road"
            placeholder="e.g. Governor Carpio Avenue"
            value={value.street}
            onChangeText={(street) => onChange({ ...value, street })}
          />
          <Field
            label="Subdivision / Area optional"
            placeholder="e.g. San Pedro Subdivision"
            value={value.subdivisionArea}
            onChangeText={(subdivisionArea) => onChange({ ...value, subdivisionArea })}
          />
        </AddressSection>

        <AddressSection
          helper="Used only for verification and coordination."
          title="Private address">
          <View style={styles.twoColumn}>
            <Field
              compact
              label="Block / Lot optional"
              placeholder="e.g. Block 4 Lot 12"
              value={value.blockLot}
              onChangeText={(blockLot) => onChange({ ...value, blockLot })}
            />
            <Field
              compact
              label="House Number / Building Name optional"
              placeholder="e.g. 125 or Building A"
              value={value.houseNumber}
              onChangeText={(houseNumber) => onChange({ ...value, houseNumber })}
            />
          </View>
          <Field
            label="Landmark / Note optional"
            placeholder="e.g. Near the chapel"
            value={value.landmarkNote}
            onChangeText={(landmarkNote) => onChange({ ...value, landmarkNote })}
          />
        </AddressSection>

        <AddressSection
          helper="Public context neighbors see before messaging."
          title="Profile details">
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
        </AddressSection>
      </View>

      <ServiceAreaSheet
        onClose={() => setAreaSheetVisible(false)}
        visible={areaSheetVisible}
      />
    </>
  );
}

function CurrentAreaCard({ onChange }: { onChange: () => void }) {
  return (
    <View style={styles.areaCard}>
      <View style={styles.areaCopy}>
        <Text style={styles.areaLabel}>Current area</Text>
        <Text style={styles.areaValue}>Brgy. San Pedro, Santo Tomas, Batangas</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onChange}
        style={({ pressed }) => [styles.areaAction, pressed && styles.pressed]}>
        <Text style={styles.areaActionText}>Change</Text>
      </Pressable>
    </View>
  );
}

function AddressSection({
  children,
  helper,
  title,
}: {
  children: ReactNode;
  helper: string;
  title: string;
}) {
  return (
    <View style={styles.addressSection}>
      <View style={styles.addressSectionHeader}>
        <Text style={styles.addressSectionTitle}>{title}</Text>
        <Text style={styles.addressSectionHelper}>{helper}</Text>
      </View>
      <View style={styles.addressSectionFields}>{children}</View>
    </View>
  );
}

function ServiceAreaSheet({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="72%">
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Choose service area</Text>
        <Pressable accessibilityLabel="Close service area chooser" accessibilityRole="button" onPress={onClose}>
          <MaterialIcons color={color.text} name="close" size={24} />
        </Pressable>
      </View>

      <View style={styles.sheetSection}>
        <Text style={styles.sheetSectionTitle}>Available now</Text>
        <View style={styles.sheetOptionSelected}>
          <View style={styles.sheetCheck}>
            <MaterialIcons color={color.primary} name="check" size={16} />
          </View>
          <Text style={styles.sheetOptionText}>Brgy. San Pedro, Santo Tomas, Batangas</Text>
        </View>
      </View>

      <View style={styles.sheetSection}>
        <Text style={styles.sheetSectionTitle}>Coming soon</Text>
        <View style={styles.sheetOptionDisabled}>
          <Text style={styles.sheetOptionTextMuted}>Other barangays in Santo Tomas</Text>
        </View>
        <Text style={styles.sheetHelper}>Konektado is currently available only in selected service areas.</Text>
      </View>

      <PrimaryButton label="Done" onPress={onClose} />
    </BottomSheet>
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
        placeholder="Optional: supplies included"
        value={value.rateText}
        onChangeText={(rateText) => onChange({ ...value, rateText })}
      />
      <Text style={styles.fieldHelper}>Use a range so clients know what to expect.</Text>
      <View style={styles.twoColumn}>
        <Field
          compact
          label="Min rate"
          placeholder="500"
          value={value.rateMin}
          onChangeText={(rateMin) => onChange({ ...value, rateMin })}
        />
        <Field
          compact
          label="Max rate"
          placeholder="1000"
          value={value.rateMax}
          onChangeText={(rateMax) => onChange({ ...value, rateMax })}
        />
      </View>
      <View style={styles.chipRow}>
        {RATE_TYPE_OPTIONS.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: value.rateType === option.value }}
            key={option.value}
            onPress={() => onChange({ ...value, rateType: option.value })}
            style={({ pressed }) => [
              styles.rateChip,
              value.rateType === option.value && styles.rateChipSelected,
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.rateChipText,
                value.rateType === option.value && styles.rateChipTextSelected,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
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
  compact,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  compact?: boolean;
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={[styles.field, compact && styles.flex]}>
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
  areaCard: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  areaCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  areaLabel: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  areaValue: {
    ...typography.bodyMedium,
    color: color.text,
    flexShrink: 1,
  },
  areaAction: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  areaActionText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  addressSection: {
    gap: space.md,
  },
  addressSectionHeader: {
    gap: 2,
  },
  addressSectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  addressSectionHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  addressSectionFields: {
    gap: space.md,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  field: {
    gap: space.xs,
  },
  fieldLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  fieldHelper: {
    ...typography.caption,
    color: color.textMuted,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  rateChip: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  rateChipSelected: {
    backgroundColor: color.primary,
    borderColor: color.primary,
  },
  rateChipText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  rateChipTextSelected: {
    color: color.white,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    ...typography.sectionTitle,
    color: color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  sheetSection: {
    gap: space.sm,
  },
  sheetSectionTitle: {
    ...typography.captionMedium,
    color: color.textMuted,
    textTransform: 'uppercase',
  },
  sheetOptionSelected: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  sheetCheck: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  sheetOptionDisabled: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  sheetOptionText: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
  },
  sheetOptionTextMuted: {
    ...typography.bodyMedium,
    color: color.textMuted,
  },
  sheetHelper: {
    ...typography.caption,
    color: color.textMuted,
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
