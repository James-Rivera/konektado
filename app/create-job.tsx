import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { BottomSheet } from '@/components/BottomSheet';
import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { PostOptionPickerSheet } from '@/components/PostOptionPickerSheet';
import { LocationMapPreview } from '@/components/LocationMapPreview';
import { CurrentUserIdentityRow } from '@/components/profile/CurrentUserIdentity';
import { RateRangeInput } from '@/components/RateRangeInput';
import { Skeleton } from '@/components/Skeleton';
import {
  getContextTagsForCategory,
  getServicesForCategory,
  JOB_CATEGORIES,
  POPULAR_JOB_CATEGORIES,
} from '@/constants/job-post-options';
import { getCategoryForMvpService, getStoredMvpServiceOption } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import { useDraftAutosave } from '@/hooks/use-draft-autosave';
import { useProfile } from '@/hooks/use-profile';
import { validateRateRange } from '@/services/marketplace.helpers';
import { getJobDraft, saveJobDraft } from '@/services/job-draft.service';
import { type JobPhotoAsset, uploadJobPhotos } from '@/services/job-photo.service';
import { getMyProfileCompletion } from '@/services/profile-completion.service';
import type {
  ExperienceLevel,
  JobDraftSummary,
  RateType,
  UpsertJobDraftInput,
} from '@/types/marketplace.types';

const MAX_JOB_PHOTOS = 10;

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'any', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'experienced', label: 'Experienced' },
];

type WorkersNeededOption = '1' | '2' | '3' | '4' | '5';
type TimeBlock = 'morning' | 'afternoon' | 'evening' | 'anytime';
type TimePreference = TimeBlock | 'exact';
type ScheduleFlexibility = 'fixed' | 'flexible';

const WORKERS_NEEDED_OPTIONS: { value: WorkersNeededOption; label: string }[] = [
  { value: '1', label: '1 worker' },
  { value: '2', label: '2 workers' },
  { value: '3', label: '3 workers' },
  { value: '4', label: '4 workers' },
  { value: '5', label: '5+ workers' },
];

const ADDITIONAL_DETAIL_OPTIONS = [
  'Bring own tools',
  'Experience preferred',
  'Urgent task',
  'Contact first before visiting',
  'Materials provided',
  'Heavy lifting',
  'Outdoor work',
  'Other',
];

const TIME_PREFERENCE_OPTIONS: { value: TimePreference; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
  { value: 'exact', label: 'Set exact time' },
];

const SCHEDULE_FLEXIBILITY_OPTIONS: { value: ScheduleFlexibility; label: string }[] = [
  { value: 'fixed', label: 'Must be this time' },
  { value: 'flexible', label: 'Can coordinate' },
];

const BUDGET_PRESET_OPTIONS = [
  { label: 'PHP 300-500', min: '300', max: '500' },
  { label: 'PHP 500-1,000', min: '500', max: '1000' },
  { label: 'PHP 1,000-2,000', min: '1000', max: '2000' },
  { label: 'PHP 2,000+', min: '2000', max: '3000' },
];

const DEFAULT_EXACT_TIME = '08:00';

function normalizeQuickDetailTags(tags: string[]) {
  return Array.from(new Set(tags.filter((tag) => tag !== 'Flexible schedule'))).slice(0, 4);
}

type JobDraft = {
  title: string;
  description: string;
  category: string;
  serviceNeeded: string;
  tags: string[];
  photoUrls: string[];
  barangay: string;
  locationText: string;
  privateLocationNotes: string;
  budgetMin: string;
  budgetMax: string;
  rateType: RateType;
  budgetNegotiable: boolean;
  workersNeeded: string;
  scheduleText: string;
  legacyScheduleText: string;
  jobDate: string;
  preferredTimeBlock: TimeBlock | '';
  exactTimeNeeded: boolean;
  exactTime: string;
  scheduleFlexibility: ScheduleFlexibility;
  experienceLevel: ExperienceLevel;
  certificationRequired: boolean;
  certificationNote: string;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
};

