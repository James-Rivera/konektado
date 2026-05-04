import * as DocumentPicker from 'expo-document-picker';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarangayPickerSheet } from '@/components/BarangayPickerSheet';
import { PostOptionPickerSheet } from '@/components/PostOptionPickerSheet';
import { LocationMapPreview } from '@/components/LocationMapPreview';
import { Skeleton } from '@/components/Skeleton';
import {
  getContextTagsForCategory,
  getServicesForCategory,
  JOB_CATEGORIES,
  POPULAR_JOB_CATEGORIES,
} from '@/constants/job-post-options';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { getJobDraft, saveJobDraft } from '@/services/job-draft.service';
import { type JobPhotoAsset, uploadJobPhotos } from '@/services/job-photo.service';
import type { JobDraftSummary, UpsertJobDraftInput } from '@/types/marketplace.types';

const MAX_JOB_PHOTOS = 10;

type JobDraft = {
  title: string;
  description: string;
  category: string;
  serviceNeeded: string;
  tags: string[];
  photoUrls: string[];
  barangay: string;
  locationText: string;
  budget: string;
  workersNeeded: string;
  scheduleText: string;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
};

type JobDraftErrors = Partial<Record<keyof JobDraft, string>>;

function getDisplayName(profile: ReturnType<typeof useProfile>['profile']) {
  return (
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident'
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function parsePositiveNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function validateDraft(draft: JobDraft) {
  const errors: JobDraftErrors = {};

  if (!draft.category.trim()) errors.category = 'Choose a job category.';
  if (!draft.serviceNeeded.trim()) {
    errors.serviceNeeded = draft.category.trim()
      ? 'Choose the service needed.'
      : 'Choose a job category first, then choose the service needed.';
  }
  if (!draft.title.trim()) errors.title = 'Enter a job title.';
  if (!draft.description.trim()) {
    errors.description = 'Describe what needs to be done.';
  }
  if (!draft.locationText.trim()) errors.locationText = 'Choose a barangay.';

  const budget = parsePositiveNumber(draft.budget);
  if (Number.isNaN(budget)) errors.budget = 'Enter a valid budget or leave it blank.';

  const workersNeeded = parsePositiveNumber(draft.workersNeeded);
  if (Number.isNaN(workersNeeded)) {
    errors.workersNeeded = 'Enter a valid worker count or leave it blank.';
  }

  return errors;
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildDraftInput(draft: JobDraft): UpsertJobDraftInput {
  const budgetAmount = parsePositiveNumber(draft.budget);
  const workersNeeded = parsePositiveNumber(draft.workersNeeded);

  return {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    serviceNeeded: draft.serviceNeeded,
    tags: draft.tags,
    photoUrls: draft.photoUrls,
    barangay: draft.barangay,
    locationText: draft.locationText,
    budgetAmount: Number.isNaN(budgetAmount) ? null : budgetAmount,
    workersNeeded: Number.isNaN(workersNeeded) ? null : workersNeeded,
    scheduleText: draft.scheduleText,
    allowMessages: draft.allowMessages,
    autoReplyEnabled: draft.autoReplyEnabled,
    autoCloseEnabled: draft.autoCloseEnabled,
  };
}

function draftFromRecord(record: JobDraftSummary | null): JobDraft | null {
  if (!record) return null;

  return {
    title: record.title ?? '',
    description: record.description ?? '',
    category: record.category ?? '',
    serviceNeeded: record.serviceNeeded ?? '',
    tags: record.tags,
    photoUrls: record.photoUrls ?? [],
    barangay: record.barangay ?? '',
    locationText: record.locationText ?? '',
    budget: record.budgetAmount ? String(record.budgetAmount) : '',
    workersNeeded: record.workersNeeded ? String(record.workersNeeded) : '',
    scheduleText: record.scheduleText ?? '',
    allowMessages: record.allowMessages,
    autoReplyEnabled: record.autoReplyEnabled,
    autoCloseEnabled: record.autoCloseEnabled,
  };
}

export default function CreateJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftId?: string | string[] }>();
  const initialDraftId = getParamValue(params.draftId);
  const { profile, loading } = useProfile();
  const profileId = profile?.id ?? null;
  const profileBarangay = profile?.barangay ?? null;
  const displayName = getDisplayName(profile);
  const [errors, setErrors] = useState<JobDraftErrors>({});
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(initialDraftId));
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [barangayPickerVisible, setBarangayPickerVisible] = useState(false);
  const [photoFolderId] = useState(() => `draft-${Date.now()}`);
  const [draft, setDraft] = useState<JobDraft>({
    title: '',
    description: '',
    category: '',
    serviceNeeded: '',
    tags: [],
    photoUrls: [],
    barangay: '',
    locationText: '',
    budget: '',
    workersNeeded: '',
    scheduleText: '',
    allowMessages: true,
    autoReplyEnabled: false,
    autoCloseEnabled: false,
  });

  useEffect(() => {
    if (!initialDraftId) return;
    let active = true;

    void (async () => {
      setLoadingDraft(true);
      try {
        const result = await getJobDraft(initialDraftId);
        if (!active) return;

        if (result.error || !result.data) {
          Alert.alert('Draft', result.error ?? 'Could not load this draft.');
        } else {
          const loadedDraft = draftFromRecord(result.data);
          if (loadedDraft) setDraft(loadedDraft);
        }
      } catch {
        if (active) {
          Alert.alert('Draft', 'Could not load this draft right now.');
        }
      } finally {
        if (active) {
          setLoadingDraft(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [initialDraftId]);

  useEffect(() => {
    if (!profileId) return;

    const barangay = profileBarangay || 'Barangay San Pedro';
    setDraft((current) => ({
      ...current,
      barangay: current.barangay || barangay,
      locationText: current.locationText || barangay,
    }));
  }, [profileId, profileBarangay]);

  const selectedTagsText = useMemo(() => draft.tags.join(', '), [draft.tags]);
  const tagOptions = useMemo(() => getContextTagsForCategory(draft.category), [draft.category]);
  const serviceOptions = useMemo(() => getServicesForCategory(draft.category), [draft.category]);

  const updateDraft = <Key extends keyof JobDraft>(key: Key, value: JobDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const selectCategory = (categoryName: string) => {
    setDraft((current) => ({
      ...current,
      category: categoryName,
      serviceNeeded: '',
      tags: [],
      photoUrls: current.photoUrls,
    }));
    setErrors((current) => ({
      ...current,
      category: undefined,
      serviceNeeded: undefined,
    }));
  };

  const openServicePicker = () => {
    if (!draft.category) {
      Alert.alert('Service Needed', 'Choose a job category first.');
      return;
    }
    setServicePickerVisible(true);
  };

  const toggleTag = (tag: string) => {
    setDraft((current) => {
      const hasTag = current.tags.includes(tag);
      if (hasTag) {
        return { ...current, tags: current.tags.filter((item) => item !== tag) };
      }
      if (current.tags.length >= 4) return current;
      return { ...current, tags: [...current.tags, tag] };
    });
  };

  const removePhoto = (url: string) => {
    setDraft((current) => ({
      ...current,
      photoUrls: current.photoUrls.filter((item) => item !== url),
    }));
  };

  const addPhotos = async () => {
    if (uploadingPhotos) return;

    const remaining = MAX_JOB_PHOTOS - draft.photoUrls.length;
    if (remaining <= 0) {
      Alert.alert('Add Photos', 'You can add up to 10 photos.');
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ['image/*'],
    });

    if (result.canceled || !result.assets?.length) return;

    const assets: JobPhotoAsset[] = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
      mimeType: asset.mimeType ?? null,
      name: asset.name ?? null,
      size: asset.size ?? null,
    }));

    setUploadingPhotos(true);
    const uploaded = await uploadJobPhotos({
      assets,
      folderId: draftId ?? photoFolderId,
    });
    setUploadingPhotos(false);

    if (uploaded.error || !uploaded.data) {
      Alert.alert('Add Photos', uploaded.error ?? 'Could not upload photos.');
      return;
    }

    setDraft((current) => ({
      ...current,
      photoUrls: Array.from(new Set([...current.photoUrls, ...uploaded.data])).slice(0, MAX_JOB_PHOTOS),
    }));
  };

  const onNext = async () => {
    if (uploadingPhotos) {
      Alert.alert('Add Photos', 'Wait for the photos to finish uploading.');
      return;
    }

    const validation = validateDraft(draft);
    setErrors(validation);

    if (Object.keys(validation).length) return;

    setSavingDraft(true);
    const saved = await saveJobDraft({ draftId, input: buildDraftInput(draft) });
    setSavingDraft(false);

    if (saved.error || !saved.data) {
      Alert.alert('Draft', saved.error ?? 'Could not save this draft.');
      return;
    }

    setDraftId(saved.data.id);

    router.push({
      pathname: '/create-job-preview',
      params: {
        draft: JSON.stringify(draft),
        draftId: saved.data.id,
      },
    });
  };

  if (loading || loadingDraft) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={{ width: 24, height: 24 }} />
          <Skeleton height={20} width={100} />
          <View style={{ width: 24, height: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <CreateJobSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>New job post</Text>
          <Pressable
            accessibilityRole="button"
            disabled={savingDraft || uploadingPhotos}
            onPress={onNext}
            style={({ pressed }) => [
              (savingDraft || uploadingPhotos) && styles.disabled,
              pressed && !savingDraft && !uploadingPhotos && styles.pressed,
            ]}>
            <Text style={styles.headerAction}>
              {uploadingPhotos ? 'Uploading...' : savingDraft ? 'Saving...' : 'Next'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
              <View style={styles.avatarDot} />
            </View>
            <View style={styles.userCopy}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userMeta}>Creating a job post</Text>
            </View>
          </View>

          {draft.photoUrls.length ? (
            <View style={[styles.photoCard, uploadingPhotos && styles.disabled]}>
              <ScrollView
                horizontal
                contentContainerStyle={styles.photoStrip}
                showsHorizontalScrollIndicator={false}>
                {draft.photoUrls.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.photoTile}>
                    <Image resizeMode="cover" source={{ uri: url }} style={styles.photoThumb} />
                    <Pressable
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      accessibilityRole="button"
                      onPress={() => removePhoto(url)}
                      style={({ pressed }) => [styles.photoRemoveButton, pressed && styles.photoRemoveButtonPressed]}>
                      <MaterialIcons color={color.white} name="close" size={14} />
                    </Pressable>
                  </View>
                ))}
                {draft.photoUrls.length < MAX_JOB_PHOTOS ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={uploadingPhotos}
                    onPress={addPhotos}
                    style={({ pressed }) => [
                      styles.photoAddTile,
                      pressed && !uploadingPhotos && styles.pressed,
                      uploadingPhotos && styles.disabled,
                    ]}>
                    <MaterialIcons color={color.verificationBlue} name="add" size={22} />
                    <Text style={styles.photoAddText}>Add more</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
              <Text style={styles.photoCountText}>
                {uploadingPhotos ? 'Uploading photos...' : `${draft.photoUrls.length}/10 photos added`}
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={addPhotos}
              style={({ pressed }) => [
                styles.photoCard,
                styles.photoCardEmpty,
                pressed && styles.pressed,
                uploadingPhotos && styles.disabled,
              ]}>
              <View style={styles.photoIcon}>
                <MaterialIcons color={color.verificationBlue} name="add-to-photos" size={22} />
              </View>
              <Text style={styles.photoTitle}>Add Photos</Text>
            </Pressable>
          )}
          <Text style={styles.helperText}>
            <Text style={styles.helperStrong}>Optional</Text>, but helps workers understand the job.
          </Text>

          <View style={styles.group}>
            <Text style={styles.label}>Job Category</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryPickerVisible(true)}
              style={({ pressed }) => [
                styles.selectBox,
                errors.category && styles.inputErrorBorder,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.selectText, !draft.category && styles.placeholderText]} numberOfLines={1}>
                {draft.category || 'Choose a category'}
              </Text>
              <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
            </Pressable>
            <FieldError message={errors.category} />
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>Service Needed</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.category }}
              onPress={openServicePicker}
              style={({ pressed }) => [
                styles.selectBox,
                !draft.category && styles.selectBoxDisabled,
                errors.serviceNeeded && styles.inputErrorBorder,
                pressed && draft.category && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.selectText,
                  !draft.serviceNeeded && styles.placeholderText,
                  !draft.category && styles.disabledText,
                ]}
                numberOfLines={1}>
                {draft.serviceNeeded || 'Choose the service needed'}
              </Text>
              <MaterialIcons
                color={draft.category ? color.verificationBlue : '#AFAFAF'}
                name="keyboard-arrow-down"
                size={24}
              />
            </Pressable>
            <FieldError message={errors.serviceNeeded} />
          </View>

          <View style={styles.group}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.label}>Add tags</Text>
                <Text style={styles.smallHelper}>Choose up to 4 tags that describe the job.</Text>
              </View>
              <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-up" size={24} />
            </View>
            <ChipWrap items={tagOptions} selected={draft.tags} onPress={toggleTag} />
            <Text style={styles.smallHelper}>{selectedTagsText || 'No tags selected'}</Text>
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>Job Information</Text>
            <FormInput
              error={errors.title}
              onChangeText={(value) => updateDraft('title', value)}
              placeholder="Job Title"
              value={draft.title}
            />
            <View style={styles.twoColumn}>
              <FormInput
                error={errors.budget}
                keyboardType="numeric"
                onChangeText={(value) => updateDraft('budget', value)}
                placeholder="Budget"
                style={styles.halfInput}
                value={draft.budget}
              />
              <FormInput
                error={errors.workersNeeded}
                keyboardType="numeric"
                onChangeText={(value) => updateDraft('workersNeeded', value)}
                placeholder="Workers"
                style={styles.halfInput}
                value={draft.workersNeeded}
              />
            </View>
            <FormInput
              onChangeText={(value) => updateDraft('scheduleText', value)}
              placeholder="Start time"
              value={draft.scheduleText}
            />
            <FormInput
              error={errors.description}
              multiline
              onChangeText={(value) => updateDraft('description', value)}
              placeholder="What needs to be done"
              value={draft.description}
            />
          </View>

          <View style={styles.sectionBand}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>Barangay</Text>
                <Text style={styles.smallHelper}>Only your barangay will be shown publicly.</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBarangayPickerVisible(true)}
              style={({ pressed }) => [
                styles.selectBox,
                errors.locationText && styles.selectBoxError,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.selectText,
                  !draft.locationText && styles.placeholderText,
                ]}
                numberOfLines={1}>
                {draft.locationText || 'Choose barangay'}
              </Text>
              <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
            </Pressable>
            <FieldError message={errors.locationText} />
            <LocationMapPreview />
          </View>

          <View style={styles.sectionBand}>
            <Text style={styles.sectionTitle}>Listing Options</Text>
            <Text style={styles.smallHelper}>Control how workers can respond to this post.</Text>
            <ToggleRow
              description="Let workers ask questions before you choose who to hire."
              label="Allow messages before hiring"
              onValueChange={(value) => updateDraft('allowMessages', value)}
              value={draft.allowMessages}
            />
            <ToggleRow
              description="Send a quick reply when someone messages."
              label="Auto-reply"
              onValueChange={(value) => updateDraft('autoReplyEnabled', value)}
              value={draft.autoReplyEnabled}
            />
            <ToggleRow
              description="Hide this post after the start time or when all workers are accepted."
              label="Auto-close post"
              onValueChange={(value) => updateDraft('autoCloseEnabled', value)}
              value={draft.autoCloseEnabled}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PostOptionPickerSheet
        allOptions={[...JOB_CATEGORIES]}
        description="Pick the type of job you need"
        onClose={() => setCategoryPickerVisible(false)}
        onSelect={selectCategory}
        popularOptions={POPULAR_JOB_CATEGORIES}
        searchPlaceholder="Search Categories"
        selectedValue={draft.category}
        title="Choose job category"
        visible={categoryPickerVisible}
      />
      <PostOptionPickerSheet
        allOptions={serviceOptions}
        description={`Choose the specific help for ${draft.category || 'this category'}`}
        onClose={() => setServicePickerVisible(false)}
        onSelect={(value) => updateDraft('serviceNeeded', value)}
        popularLabel="Suggested"
        popularOptions={serviceOptions.slice(0, 2)}
        searchPlaceholder="Search Services"
        selectedValue={draft.serviceNeeded}
        title="Service needed"
        visible={servicePickerVisible}
      />
      <BarangayPickerSheet
        description="Only your barangay is shown publicly."
        onClose={() => setBarangayPickerVisible(false)}
        onSelect={(value) =>
          setDraft((current) => ({
            ...current,
            barangay: value,
            locationText: value,
          }))
        }
        options={['Barangay San Pedro']}
        searchPlaceholder="Search barangay"
        selectedValue={draft.locationText}
        title="Choose barangay"
        visible={barangayPickerVisible}
      />
    </SafeAreaView>
  );
}

