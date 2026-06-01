import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import type { ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { BarangayPickerSheet } from '@/components/BarangayPickerSheet';
import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { useFeedback } from '@/components/FeedbackProvider';
import { GroupedServicePickerSheet } from '@/components/GroupedServicePickerSheet';
import { LocationMapPreview } from '@/components/LocationMapPreview';
import { CurrentUserIdentityRow } from '@/components/profile/CurrentUserIdentity';
import { RateRangeInput } from '@/components/RateRangeInput';
import { Skeleton } from '@/components/Skeleton';
import {
  getServiceTagsForCategory,
  SERVICE_POST_CATEGORIES,
  SERVICE_POST_OPTIONS_BY_CATEGORY,
} from '@/constants/service-post-options';
import { getCategoryForMvpService } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { useDraftAutosave } from '@/hooks/use-draft-autosave';
import { useProfile } from '@/hooks/use-profile';
import { validateRateRange } from '@/services/marketplace.helpers';
import { getServiceDraft, saveServiceDraft } from '@/services/service-draft.service';
import { type ServicePhotoAsset, uploadServicePhotos } from '@/services/service-photo.service';
import { getMyService, updateService } from '@/services/service-profile.service';
import type {
  CreateServiceInput,
  ExperienceLevel,
  ProviderService,
  RateType,
  ServiceDraftSummary,
  UpsertServiceDraftInput,
} from '@/types/marketplace.types';

const MAX_SERVICE_PHOTOS = 10;

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'any', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'experienced', label: 'Experienced' },
];

type ServiceDraftErrors = Partial<
  Record<'category' | 'customCategory' | 'title' | 'description' | 'locationText' | 'rateMin', string>
>;

function parsePositiveNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function hasMeaningfulDraft(input: UpsertServiceDraftInput) {
  return Boolean(
    input.category?.trim() ||
      input.customCategory?.trim() ||
      input.title?.trim() ||
      input.description?.trim() ||
      input.tags?.length ||
      input.photoUrls?.length ||
      input.availabilityText?.trim() ||
      input.rateText?.trim() ||
      input.rateMin ||
      input.rateMax ||
      input.certificationNote?.trim() ||
      input.rateType !== 'per_service' ||
      input.rateNegotiable ||
      input.experienceLevel !== 'any' ||
      input.certificationAvailable ||
      input.allowMessages === false ||
      input.autoReplyEnabled ||
      input.autoPauseEnabled
  );
}

