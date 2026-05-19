import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
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
import { useFeedback } from '@/components/FeedbackProvider';
import { GroupedServicePickerSheet } from '@/components/GroupedServicePickerSheet';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RateRangeInput } from '@/components/RateRangeInput';
import { Skeleton } from '@/components/Skeleton';
import {
    getDisplayLabelForMvpService,
    MVP_SERVICE_CATEGORIES,
    MVP_SERVICES_BY_CATEGORY,
} from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
    getMyProfileCompletion,
    saveCoreProfile,
    saveHiringProfile,
    saveWorkProfile,
} from '@/services/profile-completion.service';
import { uploadProfilePhoto } from '@/services/profile-photo.service';
import type {
    CoreProfileInput,
    HiringProfileInput,
    ProfileCompletionMode,
    ProfileCompletionStatus,
    WorkProfileInput,
} from '@/types/profile.types';

type FormMode = ProfileCompletionMode;
type ProfileFocusTarget =
  | 'profile-photo'
  | 'shared-profile'
  | 'contact-preference'
  | 'service-area'
  | 'availability'
  | 'rate-range'
  | 'hiring-intro'
  | 'needed-services'
  | 'preferred-schedule';

const CONTACT_METHOD_OPTIONS = [
  { value: 'app_message', label: 'App messages' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
] as const;

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
  rateType: 'per_service',
  rateNegotiable: false,
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

function normalizeFocusTarget(value: string | string[] | undefined): ProfileFocusTarget | null {
  const focus = getParamValue(value);

  if (
    focus === 'profile-photo' ||
    focus === 'shared-profile' ||
    focus === 'contact-preference' ||
    focus === 'service-area' ||
    focus === 'availability' ||
    focus === 'rate-range' ||
    focus === 'hiring-intro' ||
    focus === 'needed-services' ||
    focus === 'preferred-schedule'
  ) {
    return focus;
  }

  return null;
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{ mode?: string | string[]; focus?: string | string[] }>();
  const initialMode = useMemo(() => normalizeMode(params.mode), [params.mode]);
  const focusTarget = useMemo(() => normalizeFocusTarget(params.focus), [params.focus]);
  const { refresh } = useProfile();
  const scrollRef = useRef<ScrollView>(null);
  const targetOffsets = useRef<Partial<Record<ProfileFocusTarget, number>>>({});
  const handledFocusTargetRef = useRef<ProfileFocusTarget | null>(null);
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<ProfileCompletionStatus | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [core, setCore] = useState<CoreProfileInput>(emptyCore);
  const [work, setWork] = useState<WorkProfileInput>(emptyWork);
  const [hiring, setHiring] = useState<HiringProfileInput>(emptyHiring);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    handledFocusTargetRef.current = null;
  }, [focusTarget]);

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
    setAvatarUrl(nextStatus.core.avatarUrl);
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
      rateNegotiable: nextStatus.work.rateNegotiable,
      customOfferedServices: nextStatus.work.customOfferedServices,
    });
    setHiring({
      headline: nextStatus.hiring.headline,
      bio: nextStatus.hiring.bio,
      neededServices: nextStatus.hiring.neededServices,
      customNeededServices: nextStatus.hiring.customNeededServices,
      preferredSchedule: nextStatus.hiring.preferredSchedule,
      budgetPreference: nextStatus.hiring.budgetPreference,
    });
  };

  const scrollToFocusTarget = useCallback(() => {
    if (loading || !focusTarget || handledFocusTargetRef.current === focusTarget) return;

    const targetOffset = targetOffsets.current[focusTarget];
    if (targetOffset === undefined) return;

    handledFocusTargetRef.current = focusTarget;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(targetOffset - space.md, 0),
      });
    });
  }, [focusTarget, loading]);

  const registerTargetLayout = useCallback(
    (target: ProfileFocusTarget, y: number) => {
      targetOffsets.current[target] = y;
      scrollToFocusTarget();
    },
    [scrollToFocusTarget],
  );

  useEffect(() => {
    scrollToFocusTarget();
  }, [mode, scrollToFocusTarget]);

  const save = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);

    const result =
      mode === 'core'
        ? await saveCoreProfile(core)
        : mode === 'work'
          ? await saveWorkProfile(work)
          : await saveHiringProfile(hiring);

    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Could not save profile.');
      return;
    }

    hydrateForms(result.data);
    await refresh();

    showSuccessToast(getSuccessMessage(mode));
    router.back();
  };

  const pickAvatar = async () => {
    if (uploadingAvatar) return;

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*'],
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    const uploaded = await uploadProfilePhoto({
      uri: asset.uri,
      name: asset.name ?? null,
      mimeType: asset.mimeType ?? null,
    });
    setUploadingAvatar(false);

    if (uploaded.error || !uploaded.data) {
      Alert.alert('Profile photo', uploaded.error ?? 'Could not upload this photo.');
      return;
    }

    setAvatarUrl(uploaded.data);
    setStatus((current) =>
      current
        ? {
            ...current,
            photoRecommended: false,
            core: {
              ...current.core,
              avatarUrl: uploaded.data,
            },
          }
        : current,
    );
    await refresh();
    showSuccessToast('Profile photo updated');
  };

  const currentMeta = getModeMeta(mode);
  const roleLockedByCore = mode !== 'core' && status && !status.coreComplete;
  const saveDisabled = mode === 'core' && !core.street.trim();

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
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <CompleteProfileSkeleton />
          ) : (
            <>
              <SetupSection compact>
                <View style={styles.modeTabs}>
                  <ModeButton label="Core" mode="core" selected={mode === 'core'} onPress={setMode} />
                  <ModeButton label="Work" mode="work" selected={mode === 'work'} onPress={setMode} />
                  <ModeButton label="Hiring" mode="hiring" selected={mode === 'hiring'} onPress={setMode} />
                </View>
              </SetupSection>

              {error ? (
                <SetupSection compact>
                  <NoticeBanner message={error} title="Profile needs attention" variant="warning" />
                </SetupSection>
              ) : null}

              {status?.photoRecommended ? (
                <SetupSection compact>
                  <NoticeBanner
                    message="A clear public profile photo helps neighbors recognize you. It is strongly recommended, but verification selfie or ID files stay private and are never reused here."
                    title="Add a profile photo"
                    variant="info"
                  />
                </SetupSection>
              ) : null}

              {roleLockedByCore ? (
                <SetupSection compact>
                  <NoticeBanner
                    message="Finish your Core Profile first so neighbors can see who they are talking to."
                    title="Core Profile comes first"
                    variant="warning"
                  />
                </SetupSection>
              ) : null}

              {mode === 'core' ? (
                <CoreForm
                  avatarUrl={avatarUrl}
                  onTargetLayout={registerTargetLayout}
                  uploadingAvatar={uploadingAvatar}
                  value={core}
                  onChange={setCore}
                  onPickAvatar={pickAvatar}
                />
              ) : roleLockedByCore ? (
                <CoreFirstPanel onPress={() => setMode('core')} />
              ) : mode === 'work' ? (
                <WorkForm
                  onTargetLayout={registerTargetLayout}
                  value={work}
                  onChange={setWork}
                />
              ) : (
                <HiringForm
                  onTargetLayout={registerTargetLayout}
                  value={hiring}
                  onChange={setHiring}
                />
              )}

              {!roleLockedByCore ? (
                <SetupSection>
                  <View style={styles.footerCard}>
                    <Text style={styles.footerTitle}>Why this matters</Text>
                    <Text style={styles.footerText}>
                      Verification says this is a real resident. Profile completion gives the other person enough public context before they message, hire, or accept work.
                    </Text>
                    <PrimaryButton
                      disabled={saveDisabled}
                      icon="check-circle"
                      label={saving ? 'Saving...' : currentMeta.buttonLabel}
                      loading={saving}
                      onPress={save}
                    />
                  </View>
                </SetupSection>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CoreForm({
  avatarUrl,
  onTargetLayout,
  uploadingAvatar,
  value,
  onChange,
  onPickAvatar,
}: {
  avatarUrl: string | null;
  onTargetLayout: (target: ProfileFocusTarget, y: number) => void;
  uploadingAvatar: boolean;
  value: CoreProfileInput;
  onChange: (value: CoreProfileInput) => void;
  onPickAvatar: () => void;
}) {
  const [areaSheetVisible, setAreaSheetVisible] = useState(false);

  return (
    <>
      <SetupSection targetId="profile-photo" onTargetLayout={onTargetLayout}>
        <ProfilePhotoSection
          avatarUrl={avatarUrl}
          name={`${value.firstName} ${value.lastName}`.trim()}
          uploading={uploadingAvatar}
          onPickAvatar={onPickAvatar}
        />
      </SetupSection>

      <SetupSection targetId="shared-profile" onTargetLayout={onTargetLayout}>
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
      </SetupSection>

      <SetupSection>
        <View style={styles.addressIntroBlock}>
          <PrivacyNoteCard />
          <CurrentAreaCard onChange={() => setAreaSheetVisible(true)} />
        </View>
      </SetupSection>

      <SetupSection>
        <AddressSection
          badge="Required"
          helper="Purok, sitio, street, or subdivision"
          title="Public area">
          <Field
            label="Public area"
            placeholder="e.g. Purok 3 or Gov. Carpio Ave"
            value={value.street}
            onChangeText={(street) => onChange({ ...value, street })}
          />
          <View style={styles.publicHintRow}>
            <MaterialIcons color={color.textSubtle} name="public" size={16} />
            <Text style={styles.publicHintText}>Shown publicly</Text>
          </View>
        </AddressSection>
      </SetupSection>

      <SetupSection targetId="contact-preference" onTargetLayout={onTargetLayout}>
        <AddressSection
          helper="Public context neighbors see before messaging."
          title="Profile details">
          <ContactPreferencePicker
            value={value.preferredContactMethod}
            onChange={(preferredContactMethod) => onChange({ ...value, preferredContactMethod })}
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
        </AddressSection>
      </SetupSection>

      <ServiceAreaSheet
        onClose={() => setAreaSheetVisible(false)}
        visible={areaSheetVisible}
      />
    </>
  );
}

function ProfilePhotoSection({
  avatarUrl,
  name,
  uploading,
  onPickAvatar,
}: {
  avatarUrl: string | null;
  name: string;
  uploading: boolean;
  onPickAvatar: () => void;
}) {
  return (
    <View style={styles.photoSection}>
      <View style={styles.photoPreview}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.photoImage} />
        ) : (
          <Text style={styles.photoInitials}>{getInitials(name || 'Konektado resident')}</Text>
        )}
      </View>
      <View style={styles.photoCopy}>
        <Text style={styles.photoTitle}>Profile photo</Text>
        <Text style={styles.photoBody}>
          Add a clear photo so neighbors can recognize and trust who they are talking to.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={uploading}
        onPress={onPickAvatar}
        style={({ pressed }) => [
          styles.photoAction,
          uploading && styles.disabled,
          pressed && !uploading && styles.pressed,
        ]}>
        <Text style={styles.photoActionText}>
          {uploading ? 'Uploading...' : avatarUrl ? 'Replace' : 'Add photo'}
        </Text>
      </Pressable>
    </View>
  );
}

function ContactPreferencePicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Contact preference</Text>
      <View style={styles.contactPreferenceRow}>
        {CONTACT_METHOD_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.contactPreferenceButton,
                selected && styles.contactPreferenceButtonSelected,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.contactPreferenceText,
                  selected && styles.contactPreferenceTextSelected,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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

function PrivacyNoteCard() {
  return (
    <View style={styles.privacyCard}>
      <View style={styles.privacyIconWrap}>
        <MaterialIcons color={color.warning} name="lock" size={16} />
      </View>
      <View style={styles.privacyCopy}>
        <Text style={styles.privacyTitle}>Privacy note</Text>
        <Text style={styles.privacyBody}>
          Only your general area is shown publicly. Exact address details stay private.
        </Text>
      </View>
    </View>
  );
}

function AddressSection({
  badge,
  children,
  helper,
  title,
}: {
  badge?: 'Required' | 'Optional';
  children: ReactNode;
  helper: string;
  title: string;
}) {
  const isRequired = badge === 'Required';

  return (
    <View style={styles.addressSection}>
      <View style={styles.addressSectionHeader}>
        <View style={styles.addressTitleRow}>
          <Text style={styles.addressSectionTitle}>{title}</Text>
          {badge ? (
            <View style={[styles.sectionBadge, isRequired ? styles.sectionBadgeRequired : styles.sectionBadgeOptional]}>
              <Text style={[styles.sectionBadgeText, isRequired ? styles.sectionBadgeTextRequired : undefined]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
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
        <Text style={styles.sheetSectionTitle}>Other areas</Text>
        <View style={styles.sheetOptionDisabled}>
          <Text style={styles.sheetOptionTextMuted}>Other barangays in Santo Tomas</Text>
        </View>
        <Text style={styles.sheetHelper}>Konektado currently supports only selected service areas.</Text>
      </View>

      <PrimaryButton label="Done" onPress={onClose} />
    </BottomSheet>
  );
}

function CoreFirstPanel({ onPress }: { onPress: () => void }) {
  return (
    <SetupSection>
      <View style={styles.lockedPanel}>
        <View style={styles.lockedIcon}>
          <MaterialIcons color={color.primary} name="lock" size={20} />
        </View>
        <View style={styles.lockedCopy}>
          <Text style={styles.lockedTitle}>Finish your Core Profile first</Text>
          <Text style={styles.lockedText}>
            Your name, location, and contact preference help neighbors know who they are connecting with.
          </Text>
        </View>
        <PrimaryButton icon="person" label="Complete Core Profile" onPress={onPress} />
      </View>
    </SetupSection>
  );
}

function WorkForm({
  onTargetLayout,
  value,
  onChange,
}: {
  onTargetLayout: (target: ProfileFocusTarget, y: number) => void;
  value: WorkProfileInput;
  onChange: (value: WorkProfileInput) => void;
}) {
  return (
    <>
      <SetupSection>
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
        <ServiceSelectionField
          customServices={value.customOfferedServices}
          emptyText="Choose the services you want neighbors to find you for."
          label="Services offered"
          selectedServices={value.offeredServices}
          sheetDescription="Pick all Konektado service categories you can offer."
          sheetTitle="Choose Work services"
          onChange={(offeredServices, customOfferedServices) =>
            onChange({ ...value, offeredServices, customOfferedServices })
          }
        />
      </SetupSection>

      <SetupSection targetId="service-area" onTargetLayout={onTargetLayout}>
        <Field
          label="Service area"
          placeholder="San Pedro, nearby barangays"
          value={value.serviceArea}
          onChangeText={(serviceArea) => onChange({ ...value, serviceArea })}
        />
      </SetupSection>

      <SetupSection targetId="availability" onTargetLayout={onTargetLayout}>
        <Field
          label="Work availability"
          multiline
          placeholder="Example: Saturday mornings and weekday afternoons"
          value={value.availability}
          onChangeText={(availability) => onChange({ ...value, availability })}
        />
      </SetupSection>

      <SetupSection targetId="rate-range" onTargetLayout={onTargetLayout}>
        <Field
          label="Rate note"
          placeholder="Optional: supplies included"
          value={value.rateText}
          onChangeText={(rateText) => onChange({ ...value, rateText })}
        />
        <RateRangeInput
          label="Rate range"
          maxValue={value.rateMax}
          minValue={value.rateMin}
          negotiable={value.rateNegotiable}
          onMaxChange={(rateMax) => onChange({ ...value, rateMax })}
          onMinChange={(rateMin) => onChange({ ...value, rateMin })}
          onNegotiableChange={(rateNegotiable) => onChange({ ...value, rateNegotiable })}
          onRateTypeChange={(rateType) => onChange({ ...value, rateType })}
          previewPrefix="Service rate"
          rateType={value.rateType}
        />
      </SetupSection>
    </>
  );
}

function HiringForm({
  onTargetLayout,
  value,
  onChange,
}: {
  onTargetLayout: (target: ProfileFocusTarget, y: number) => void;
  value: HiringProfileInput;
  onChange: (value: HiringProfileInput) => void;
}) {
  return (
    <>
      <SetupSection targetId="hiring-intro" onTargetLayout={onTargetLayout}>
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
      </SetupSection>

      <SetupSection targetId="needed-services" onTargetLayout={onTargetLayout}>
        <ServiceSelectionField
          customServices={value.customNeededServices}
          emptyText="Choose the services you usually need help with."
          label="Services you need"
          selectedServices={value.neededServices}
          sheetDescription="Pick all Konektado service categories you usually hire for."
          sheetTitle="Choose needed services"
          onChange={(neededServices, customNeededServices) =>
            onChange({ ...value, neededServices, customNeededServices })
          }
        />
      </SetupSection>

      <SetupSection targetId="preferred-schedule" onTargetLayout={onTargetLayout}>
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
      </SetupSection>
    </>
  );
}

function ServiceSelectionField({
  customServices,
  emptyText,
  label,
  selectedServices,
  sheetDescription,
  sheetTitle,
  onChange,
}: {
  customServices: string[];
  emptyText: string;
  label: string;
  selectedServices: string[];
  sheetDescription: string;
  sheetTitle: string;
  onChange: (selectedServices: string[], customServices: string[]) => void;
}) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const hasServices = selectedServices.length || customServices.length;

  const removeOfficialService = (service: string) => {
    onChange(selectedServices.filter((item) => item !== service), customServices);
  };

  const removeCustomService = (service: string) => {
    onChange(selectedServices, customServices.filter((item) => item !== service));
  };

  return (
    <View style={styles.field}>
      <View style={styles.serviceFieldHeader}>
        <View style={styles.serviceFieldCopy}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldHelper}>{emptyText}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [styles.serviceEditButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.primary} name={hasServices ? 'edit' : 'add'} size={17} />
          <Text style={styles.serviceEditButtonText}>{hasServices ? 'Edit' : 'Add'}</Text>
        </Pressable>
      </View>

      {hasServices ? (
        <View style={styles.servicePillRow}>
          {selectedServices.map((service) => (
            <Pressable
              accessibilityLabel={`Remove ${service}`}
              accessibilityRole="button"
              key={service}
              onPress={() => removeOfficialService(service)}
              style={({ pressed }) => [styles.servicePill, pressed && styles.pressed]}>
              <Text style={styles.servicePillText}>{getDisplayLabelForMvpService(service)}</Text>
              <MaterialIcons color={color.primary} name="close" size={15} />
            </Pressable>
          ))}
          {customServices.map((service) => (
            <Pressable
              accessibilityLabel={`Remove other service ${service}`}
              accessibilityRole="button"
              key={service}
              onPress={() => removeCustomService(service)}
              style={({ pressed }) => [styles.customServicePill, pressed && styles.pressed]}>
              <Text style={styles.customServicePillText}>Other: {service}</Text>
              <MaterialIcons color={color.primary} name="close" size={15} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [styles.emptyServicePicker, pressed && styles.pressed]}>
          <MaterialIcons color={color.primary} name="add-circle-outline" size={20} />
          <Text style={styles.emptyServicePickerText}>Add services</Text>
        </Pressable>
      )}

      {customServices.length ? (
        <Text style={styles.serviceReviewNote}>
          Custom services may be reviewed before being shown widely.
        </Text>
      ) : null}

      <GroupedServicePickerSheet
        categories={MVP_SERVICE_CATEGORIES}
        description={sheetDescription}
        mode="multi"
        onApplyMulti={({ selectedServices: nextSelected, customServices: nextCustom }) =>
          onChange(nextSelected, nextCustom)
        }
        onClose={() => setPickerVisible(false)}
        searchPlaceholder="Search services"
        selectedCustomServices={customServices}
        selectedServices={selectedServices}
        servicesByCategory={MVP_SERVICES_BY_CATEGORY}
        title={sheetTitle}
        visible={pickerVisible}
      />
    </View>
  );
}

function SetupSection({
  children,
  compact = false,
  onTargetLayout,
  targetId,
}: {
  children: ReactNode;
  compact?: boolean;
  onTargetLayout?: (target: ProfileFocusTarget, y: number) => void;
  targetId?: ProfileFocusTarget;
}) {
  return (
    <View
      onLayout={
        targetId && onTargetLayout
          ? (event) => onTargetLayout(targetId, event.nativeEvent.layout.y)
          : undefined
      }
      style={[styles.setupSection, compact && styles.setupSectionCompact]}>
      {children}
    </View>
  );
}

function Field({
  badge,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  badge?: 'Optional';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {badge ? (
          <View style={styles.fieldBadge}>
            <Text style={styles.fieldBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <TextInput
        multiline={multiline}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={color.textSubtle}
        style={[styles.input, focused && styles.inputFocused, multiline && styles.multilineInput]}
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
      <SetupSection compact>
        <View style={styles.modeTabs}>
          <Skeleton height={34} width="31%" borderRadius={radius.pill} />
          <Skeleton height={34} width="31%" borderRadius={radius.pill} />
          <Skeleton height={34} width="31%" borderRadius={radius.pill} />
        </View>
      </SetupSection>
      <SetupSection>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.field}>
            <Skeleton height={14} width={index === 0 ? 92 : 132} />
            <Skeleton height={index > 2 ? 92 : 48} width="100%" borderRadius={radius.md} />
          </View>
        ))}
      </SetupSection>
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

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'K';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F3F6FA',
    flex: 1,
  },
  screen: {
    backgroundColor: '#F3F6FA',
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
    gap: space.sm,
    paddingBottom: space['3xl'],
  },
  setupSection: {
    backgroundColor: color.background,
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  setupSectionCompact: {
    paddingVertical: space.md,
  },
  photoSection: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  photoPreview: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 60,
  },
  photoImage: {
    height: '100%',
    width: '100%',
  },
  photoInitials: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  photoCopy: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  photoTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  photoBody: {
    ...typography.caption,
    color: color.textMuted,
  },
  photoAction: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: space.md,
  },
  photoActionText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  modeTabs: {
    backgroundColor: color.surfaceAlt,
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
    backgroundColor: color.background,
    borderColor: color.border,
    borderWidth: 1,
  },
  modeButtonText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  modeButtonTextSelected: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
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
  addressIntroBlock: {
    gap: space.sm,
  },
  privacyCard: {
    alignItems: 'flex-start',
    backgroundColor: color.warningSoft,
    borderColor: 'rgba(183, 121, 31, 0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  privacyIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 192, 59, 0.25)',
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  privacyCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  privacyTitle: {
    ...typography.captionMedium,
    color: color.text,
  },
  privacyBody: {
    ...typography.caption,
    color: color.textMuted,
  },
  publicHintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  publicHintText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  addressSection: {
    gap: space.md,
  },
  addressSectionHeader: {
    gap: 2,
  },
  addressTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  addressSectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  sectionBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  sectionBadgeRequired: {
    backgroundColor: color.primarySoft,
  },
  sectionBadgeOptional: {
    backgroundColor: color.surfaceAlt,
  },
  sectionBadgeText: {
    ...typography.captionMedium,
    color: color.textMuted,
    fontSize: 10,
    lineHeight: 12,
  },
  sectionBadgeTextRequired: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  addressSectionHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  addressSectionFields: {
    gap: space.md,
  },
  field: {
    gap: space.xs,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  fieldLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  fieldBadge: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  fieldBadgeText: {
    ...typography.captionMedium,
    color: color.textMuted,
    fontSize: 10,
    lineHeight: 12,
  },
  fieldHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  input: {
    backgroundColor: color.background,
    borderColor: '#CBD5E1',
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
  inputFocused: {
    borderColor: color.verificationBlue,
  },
  multilineInput: {
    minHeight: 104,
  },
  contactPreferenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  contactPreferenceButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: space.md,
  },
  contactPreferenceButtonSelected: {
    backgroundColor: color.primary,
    borderColor: color.primary,
  },
  contactPreferenceText: {
    ...typography.captionMedium,
    color: color.text,
  },
  contactPreferenceTextSelected: {
    color: color.white,
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
  lockedPanel: {
    alignItems: 'stretch',
    backgroundColor: color.cardTint,
    borderColor: color.accentYellow,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  lockedIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  lockedCopy: {
    gap: space.xs,
  },
  lockedTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  lockedText: {
    ...typography.body,
    color: color.textMuted,
  },
  serviceFieldHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  serviceFieldCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  serviceEditButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: space.md,
  },
  serviceEditButtonText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  servicePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  servicePill: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 34,
    paddingHorizontal: space.md,
  },
  servicePillText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  customServicePill: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 34,
    paddingHorizontal: space.md,
  },
  customServicePillText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  emptyServicePicker: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
  },
  emptyServicePickerText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  serviceReviewNote: {
    ...typography.caption,
    color: color.textMuted,
  },
  footerCard: {
    backgroundColor: color.background,
    borderColor: color.border,
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
  disabled: {
    opacity: 0.6,
  },
});