function ChipWrap({
  items,
  selected,
  onPress,
}: {
  items: string[];
  selected: string[];
  onPress: (item: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={item}
            onPress={() => onPress(item)}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FormInput({
  error,
  multiline,
  onChangeText,
  placeholder,
  value,
  keyboardType,
  style,
}: {
  error?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
  keyboardType?: 'default' | 'numeric';
  style?: object;
}) {
  return (
    <View style={[styles.inputWrap, style]}>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AFAFAF"
        style={[styles.input, multiline && styles.textArea, error && styles.inputErrorBorder]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      <FieldError message={error} />
    </View>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.errorText}>{message}</Text>;
}

function CreateJobSkeleton() {
  return (
    <>
      <View style={styles.userRow}>
        <Skeleton height={46} width={46} borderRadius={radius.pill} />
        <View style={styles.userCopy}>
          <Skeleton height={16} width="52%" />
          <Skeleton height={12} width="38%" />
        </View>
      </View>

      <View style={styles.photoCard}>
        <Skeleton height={42} width={42} borderRadius={radius.pill} />
        <Skeleton height={16} width={88} />
      </View>
      <Skeleton height={11} width="86%" style={{ marginBottom: space.md, marginTop: space.sm }} />

      <View style={styles.group}>
        <Skeleton height={14} width={96} />
        <View style={styles.selectBox}>
          <Skeleton height={16} width="66%" />
          <Skeleton height={24} width={24} borderRadius={radius.sm} />
        </View>
        <View style={styles.chipWrap}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={32} width={index % 2 ? 96 : 81} borderRadius={radius.pill} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Skeleton height={14} width={70} />
            <Skeleton height={10} width="70%" style={{ marginTop: space.xs }} />
          </View>
          <Skeleton height={24} width={24} borderRadius={radius.sm} />
        </View>
        <View style={styles.chipWrap}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={32} width={index === 2 ? 104 : 81} borderRadius={radius.pill} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Skeleton height={14} width={112} />
        <Skeleton height={46} width="100%" borderRadius={radius.md} />
        <View style={styles.twoColumn}>
          <Skeleton height={46} width="48%" borderRadius={radius.md} />
          <Skeleton height={46} width="48%" borderRadius={radius.md} />
        </View>
        <Skeleton height={46} width="100%" borderRadius={radius.md} />
        <Skeleton height={123} width="100%" borderRadius={radius.md} />
      </View>

      <View style={styles.sectionBand}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Skeleton height={15} width={72} />
            <Skeleton height={10} width="74%" style={{ marginTop: space.xs }} />
          </View>
          <Skeleton height={15} width={28} />
        </View>
        <Skeleton height={46} width="100%" borderRadius={radius.md} />
        <View style={styles.mapPlaceholder}>
          <Skeleton height={16} width={76} />
        </View>
      </View>

      <View style={styles.sectionBand}>
        <Skeleton height={15} width={110} />
        <Skeleton height={10} width="76%" />
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Skeleton height={14} width={index === 0 ? '72%' : '44%'} />
              <Skeleton height={11} width="92%" />
            </View>
            <Skeleton height={24} width={40} borderRadius={radius.pill} />
          </View>
        ))}
      </View>
    </>
  );
}

function ToggleRow({
  description,
  label,
  onValueChange,
  value,
}: {
  description: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        onPress={() => onValueChange(!value)}
        style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  formContent: {
    gap: space.md,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  formGroup: {
    gap: space.sm,
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
  headerAction: {
    ...typography.bodyMedium,
    color: color.verificationBlue,
  },
  content: {
    paddingBottom: space['3xl'],
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    color: color.text,
  },
  avatarDot: {
    backgroundColor: color.brandYellow,
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
  },
  userCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  userName: {
    ...typography.sectionTitle,
    color: color.text,
  },
  userMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  photoCard: {
    borderColor: color.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: space.sm,
    padding: space.md,
    width: '100%',
  },
  photoCardEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  photoIcon: {
    alignItems: 'center',
    borderColor: color.verificationBlue,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  photoTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  photoStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  photoTile: {
    height: 84,
    position: 'relative',
    width: 84,
  },
  photoThumb: {
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  photoRemoveButton: {
    alignItems: 'center',
    backgroundColor: color.text,
    borderColor: color.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
  },
  photoRemoveButtonPressed: {
    opacity: 0.8,
  },
  photoAddTile: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  photoAddText: {
    ...typography.captionMedium,
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    marginTop: space.xs,
  },
  photoCountText: {
    ...typography.caption,
    color: color.textMuted,
    paddingHorizontal: space.xs,
    textAlign: 'center',
  },
  helperText: {
    ...typography.tiny,
    color: color.textMuted,
    marginBottom: space.md,
    marginTop: space.sm,
  },
  helperStrong: {
    fontFamily: 'Satoshi-Bold',
  },
  group: {
    gap: space.sm,
    marginBottom: space.lg,
  },
  label: {
    ...typography.body,
    color: color.textMuted,
  },
  selectBox: {
    alignItems: 'center',
    borderColor: '#AFAFAF',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: space.md,
  },
  selectBoxError: {
    borderColor: color.danger,
  },
  selectBoxDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: color.border,
  },
  selectText: {
    ...typography.body,
    color: color.text,
    flex: 1,
    paddingVertical: space.md,
  },
  placeholderText: {
    color: '#AFAFAF',
  },
  disabledText: {
    color: '#AFAFAF',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  smallHelper: {
    ...typography.tiny,
    color: color.textMuted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 81,
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
  twoColumn: {
    flexDirection: 'row',
    gap: space.sm,
  },
  inputWrap: {
    flex: 1,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    ...typography.body,
    borderColor: '#AFAFAF',
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === 'ios' ? space.md : space.sm,
  },
  textArea: {
    minHeight: 123,
    paddingTop: space.md,
  },
  inputErrorBorder: {
    borderColor: color.danger,
  },
  errorText: {
    ...typography.caption,
    color: color.danger,
    marginTop: space.xs,
  },
  sectionBand: {
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: space.sm,
    marginHorizontal: -space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  flex: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  editLink: {
    ...typography.body,
    color: color.primary,
  },
  mapPlaceholder: {
    backgroundColor: color.cardTint,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 154,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  toggleCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  toggleTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  toggleDescription: {
    ...typography.caption,
    color: color.text,
  },
  toggleTrack: {
    backgroundColor: '#A1A1AA',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    padding: 4,
    width: 40,
  },
  toggleTrackOn: {
    backgroundColor: color.verificationBlue,
  },
  toggleKnob: {
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 16,
    width: 16,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.6,
  },
});