export default function CreateServiceScreen() {
  const router = useRouter();
  const { showSuccessToast } = useFeedback();
  const params = useLocalSearchParams<{
    draftId?: string | string[];
    serviceId?: string | string[];
    returnTo?: string | string[];
    focus?: string | string[];
  }>();
  const initialDraftId = getParamValue(params.draftId);
  const serviceId = getParamValue(params.serviceId);
  const returnTo = getParamValue(params.returnTo);
  const focusTarget = getParamValue(params.focus);
  const scrollRef = useRef<ScrollView>(null);
  const rateRangeOffsetRef = useRef<number | null>(null);
  const handledFocusRef = useRef(false);
  const { profile, loading, refresh } = useProfile();
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [rate, setRate] = useState('');
  const [rateMin, setRateMin] = useState('');
  const [rateMax, setRateMax] = useState('');
  const [rateType, setRateType] = useState<RateType>('per_service');
  const [rateNegotiable, setRateNegotiable] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('any');
  const [certificationAvailable, setCertificationAvailable] = useState(false);
  const [certificationNote, setCertificationNote] = useState('');
  const [allowMessages, setAllowMessages] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(false);
  const [errors, setErrors] = useState<ServiceDraftErrors>({});
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [barangayPickerVisible, setBarangayPickerVisible] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [draftHydrated, setDraftHydrated] = useState(!initialDraftId);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(initialDraftId));
  const [loadingService, setLoadingService] = useState(Boolean(serviceId));
  const [savingService, setSavingService] = useState(false);
  const [photoFolderId] = useState(() => `service-draft-${Date.now()}`);
  const [locationBarangay, setLocationBarangay] = useState('Barangay San Pedro');
  const locationText = locationBarangay;
  const tagOptions = useMemo(() => getServiceTagsForCategory(category), [category]);
  const selectedTagsText = useMemo(() => tags.join(', '), [tags]);
  const serviceGroup = getCategoryForMvpService(category);

  const scrollToRateRange = useCallback(() => {
    if (loading || loadingDraft || loadingService || focusTarget !== 'rate-range' || handledFocusRef.current) return;
    if (rateRangeOffsetRef.current === null) return;

    handledFocusRef.current = true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(rateRangeOffsetRef.current! - space.md, 0),
      });
    });
  }, [focusTarget, loading, loadingDraft, loadingService]);

  useEffect(() => {
    handledFocusRef.current = false;
  }, [focusTarget]);

  useEffect(() => {
    scrollToRateRange();
  }, [scrollToRateRange]);

  useEffect(() => {
    if (profile?.barangay) {
      setLocationBarangay(profile.barangay);
    }
  }, [profile?.barangay]);

  useEffect(() => {
    if (!serviceId) return;
    let active = true;

    setLoadingService(true);
    getMyService(serviceId).then((result) => {
      if (!active) return;

      if (result.error || !result.data) {
        Alert.alert('Service', result.error ?? 'Could not load this service.');
        router.back();
        return;
      }

      hydrateService(result.data, {
        setAllowMessages,
        setAutoPauseEnabled,
        setAutoReplyEnabled,
        setAvailability,
        setCategory,
        setCertificationAvailable,
        setCertificationNote,
        setCustomCategory,
        setDescription,
        setExperienceLevel,
        setLocationBarangay,
        setPhotoUrls,
        setRate,
        setRateMax,
        setRateMin,
        setRateNegotiable,
        setRateType,
        setTags,
        setTitle,
      });
      setLoadingService(false);
    });

    return () => {
      active = false;
    };
  }, [router, serviceId]);

  useEffect(() => {
    if (!initialDraftId || serviceId) return;
    let active = true;

    void (async () => {
      setLoadingDraft(true);
      try {
        const result = await getServiceDraft(initialDraftId);
        if (!active) return;

        if (result.error || !result.data) {
          Alert.alert('Draft', result.error ?? 'Could not load this draft.');
        } else {
          hydrateService(result.data, {
            setAllowMessages,
            setAutoPauseEnabled,
            setAutoReplyEnabled,
            setAvailability,
            setCategory,
            setCertificationAvailable,
            setCertificationNote,
            setCustomCategory,
            setDescription,
            setExperienceLevel,
            setLocationBarangay,
            setPhotoUrls,
            setRate,
            setRateMax,
            setRateMin,
            setRateNegotiable,
            setRateType,
            setTags,
            setTitle,
          });
        }
      } catch {
        if (active) {
          Alert.alert('Draft', 'Could not load this draft right now.');
        }
      } finally {
        if (active) {
          setDraftHydrated(true);
          setLoadingDraft(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [initialDraftId, serviceId]);

  const selectCategory = (value: string) => {
    setCategory(value);
    setCustomCategory('');
    setTags([]);
    setErrors((current) => ({ ...current, category: undefined, customCategory: undefined }));
  };

  const clearError = (key: keyof ServiceDraftErrors) => {
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const toggleTag = (tag: string) => {
    setTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= 4) return current;
      return [...current, tag];
    });
  };

  const buildServiceDraftInput = useCallback((): UpsertServiceDraftInput => {
    const parsedRateMin = parsePositiveNumber(rateMin);
    const parsedRateMax = parsePositiveNumber(rateMax);

    return {
      category,
      customCategory: customCategory.trim(),
      title,
      description,
      tags,
      photoUrls,
      availabilityText: availability,
      rateText: rate,
      rateMin: Number.isNaN(parsedRateMin) ? null : parsedRateMin,
      rateMax: Number.isNaN(parsedRateMax) ? null : parsedRateMax,
      rateType,
      rateNegotiable,
      experienceLevel,
      certificationAvailable,
      certificationNote,
      barangay: locationText,
      locationText,
      allowMessages,
      autoReplyEnabled,
      autoPauseEnabled,
    };
  }, [
    allowMessages,
    autoPauseEnabled,
    autoReplyEnabled,
    availability,
    category,
    certificationAvailable,
    certificationNote,
    customCategory,
    description,
    experienceLevel,
    locationText,
    photoUrls,
    rate,
    rateMax,
    rateMin,
    rateNegotiable,
    rateType,
    tags,
    title,
  ]);

  const serviceDraftInput = useMemo(() => buildServiceDraftInput(), [buildServiceDraftInput]);
  const { flush: flushDraft } = useDraftAutosave({
    draftId,
    enabled: !serviceId && !loading && !loadingDraft,
    hydrated: draftHydrated,
    input: serviceDraftInput,
    isMeaningful: hasMeaningfulDraft,
    onDraftIdChange: setDraftId,
    saveDraft: saveServiceDraft,
  });

  const buildServiceInput = (): CreateServiceInput => ({
    ...serviceDraftInput,
    category,
    title,
    tags: Array.from(
      new Set([serviceGroup, category, ...tags].filter((value): value is string => Boolean(value))),
    ),
  });

  const onNext = async () => {
    if (uploadingPhotos) {
      Alert.alert('Add Photos', 'Wait for the photos to finish uploading.');
      return;
    }
    const serviceInput = buildServiceInput();
    const validation: ServiceDraftErrors = {};
    if (!category.trim()) validation.category = 'Choose a service.';
    if (category === 'Other service' && !customCategory.trim()) {
      validation.customCategory = 'Describe the service so barangay admins can review it.';
    }
    if (!title.trim()) validation.title = 'Enter a short service title.';
    if (!description.trim()) validation.description = 'Describe what clients can expect from this service.';
    if (!locationText.trim()) validation.locationText = 'Choose a barangay.';

    const rateRange = validateRateRange({
      min: serviceInput.rateMin,
      max: serviceInput.rateMax,
      rateType,
    });
    if (!rateRange.valid) {
      validation.rateMin = rateRange.error ?? 'Enter a valid rate range.';
    }
    setErrors(validation);

    if (Object.keys(validation).length) return;

    if (serviceId) {
      setSavingService(true);
      const result = await updateService({
        serviceId,
        input: serviceInput,
      });
      setSavingService(false);

      if (result.error || !result.data) {
        Alert.alert('Service', result.error ?? 'Could not save this service.');
        return;
      }

      await refresh();
      showSuccessToast('Service saved');
      if (returnTo === 'profile') {
        router.replace('/(tabs)/profile');
        return;
      }

      router.back();
      return;
    }

    setSavingService(true);
    const saved = await flushDraft(serviceDraftInput);
    setSavingService(false);

    if (!saved || saved.error || !saved.data) {
      Alert.alert('Draft', saved?.error ?? 'Could not save this draft.');
      return;
    }

    router.push({
      pathname: '/create-service-preview',
      params: {
        draftId: saved.data.id,
        returnTo,
        draft: JSON.stringify({
          allowMessages,
          autoPauseEnabled,
          autoReplyEnabled,
          availability,
          category,
          customCategory: customCategory.trim(),
          description,
          serviceGroup,
          experienceLevel,
          certificationAvailable,
          certificationNote,
          tags,
          locationText,
          photoUrls,
          rate,
          rateMin,
          rateMax,
          rateType,
          rateNegotiable,
          title,
        }),
      },
    });
  };

  if (loading || loadingDraft || loadingService) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={{ width: 24, height: 24 }} />
          <Skeleton height={20} width={100} />
          <View style={{ width: 24, height: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <CreateServiceSkeleton />
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
          <Text style={styles.headerTitle}>{serviceId ? 'Edit service' : 'New service post'}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={savingService || uploadingPhotos}
            onPress={onNext}
            style={({ pressed }) => [
              (savingService || uploadingPhotos) && styles.disabled,
              pressed && !savingService && !uploadingPhotos && styles.pressed,
            ]}>
            <Text style={styles.headerAction}>
              {uploadingPhotos ? 'Uploading...' : savingService ? 'Saving...' : serviceId ? 'Save' : 'Next'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Section
            helper="Start with one clear service clients can find and understand quickly."
            title="What service do you offer?">
            <CurrentUserIdentityRow subtitle={serviceId ? 'Editing a service post' : 'Creating a service post'} />

            {photoUrls.length ? (
              <View style={[styles.photoCard, uploadingPhotos && styles.disabled]}>
                <ScrollView horizontal contentContainerStyle={styles.photoStrip} showsHorizontalScrollIndicator={false}>
                  {photoUrls.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.photoTile}>
                      <CachedRemoteImage uri={url} style={styles.photoThumb} />
                      <Pressable
                        accessibilityLabel={`Remove photo ${index + 1}`}
                        accessibilityRole="button"
                        onPress={() => setPhotoUrls((current) => current.filter((item) => item !== url))}
                        style={({ pressed }) => [styles.photoRemoveButton, pressed && styles.pressed]}>
                        <MaterialIcons color={color.white} name="close" size={14} />
                      </Pressable>
                    </View>
                  ))}
                  {photoUrls.length < MAX_SERVICE_PHOTOS ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={uploadingPhotos}
                      onPress={() => void addPhotos(photoUrls, setPhotoUrls, setUploadingPhotos, draftId ?? photoFolderId)}
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
                  {uploadingPhotos ? 'Uploading photos...' : `${photoUrls.length}/10 photos added`}
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={uploadingPhotos}
                onPress={() => void addPhotos(photoUrls, setPhotoUrls, setUploadingPhotos, draftId ?? photoFolderId)}
                style={({ pressed }) => [
                  styles.photoCard,
                  styles.photoCardEmpty,
                  pressed && !uploadingPhotos && styles.pressed,
                  uploadingPhotos && styles.disabled,
                ]}>
                <View style={styles.photoIcon}>
                  <MaterialIcons color={color.verificationBlue} name="add-to-photos" size={22} />
                </View>
                <Text style={styles.photoTitle}>{uploadingPhotos ? 'Uploading Photos' : 'Add Photos'}</Text>
              </Pressable>
            )}
            <Text style={styles.helperText}>
              <Text style={styles.helperStrong}>Optional</Text>, but photos help clients understand your past work.
            </Text>

            <View style={styles.group}>
              <Text style={styles.label}>Service</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setServicePickerVisible(true)}
                style={({ pressed }) => [
                  styles.selectBox,
                  errors.category && styles.inputErrorBorder,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.selectText, !category && styles.placeholderText]} numberOfLines={1}>
                  {category || 'Choose a service'}
                </Text>
                <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
              </Pressable>
              <Text style={styles.smallHelper}>One service per post. Create another post for a different service.</Text>
              {serviceGroup ? <Text style={styles.smallHelper}>Category: {serviceGroup}</Text> : null}
              <FieldError message={errors.category} />
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Not listed?</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: category === 'Other service' }}
                onPress={() => selectCategory('Other service')}
                style={({ pressed }) => [
                  styles.chip,
                  category === 'Other service' && styles.chipActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, category === 'Other service' && styles.chipTextActive]}>
                  Others / Specify
                </Text>
              </Pressable>
              {category === 'Other service' ? (
                <Field
                  error={errors.customCategory}
                  helperText="Custom services may be reviewed before they are shown widely."
                  label="Specify service"
                  onChangeText={(value) => {
                    setCustomCategory(value);
                    clearError('customCategory');
                  }}
                  placeholder="Example: Bicycle repair"
                  value={customCategory}
                />
              ) : null}
            </View>

            <Field
              error={errors.title}
              label="Service title"
              onChangeText={(value) => {
                setTitle(value);
                clearError('title');
              }}
              placeholder="Example: Home cleaning help"
              value={title}
            />
          </Section>

          <Section
            helper="Explain what clients can expect before they message you."
            title="Service details">
            <Field
              error={errors.description}
              label="Description"
              multiline
              onChangeText={(value) => {
                setDescription(value);
                clearError('description');
              }}
              placeholder="Describe your service, tools, and experience"
              value={description}
            />
            <View style={styles.group}>
              <Text style={styles.label}>Helpful tags</Text>
              <Text style={styles.smallHelper}>Choose up to 4 tags to help clients understand this service.</Text>
              {tagOptions.length ? (
                <View style={styles.chipWrap}>
                  {tagOptions.map((tag) => {
                    const active = tags.includes(tag);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View
                  accessibilityLabel="Select a service to show available tags"
                  accessibilityRole="text"
                  style={styles.tagEmptyBox}>
                  <View style={styles.tagEmptyIcon}>
                    <MaterialIcons color={color.textSubtle} name="local-offer" size={18} />
                  </View>
                  <Text style={styles.tagEmptyText}>Choose a service to see helpful tags.</Text>
                </View>
              )}
              <Text style={styles.smallHelper}>{selectedTagsText || 'No helpful tags added yet'}</Text>
            </View>
          </Section>

          <Section
            helper="Tell clients when you can help and the barangay you serve."
            title="Availability and location">
            <Field
              helperText="Keep this short and practical so clients know when to message."
              label="Availability"
              onChangeText={setAvailability}
              placeholder="Example: Weekends and weekday afternoons"
              value={availability}
            />
            <View style={styles.group}>
              <Text style={styles.label}>Barangay / general location</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setBarangayPickerVisible(true)}
                style={({ pressed }) => [
                  styles.selectBox,
                  errors.locationText && styles.inputErrorBorder,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.selectText, !locationText && styles.placeholderText]} numberOfLines={1}>
                  {locationText || 'Choose barangay'}
                </Text>
                <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
              </Pressable>
              <Text style={styles.smallHelper}>Only your barangay is shown publicly.</Text>
              <FieldError message={errors.locationText} />
            </View>
            <LocationMapPreview />
          </Section>

          <View
            onLayout={(event) => {
              rateRangeOffsetRef.current = event.nativeEvent.layout.y;
              scrollToRateRange();
            }}>
            <Section
              helper="Set a clear rate range. Final details can still be discussed in Messages."
              title="Pricing and negotiation">
              <RateRangeInput
                error={errors.rateMin}
                label="Rate range"
                maxValue={rateMax}
                minValue={rateMin}
                negotiable={rateNegotiable}
                onMaxChange={(value) => {
                  setRateMax(value);
                  clearError('rateMin');
                }}
                onMinChange={(value) => {
                  setRateMin(value);
                  clearError('rateMin');
                }}
                onNegotiableChange={setRateNegotiable}
                onRateTypeChange={setRateType}
                previewPrefix="Service rate"
                rateType={rateType}
              />
              <Field
                helperText="Optional. Mention useful details such as supplies or materials."
                label="Rate note"
                onChangeText={setRate}
                placeholder="Example: Cleaning supplies included"
                value={rate}
              />
            </Section>
          </View>

          <Section
            helper="Add optional details only when they help clients decide."
            title="Additional details">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: moreOptionsVisible }}
              onPress={() => setMoreOptionsVisible((visible) => !visible)}
              style={({ pressed }) => [styles.moreOptionsButton, pressed && styles.pressed]}>
              <View style={styles.flex}>
                <Text style={styles.moreOptionsTitle}>More options</Text>
                <Text style={styles.smallHelper}>Experience, certificates, and message settings.</Text>
              </View>
              <MaterialIcons
                color={color.verificationBlue}
                name={moreOptionsVisible ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
              />
            </Pressable>

            {moreOptionsVisible ? (
              <View style={styles.moreOptionsContent}>
                <View style={styles.group}>
                  <Text style={styles.label}>Experience level</Text>
                  <View style={styles.chipWrap}>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: experienceLevel === option.value }}
                        key={option.value}
                        onPress={() => setExperienceLevel(option.value)}
                        style={({ pressed }) => [
                          styles.chip,
                          experienceLevel === option.value && styles.chipActive,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.chipText, experienceLevel === option.value && styles.chipTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <ToggleRow
                  description="Only safe certificate details are shown publicly. Uploaded documents stay private."
                  label="Certification available"
                  onValueChange={setCertificationAvailable}
                  value={certificationAvailable}
                />
                {certificationAvailable ? (
                  <Field
                    label="Certification note"
                    onChangeText={setCertificationNote}
                    placeholder="Example: TESDA certificate available for admin review"
                    value={certificationNote}
                  />
                ) : null}
                <View style={styles.optionsGroup}>
                  <Text style={styles.optionsTitle}>Listing options</Text>
                  <Text style={styles.smallHelper}>Control how residents can respond to this service post.</Text>
                  <ToggleRow
                    description="Let verified residents contact you from this service post."
                    label="Allow messages"
                    onValueChange={setAllowMessages}
                    value={allowMessages}
                  />
                  <ToggleRow
                    description="Send a quick reply when someone messages from this post."
                    label="Auto-reply"
                    onValueChange={setAutoReplyEnabled}
                    value={autoReplyEnabled}
                  />
                  <ToggleRow
                    description="Pause this post when you are no longer available."
                    label="Pause post when unavailable"
                    onValueChange={setAutoPauseEnabled}
                    value={autoPauseEnabled}
                  />
                </View>
              </View>
            ) : null}
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <GroupedServicePickerSheet
        categories={[...SERVICE_POST_CATEGORIES]}
        description="Pick the one service this listing will highlight"
        onClose={() => setServicePickerVisible(false)}
        onSelect={selectCategory}
        searchPlaceholder="Search services"
        selectedCategory={serviceGroup}
        selectedService={category}
        servicesByCategory={SERVICE_POST_OPTIONS_BY_CATEGORY}
        title="Choose service"
        visible={servicePickerVisible}
      />
      <BarangayPickerSheet
        description="Only your barangay is shown publicly."
        onClose={() => setBarangayPickerVisible(false)}
        onSelect={(value) => {
          setLocationBarangay(value);
          clearError('locationText');
        }}
        options={['Barangay San Pedro']}
        searchPlaceholder="Search barangay"
        selectedValue={locationText}
        title="Choose barangay"
        visible={barangayPickerVisible}
      />
    </SafeAreaView>
  );
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function hydrateService(
  service: ProviderService | ServiceDraftSummary,
  setters: {
    setAllowMessages: (value: boolean) => void;
    setAutoPauseEnabled: (value: boolean) => void;
    setAutoReplyEnabled: (value: boolean) => void;
    setAvailability: (value: string) => void;
    setCategory: (value: string) => void;
    setCertificationAvailable: (value: boolean) => void;
    setCertificationNote: (value: string) => void;
    setCustomCategory: (value: string) => void;
    setDescription: (value: string) => void;
    setExperienceLevel: (value: ExperienceLevel) => void;
    setLocationBarangay: (value: string) => void;
    setPhotoUrls: (value: string[]) => void;
    setRate: (value: string) => void;
    setRateMax: (value: string) => void;
    setRateMin: (value: string) => void;
    setRateNegotiable: (value: boolean) => void;
    setRateType: (value: RateType) => void;
    setTags: (value: string[]) => void;
    setTitle: (value: string) => void;
  },
) {
  setters.setCategory(service.category ?? '');
  setters.setCustomCategory(service.customCategory ?? '');
  setters.setTitle(service.title ?? '');
  setters.setDescription(service.description ?? '');
  setters.setTags(service.tags);
  setters.setAvailability(service.availabilityText ?? '');
  setters.setRate(service.rateText ?? '');
  setters.setRateMin(service.rateMin ? String(service.rateMin) : '');
  setters.setRateMax(service.rateMax ? String(service.rateMax) : '');
  setters.setRateType(service.rateType);
  setters.setRateNegotiable(service.rateNegotiable);
  setters.setExperienceLevel(service.experienceLevel);
  setters.setCertificationAvailable(service.certificationAvailable);
  setters.setCertificationNote(service.certificationNote ?? '');
  setters.setAllowMessages(service.allowMessages);
  setters.setAutoReplyEnabled(service.autoReplyEnabled);
  setters.setAutoPauseEnabled(service.autoPauseEnabled);
  setters.setPhotoUrls(service.photoUrls);
  setters.setLocationBarangay(service.locationText ?? service.barangay ?? 'Barangay San Pedro');
}

function Section({
  children,
  helper,
  title,
}: {
  children: ReactNode;
  helper?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionBand}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {helper ? <Text style={styles.sectionHelper}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Field({
  compact,
  error,
  helperText,
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  compact?: boolean;
  error?: string;
  helperText?: string;
  keyboardType?: 'default' | 'numeric';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={[styles.group, compact && styles.flex]}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.smallHelper}>{helperText}</Text> : null}
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#AFAFAF"
        placeholder={placeholder}
        style={[
          styles.input,
          compact && styles.compactInput,
          multiline && styles.multiline,
          error && styles.inputErrorBorder,
        ]}
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

function CreateServiceSkeleton() {
  return (
    <>
      <View style={styles.sectionBand}>
        <View style={styles.sectionHeader}>
          <Skeleton height={15} width={176} />
          <Skeleton height={10} width="86%" />
        </View>
        <View style={styles.userRowSkeleton}>
          <Skeleton height={46} width={46} borderRadius={radius.pill} />
          <View style={styles.userCopySkeleton}>
            <Skeleton height={16} width="52%" />
            <Skeleton height={12} width="38%" />
          </View>
        </View>
        <View style={styles.photoCard}>
          <Skeleton height={42} width={42} borderRadius={radius.pill} />
          <Skeleton height={16} width={88} />
        </View>
        <Skeleton height={11} width="84%" />
        {Array.from({ length: 2 }).map((_, index) => (
          <View key={index} style={styles.group}>
            <Skeleton height={14} width={index ? 88 : 58} />
            <Skeleton height={46} width="100%" borderRadius={radius.md} />
          </View>
        ))}
      </View>

      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <View key={sectionIndex} style={styles.sectionBand}>
          <View style={styles.sectionHeader}>
            <Skeleton height={15} width={sectionIndex === 0 ? 112 : 164} />
            <Skeleton height={10} width="78%" />
          </View>
          <Skeleton height={sectionIndex === 0 ? 100 : 46} width="100%" borderRadius={radius.md} />
          {sectionIndex < 3 ? <Skeleton height={46} width="100%" borderRadius={radius.md} /> : null}
        </View>
      ))}
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

async function addPhotos(
  currentPhotos: string[],
  setPhotoUrls: (value: string[] | ((current: string[]) => string[])) => void,
  setUploadingPhotos: (value: boolean) => void,
  folderId: string,
) {
  const remaining = MAX_SERVICE_PHOTOS - currentPhotos.length;
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

  const assets: ServicePhotoAsset[] = result.assets.slice(0, remaining).map((asset) => ({
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    name: asset.name ?? null,
    size: asset.size ?? null,
  }));

  setUploadingPhotos(true);
  const uploaded = await uploadServicePhotos({ assets, folderId });
  setUploadingPhotos(false);

  if (uploaded.error || !uploaded.data) {
    Alert.alert('Add Photos', uploaded.error ?? 'Could not upload photos.');
    return;
  }

  setPhotoUrls((existing) =>
    Array.from(new Set([...existing, ...uploaded.data])).slice(0, MAX_SERVICE_PHOTOS),
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
  header: {
    alignItems: 'center',
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
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space['3xl'],
  },
  group: {
    gap: space.sm,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: space.sm,
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
    width: '100%',
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
  helperText: {
    ...typography.tiny,
    color: color.textMuted,
  },
  smallHelper: {
    ...typography.tiny,
    color: color.textMuted,
  },
  helperStrong: {
    fontFamily: 'Satoshi-Bold',
  },
  tagEmptyBox: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 46,
    paddingHorizontal: space.md,
  },
  tagEmptyIcon: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  tagEmptyText: {
    ...typography.captionMedium,
    color: color.textSubtle,
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
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
  chip: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 81,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  chipActive: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  chipTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  moreChip: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  moreChipText: {
    color: color.primary,
  },
  input: {
    ...typography.body,
    backgroundColor: color.background,
    borderColor: '#AFAFAF',
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  compactInput: {
    minWidth: 0,
  },
  multiline: {
    minHeight: 123,
    textAlignVertical: 'top',
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
  sectionHeader: {
    gap: space['2xs'],
    marginBottom: space.xs,
  },
  sectionHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  moreOptionsButton: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 54,
    padding: space.md,
  },
  moreOptionsContent: {
    gap: space.md,
  },
  moreOptionsTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  optionsGroup: {
    gap: space.md,
  },
  optionsTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  editLink: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  locationText: {
    ...typography.bodyMedium,
    color: color.text,
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
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: space.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: color.text,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.6,
  },
  userRowSkeleton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  userCopySkeleton: {
    flex: 1,
    gap: space['2xs'],
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: color.textMuted,
  },
});