type JobDraftErrors = Partial<Record<keyof JobDraft, string>>;

function parsePositiveNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function getTodayAtStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isPastDateValue(value: string) {
  const date = parseDateValue(value);
  if (!date) return false;
  return date < getTodayAtStart();
}

function formatScheduleDate(value: string) {
  const date = parseDateValue(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getTimePickerDate(value: string) {
  const [hours, minutes] = (value || DEFAULT_EXACT_TIME).split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
}

function inferTimeBlockFromExactTime(value: string): TimeBlock | '' {
  const [rawHours] = value.split(':').map(Number);
  if (!Number.isFinite(rawHours)) return '';
  if (rawHours >= 5 && rawHours < 12) return 'morning';
  if (rawHours >= 12 && rawHours < 18) return 'afternoon';
  if (rawHours >= 18 && rawHours < 24) return 'evening';
  return '';
}

function formatExactTime(value: string) {
  const [rawHours, rawMinutes] = value.split(':').map(Number);
  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) return value;

  const suffix = rawHours >= 12 ? 'PM' : 'AM';
  const hour = rawHours % 12 || 12;
  return `${hour}:${`${rawMinutes}`.padStart(2, '0')} ${suffix}`;
}

function parseExactTimeLabel(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3].toUpperCase();
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  if (suffix === 'PM' && hours < 12) hours += 12;
  if (suffix === 'AM' && hours === 12) hours = 0;
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function getTimeBlockLabel(value: TimeBlock | '') {
  return TIME_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

function getTimePreferenceLabel(draft: Pick<JobDraft, 'exactTimeNeeded' | 'preferredTimeBlock'>) {
  if (draft.exactTimeNeeded) return 'Set exact time';
  return getTimeBlockLabel(draft.preferredTimeBlock);
}

function getFlexibilityLabel(value: ScheduleFlexibility) {
  return value === 'fixed' ? 'Must be this time' : 'Can coordinate';
}

function buildScheduleText(draft: JobDraft) {
  if (!draft.jobDate) return draft.legacyScheduleText.trim();

  const dateText = formatScheduleDate(draft.jobDate);
  const flexibilityText = getFlexibilityLabel(draft.scheduleFlexibility);

  // The database keeps one schedule_text field, so the new structured UI is folded
  // into a readable summary while preferredTimeBlock preserves the inferred block in state.
  if (draft.exactTimeNeeded && draft.exactTime) {
    return `${dateText} · ${formatExactTime(draft.exactTime)} · ${flexibilityText}`;
  }

  const blockText = getTimeBlockLabel(draft.preferredTimeBlock);
  if (!blockText) return draft.legacyScheduleText.trim();
  return `${dateText} · ${blockText} · ${flexibilityText}`;
}

function getSchedulePreview(draft: JobDraft) {
  const scheduleText = buildScheduleText(draft);
  if (scheduleText) return scheduleText;
  return 'Choose a date and time preference.';
}

function formatWorkersNeededText(value: string) {
  const parsed = parsePositiveNumber(value);
  if (!parsed || Number.isNaN(parsed)) return 'Select number of workers';
  if (parsed >= 5) return '5+ workers';
  return `${parsed} worker${parsed === 1 ? '' : 's'}`;
}

function getWorkersNeededPickerLabel(value: string) {
  const parsed = parsePositiveNumber(value);
  if (!parsed || Number.isNaN(parsed)) return '';
  return parsed >= 5 ? '5+ workers' : `${parsed} worker${parsed === 1 ? '' : 's'}`;
}

function parseScheduleText(value: string): Pick<
  JobDraft,
  'legacyScheduleText' | 'jobDate' | 'preferredTimeBlock' | 'exactTimeNeeded' | 'exactTime' | 'scheduleFlexibility'
> {
  const scheduleText = value.trim();
  const base = {
    legacyScheduleText: scheduleText,
    jobDate: '',
    preferredTimeBlock: '' as TimeBlock | '',
    exactTimeNeeded: false,
    exactTime: '',
    scheduleFlexibility: 'flexible' as ScheduleFlexibility,
  };

  if (!scheduleText) return base;
  if (scheduleText.toLowerCase() === 'schedule to coordinate') {
    return {
      ...base,
      preferredTimeBlock: 'anytime',
    };
  }

  const match = scheduleText.match(
    /^([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})(?:\s+·\s+|\s+)(.+?)(?:\s+·\s+|\s+)(Fixed|Flexible|Must be this time|Can coordinate)$/,
  );
  if (!match) return base;

  const parsedDate = new Date(match[1]);
  if (Number.isNaN(parsedDate.getTime())) return base;

  const dateValue = formatDateValue(parsedDate);
  const detail = match[2];
  const exactTime = parseExactTimeLabel(detail);
  const blockOption = TIME_PREFERENCE_OPTIONS.find(
    (option): option is { value: TimeBlock; label: string } =>
      option.value !== 'exact' && option.label === detail,
  );
  const block = blockOption?.value ?? '';

  return {
    legacyScheduleText: '',
    jobDate: dateValue,
    preferredTimeBlock: exactTime ? inferTimeBlockFromExactTime(exactTime) : block,
    exactTimeNeeded: Boolean(exactTime),
    exactTime,
    scheduleFlexibility: ['Fixed', 'Must be this time'].includes(match[3]) ? 'fixed' : 'flexible',
  };
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

  const budgetMin = parsePositiveNumber(draft.budgetMin);
  const budgetMax = parsePositiveNumber(draft.budgetMax);
  const budgetRange = validateRateRange({
    min: Number.isNaN(budgetMin) ? null : budgetMin,
    max: Number.isNaN(budgetMax) ? null : budgetMax,
    rateType: draft.rateType,
  });
  if (!budgetRange.valid) {
    errors.budgetMin = budgetRange.error ?? 'Enter a valid budget range.';
  }

  const workersNeeded = parsePositiveNumber(draft.workersNeeded);
  if (Number.isNaN(workersNeeded)) {
    errors.workersNeeded = 'Enter a valid worker count or leave it blank.';
  }

  if (!draft.jobDate) {
    errors.scheduleText = 'Choose a job date.';
  } else if (!parseDateValue(draft.jobDate)) {
    errors.scheduleText = 'Choose a valid job date.';
  } else if (isPastDateValue(draft.jobDate)) {
    errors.scheduleText = 'Choose today or a future date.';
  }

  if (!errors.scheduleText && draft.exactTimeNeeded && !draft.exactTime) {
    errors.scheduleText = 'Choose the exact time needed.';
  }

  if (!errors.scheduleText && !draft.exactTimeNeeded && !draft.preferredTimeBlock) {
    errors.scheduleText = 'Choose a time preference.';
  }

  return errors;
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function buildDraftInput(draft: JobDraft): UpsertJobDraftInput {
  const budgetMin = parsePositiveNumber(draft.budgetMin);
  const budgetMax = parsePositiveNumber(draft.budgetMax);
  const workersNeeded = parsePositiveNumber(draft.workersNeeded);
  const scheduleText = buildScheduleText(draft);

  return {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    serviceNeeded: draft.serviceNeeded,
    tags: normalizeQuickDetailTags(draft.tags),
    photoUrls: draft.photoUrls,
    barangay: draft.barangay,
    locationText: draft.locationText,
    privateLocationNotes: draft.privateLocationNotes,
    budgetMin: Number.isNaN(budgetMin) ? null : budgetMin,
    budgetMax: Number.isNaN(budgetMax) ? null : budgetMax,
    rateType: draft.rateType,
    budgetNegotiable: draft.budgetNegotiable,
    workersNeeded: Number.isNaN(workersNeeded) ? null : workersNeeded,
    scheduleText,
    experienceLevel: draft.experienceLevel,
    certificationRequired: draft.certificationRequired,
    certificationNote: draft.certificationNote,
    allowMessages: draft.allowMessages,
    autoReplyEnabled: draft.autoReplyEnabled,
    autoCloseEnabled: draft.autoCloseEnabled,
  };
}

function hasMeaningfulDraft(input: UpsertJobDraftInput) {
  return Boolean(
    input.title?.trim() ||
      input.description?.trim() ||
      input.category?.trim() ||
      input.serviceNeeded?.trim() ||
      input.tags?.length ||
      input.photoUrls?.length ||
      input.privateLocationNotes?.trim() ||
      input.budgetMin ||
      input.budgetMax ||
      input.workersNeeded ||
      input.scheduleText?.trim() ||
      input.certificationNote?.trim() ||
      input.rateType !== 'per_job' ||
      input.budgetNegotiable ||
      input.experienceLevel !== 'any' ||
      input.certificationRequired ||
      input.allowMessages === false ||
      input.autoReplyEnabled ||
      input.autoCloseEnabled
  );
}

function draftFromRecord(record: JobDraftSummary | null): JobDraft | null {
  if (!record) return null;
  const schedule = parseScheduleText(record.scheduleText ?? '');

  return {
    title: record.title ?? '',
    description: record.description ?? '',
    category: record.category ?? '',
    serviceNeeded: record.serviceNeeded ?? '',
    tags: normalizeQuickDetailTags(record.tags),
    photoUrls: record.photoUrls ?? [],
    barangay: record.barangay ?? '',
    locationText: record.locationText ?? '',
    privateLocationNotes: record.privateLocationNotes ?? '',
    budgetMin: record.budgetMin ? String(record.budgetMin) : '',
    budgetMax: record.budgetMax ? String(record.budgetMax) : '',
    rateType: record.rateType,
    budgetNegotiable: record.budgetNegotiable,
    workersNeeded: record.workersNeeded ? String(Math.min(record.workersNeeded, 5)) : '',
    scheduleText: record.scheduleText ?? '',
    ...schedule,
    experienceLevel: record.experienceLevel,
    certificationRequired: record.certificationRequired,
    certificationNote: record.certificationNote ?? '',
    allowMessages: record.allowMessages,
    autoReplyEnabled: record.autoReplyEnabled,
    autoCloseEnabled: record.autoCloseEnabled,
  };
}

export default function CreateJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    draftId?: string | string[];
    returnTo?: string | string[];
    focus?: string | string[];
  }>();
  const initialDraftId = getParamValue(params.draftId);
  const returnTo = getParamValue(params.returnTo);
  const focusTarget = getParamValue(params.focus);
  const scrollRef = useRef<ScrollView>(null);
  const budgetRangeOffsetRef = useRef<number | null>(null);
  const handledFocusRef = useRef(false);
  const defaultsAppliedRef = useRef(false);
  const { profile, loading } = useProfile();
  const profileId = profile?.id ?? null;
  const profileBarangay = profile?.barangay ?? null;
  const [errors, setErrors] = useState<JobDraftErrors>({});
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(initialDraftId));
  const [draftHydrated, setDraftHydrated] = useState(!initialDraftId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [barangayPickerVisible, setBarangayPickerVisible] = useState(false);
  const [workerPickerVisible, setWorkerPickerVisible] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
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
    privateLocationNotes: '',
    budgetMin: '',
    budgetMax: '',
    rateType: 'per_job',
    budgetNegotiable: false,
    workersNeeded: '',
    scheduleText: '',
    legacyScheduleText: '',
    jobDate: '',
    preferredTimeBlock: '',
    exactTimeNeeded: false,
    exactTime: '',
    scheduleFlexibility: 'flexible',
    experienceLevel: 'any',
    certificationRequired: false,
    certificationNote: '',
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
          setDraftHydrated(true);
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

  useEffect(() => {
    if (initialDraftId || defaultsAppliedRef.current || loading) return;
    let active = true;

    getMyProfileCompletion().then((result) => {
      if (!active || result.error || !result.data) return;

      const { hiring } = result.data;
      const defaultNeed = hiring.neededServices
        .map((need) => getStoredMvpServiceOption(need))
        .find(Boolean);
      const defaultCategory = getCategoryForMvpService(defaultNeed);
      const preferredSchedule = hiring.preferredSchedule.trim();
      defaultsAppliedRef.current = true;

      setDraft((current) => {
        const canPrefillNeed = Boolean(!current.category && !current.serviceNeeded && defaultNeed && defaultCategory);
        const canPrefillSchedule = Boolean(
          !current.jobDate &&
          !current.preferredTimeBlock &&
          !current.exactTimeNeeded &&
          !current.exactTime &&
          !current.legacyScheduleText &&
          preferredSchedule,
        );

        return {
          ...current,
          category: canPrefillNeed && defaultCategory ? defaultCategory : current.category,
          serviceNeeded: canPrefillNeed && defaultNeed ? defaultNeed : current.serviceNeeded,
          legacyScheduleText: canPrefillSchedule ? preferredSchedule : current.legacyScheduleText,
        };
      });
    });

    return () => {
      active = false;
    };
  }, [initialDraftId, loading]);

  const autosaveInput = useMemo(() => buildDraftInput(draft), [draft]);
  const { flush: flushDraft } = useDraftAutosave({
    draftId,
    enabled: !loading && !loadingDraft,
    hydrated: draftHydrated,
    input: autosaveInput,
    isMeaningful: hasMeaningfulDraft,
    onDraftIdChange: setDraftId,
    saveDraft: saveJobDraft,
  });

  const selectedTagsText = useMemo(() => draft.tags.join(', '), [draft.tags]);
  const tagOptions = useMemo(() => getContextTagsForCategory(draft.category), [draft.category]);
  const additionalDetailOptions = useMemo(
    () => Array.from(new Set([...ADDITIONAL_DETAIL_OPTIONS, ...tagOptions])).filter((tag) => tag !== 'Flexible schedule'),
    [tagOptions],
  );
  const serviceOptions = useMemo(() => getServicesForCategory(draft.category), [draft.category]);
  const selectedBudgetPreset = useMemo(
    () =>
      BUDGET_PRESET_OPTIONS.find(
        (option) => option.min === draft.budgetMin && option.max === draft.budgetMax,
      )?.label ?? '',
    [draft.budgetMax, draft.budgetMin],
  );
  const selectedDate = useMemo(
    () => parseDateValue(draft.jobDate) ?? getTodayAtStart(),
    [draft.jobDate],
  );
  const selectedTime = useMemo(() => getTimePickerDate(draft.exactTime), [draft.exactTime]);

  const scrollToBudgetRange = useCallback(() => {
    if (loading || loadingDraft || focusTarget !== 'budget-range' || handledFocusRef.current) return;
    if (budgetRangeOffsetRef.current === null) return;

    handledFocusRef.current = true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(budgetRangeOffsetRef.current! - space.md, 0),
      });
    });
  }, [focusTarget, loading, loadingDraft]);

  useEffect(() => {
    handledFocusRef.current = false;
  }, [focusTarget]);

  useEffect(() => {
    scrollToBudgetRange();
  }, [scrollToBudgetRange]);

  const updateDraft = <Key extends keyof JobDraft>(key: Key, value: JobDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateScheduleDraft = (patch: Partial<JobDraft>) => {
    setDraft((current) => ({
      ...current,
      ...patch,
      legacyScheduleText: '',
    }));
    setErrors((current) => ({ ...current, scheduleText: undefined }));
  };

  const selectWorkersNeeded = (value: WorkersNeededOption) => {
    updateDraft('workersNeeded', value);
    setWorkerPickerVisible(false);
  };

  const selectTimePreference = (value: TimePreference) => {
    updateScheduleDraft({
      preferredTimeBlock: value === 'exact'
        ? inferTimeBlockFromExactTime(draft.exactTime)
        : value,
      exactTimeNeeded: value === 'exact',
      exactTime: value === 'exact' ? draft.exactTime : '',
    });
  };

  const onJobDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setDatePickerVisible(false);
    if (!date) return;

    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    const today = getTodayAtStart();
    updateScheduleDraft({
      jobDate: formatDateValue(nextDate < today ? today : nextDate),
    });
  };

  const onExactTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    setTimePickerVisible(false);
    if (!date) return;

    const exactTime = formatTimeValue(date);
    updateScheduleDraft({
      exactTime,
      preferredTimeBlock: inferTimeBlockFromExactTime(exactTime),
    });
  };

  const selectBudgetPreset = (label: string) => {
    const preset = BUDGET_PRESET_OPTIONS.find((option) => option.label === label);
    if (!preset) return;
    setDraft((current) => ({
      ...current,
      budgetMin: preset.min,
      budgetMax: preset.max,
    }));
    setErrors((current) => ({ ...current, budgetMin: undefined, budgetMax: undefined }));
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

    const nextDraft = { ...draft, scheduleText: buildScheduleText(draft) };
    const validation = validateDraft(nextDraft);
    setErrors(validation);

    if (Object.keys(validation).length) return;

    setSavingDraft(true);
    const saved = await flushDraft(buildDraftInput(nextDraft));
    setSavingDraft(false);

    if (!saved || saved.error || !saved.data) {
      Alert.alert('Draft', saved?.error ?? 'Could not save this draft.');
      return;
    }

    setDraftId(saved.data.id);

    router.push({
      pathname: '/create-job-preview',
      params: {
        draft: JSON.stringify(nextDraft),
        draftId: saved.data.id,
        returnTo,
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
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Section
            helper="Start by describing the type of help you need."
            title="What work do you need?">
            <CurrentUserIdentityRow subtitle="Creating a job post" />

            {draft.photoUrls.length ? (
              <View style={[styles.photoCard, uploadingPhotos && styles.disabled]}>
                <ScrollView
                  horizontal
                  contentContainerStyle={styles.photoStrip}
                  showsHorizontalScrollIndicator={false}>
                  {draft.photoUrls.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.photoTile}>
                      <CachedRemoteImage uri={url} style={styles.photoThumb} />
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
              <Text style={styles.label}>Category</Text>
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
              <Text style={styles.label}>Service needed</Text>
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

            <FormInput
              error={errors.title}
              label="Job title"
              onChangeText={(value) => updateDraft('title', value)}
              placeholder="Example: Need help cleaning after move-out"
              value={draft.title}
            />
          </Section>

          <Section
            helper="Add the details workers need before they message you."
            title="Job details">
            <FormInput
              error={errors.description}
              label="Job description / additional notes"
              multiline
              onChangeText={(value) => updateDraft('description', value)}
              placeholder="What needs to be done?"
              value={draft.description}
            />
          </Section>

          <View
            onLayout={(event) => {
              budgetRangeOffsetRef.current = event.nativeEvent.layout.y;
              scrollToBudgetRange();
            }}>
            <Section
              helper="Choose the worker count and the amount you can offer."
              title="Workers and budget">
              <View style={styles.group}>
                <Text style={styles.label}>How many workers do you need?</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setWorkerPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.selectBox,
                    errors.workersNeeded && styles.inputErrorBorder,
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[styles.selectText, !draft.workersNeeded && styles.placeholderText]}
                    numberOfLines={1}>
                    {getWorkersNeededPickerLabel(draft.workersNeeded) || 'Select number of workers'}
                  </Text>
                  <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
                </Pressable>
                <Text style={styles.smallHelper}>{formatWorkersNeededText(draft.workersNeeded)}</Text>
                <FieldError message={errors.workersNeeded} />
              </View>
              <RateRangeInput
                error={errors.budgetMin}
                helperText="Enter the amount you can offer. Final payment can still be discussed with the worker."
                label="Estimated budget"
                maxLabel="Maximum budget"
                maxValue={draft.budgetMax}
                minLabel="Minimum budget"
                minValue={draft.budgetMin}
                negotiable={draft.budgetNegotiable}
                onMaxChange={(value) => updateDraft('budgetMax', value)}
                onMinChange={(value) => updateDraft('budgetMin', value)}
                onNegotiableChange={(value) => updateDraft('budgetNegotiable', value)}
                onRateTypeChange={(value) => updateDraft('rateType', value)}
                previewPrefix="Budget preview"
                rateType={draft.rateType}
                showNegotiableToggle={false}
                showPreview={false}
                showRateTypeOptions={false}
              />
              <View style={styles.group}>
                <Text style={styles.label}>Quick budget ranges</Text>
                <ChipWrap
                  items={BUDGET_PRESET_OPTIONS.map((option) => option.label)}
                  selected={[selectedBudgetPreset].filter(Boolean)}
                  onPress={selectBudgetPreset}
                />
              </View>
            </Section>
          </View>

          <Section
            helper="Choose when and where the job should happen."
            title="Schedule and location">
            <View style={styles.group}>
              <Text style={styles.label}>Job date</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDatePickerVisible(true)}
                style={({ pressed }) => [styles.selectBox, errors.scheduleText && styles.inputErrorBorder, pressed && styles.pressed]}>
                <Text style={[styles.selectText, !draft.jobDate && styles.placeholderText]} numberOfLines={1}>
                  {draft.jobDate ? formatScheduleDate(draft.jobDate) : 'Choose date'}
                </Text>
                <MaterialIcons color={color.verificationBlue} name="calendar-today" size={20} />
              </Pressable>
              {datePickerVisible ? (
                <DateTimePicker
                  display="default"
                  minimumDate={getTodayAtStart()}
                  mode="date"
                  onChange={onJobDateChange}
                  value={selectedDate}
                />
              ) : null}
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Time preference</Text>
              <ChipWrap
                items={TIME_PREFERENCE_OPTIONS.map((option) => option.label)}
                selected={[getTimePreferenceLabel(draft)].filter(Boolean)}
                onPress={(label) =>
                  selectTimePreference(TIME_PREFERENCE_OPTIONS.find((option) => option.label === label)?.value ?? 'anytime')
                }
              />
            </View>

            {draft.exactTimeNeeded ? (
              <View style={styles.group}>
                <Text style={styles.label}>Exact time</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTimePickerVisible(true)}
                  style={({ pressed }) => [styles.selectBox, errors.scheduleText && styles.inputErrorBorder, pressed && styles.pressed]}>
                  <Text style={[styles.selectText, !draft.exactTime && styles.placeholderText]} numberOfLines={1}>
                    {draft.exactTime ? formatExactTime(draft.exactTime) : 'Choose exact time'}
                  </Text>
                  <MaterialIcons color={color.verificationBlue} name="schedule" size={20} />
                </Pressable>
                {timePickerVisible ? (
                  <DateTimePicker
                    display="default"
                    mode="time"
                    onChange={onExactTimeChange}
                    value={selectedTime}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.group}>
              <Text style={styles.label}>Schedule flexibility</Text>
              <ChipWrap
                items={SCHEDULE_FLEXIBILITY_OPTIONS.map((option) => option.label)}
                selected={[SCHEDULE_FLEXIBILITY_OPTIONS.find((option) => option.value === draft.scheduleFlexibility)?.label ?? ''].filter(Boolean)}
                onPress={(label) =>
                  updateScheduleDraft({
                    scheduleFlexibility:
                      SCHEDULE_FLEXIBILITY_OPTIONS.find((option) => option.label === label)?.value ?? 'flexible',
                  })
                }
              />
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Schedule preview</Text>
              <Text style={styles.previewText}>{getSchedulePreview(draft)}</Text>
            </View>
            {draft.legacyScheduleText ? (
              <Text style={styles.smallHelper}>Loaded from an older draft. Choose a date or time block to replace it.</Text>
            ) : null}
            <FieldError message={errors.scheduleText} />

            <View style={styles.group}>
              <Text style={styles.label}>Barangay / general location</Text>
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
            </View>
            <FormInput
              helperText="Only your barangay is shown publicly. Exact address instructions are only shown to the worker you accept."
              label="Private address instructions"
              multiline
              onChangeText={(value) => updateDraft('privateLocationNotes', value)}
              placeholder="Example: Blue gate near the chapel. Message first before arriving."
              value={draft.privateLocationNotes}
            />
            <LocationMapPreview />
          </Section>

          <Section
            helper="Choose up to 4 quick tags that help workers understand the job."
            title="Additional details">
            <View style={styles.group}>
              <ChipWrap items={additionalDetailOptions} selected={draft.tags} onPress={toggleTag} />
              <Text style={styles.smallHelper}>{selectedTagsText || 'No quick details added yet'}</Text>
            </View>

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
                  <Text style={styles.label}>Preferred experience</Text>
                  <ChipWrap
                    items={EXPERIENCE_OPTIONS.map((option) => option.label)}
                    selected={[EXPERIENCE_OPTIONS.find((option) => option.value === draft.experienceLevel)?.label ?? 'Any level']}
                    onPress={(label) =>
                      updateDraft('experienceLevel', EXPERIENCE_OPTIONS.find((option) => option.label === label)?.value ?? 'any')
                    }
                  />
                </View>

                <ToggleRow
                  description="Tell workers that a certificate is preferred for this job."
                  label="Certification preferred"
                  onValueChange={(value) => updateDraft('certificationRequired', value)}
                  value={draft.certificationRequired}
                />
                {draft.certificationRequired ? (
                  <FormInput
                    label="Certification note"
                    onChangeText={(value) => updateDraft('certificationNote', value)}
                    placeholder="Example: TESDA certificate preferred"
                    value={draft.certificationNote}
                  />
                ) : null}
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
                  description="Hide this post after the start time or once workers are accepted."
                  label="Auto-close post"
                  onValueChange={(value) => updateDraft('autoCloseEnabled', value)}
                  value={draft.autoCloseEnabled}
                />
              </View>
            ) : null}
          </Section>
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
      <WorkerCountPickerSheet
        onClose={() => setWorkerPickerVisible(false)}
        onSelect={selectWorkersNeeded}
        selectedValue={draft.workersNeeded}
        visible={workerPickerVisible}
      />
    </SafeAreaView>
  );
}

function WorkerCountPickerSheet({
  selectedValue,
  visible,
  onClose,
  onSelect,
}: {
  selectedValue: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (value: WorkersNeededOption) => void;
}) {
  return (
    <BottomSheet maxHeight="42%" onClose={onClose} visible={visible}>
      <View style={styles.workerPickerHeader}>
        <Text style={styles.workerPickerTitle}>How many workers do you need?</Text>
        <Text style={styles.smallHelper}>Select number of workers</Text>
      </View>
      <View style={styles.workerOptionList}>
        {WORKERS_NEEDED_OPTIONS.map((option) => {
          const active = selectedValue === option.value || (Number(selectedValue) >= 5 && option.value === '5');
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [styles.workerOptionRow, active && styles.workerOptionRowActive, pressed && styles.pressed]}>
              <Text style={[styles.workerOptionText, active && styles.workerOptionTextActive]}>{option.label}</Text>
              {active ? <MaterialIcons color={color.verificationBlue} name="check" size={20} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
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
  helperText,
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
  keyboardType,
  style,
}: {
  error?: string;
  helperText?: string;
  label?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
  keyboardType?: 'default' | 'numeric';
  style?: object;
}) {
  return (
    <View style={[styles.inputWrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {helperText ? <Text style={styles.smallHelper}>{helperText}</Text> : null}
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
  userCopy: {
    flex: 1,
    gap: space['2xs'],
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
    gap: space.xs,
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
  sectionHeader: {
    gap: space['2xs'],
    marginBottom: space.xs,
  },
  sectionHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  flex: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  summaryText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  previewBox: {
    backgroundColor: color.primarySoft,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space['2xs'],
    padding: space.md,
  },
  previewLabel: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  previewText: {
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
  workerPickerHeader: {
    gap: space.xs,
  },
  workerPickerTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  workerOptionList: {
    gap: space.xs,
  },
  workerOptionRow: {
    alignItems: 'center',
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingVertical: space.md,
  },
  workerOptionRowActive: {
    borderBottomColor: color.primary,
  },
  workerOptionText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  workerOptionTextActive: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Bold',
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
