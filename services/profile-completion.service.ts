import { splitOfficialAndCustomServices } from '@/constants/service-taxonomy';
import type { ServiceResult } from '@/services/auth.service';
import { compactText, formatPrivateLocation } from '@/services/marketplace.helpers';
import { DEFAULT_BARANGAY, DEFAULT_CITY, DEFAULT_PROVINCE } from '@/services/onboarding.service';
import type {
  CoreProfileInput,
  HiringProfileInput,
  ProfileActionRole,
  ProfileCompletionMode,
  ProfileCompletionStatus,
  WorkProfileInput,
} from '@/types/profile.types';
import { supabase } from '@/utils/supabase';

export const WORK_PROFILE_REQUIRED_MESSAGE =
  'Complete your Work Profile before messaging clients or publishing services.';
export const HIRING_PROFILE_REQUIRED_MESSAGE =
  'Complete your Hiring Profile before messaging workers or publishing jobs.';
export const PROFILE_VERIFICATION_REQUIRED_MESSAGE =
  'Complete barangay verification to use this feature.';
export const PROFILE_SETUP_REQUIRED_MESSAGE =
  'Complete your profile first before messaging or hiring. This helps keep Konektado safe for everyone.';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  preferred_contact_method: string | null;
  province: string | null;
  barangay: string | null;
  purok_sitio: string | null;
  street: string | null;
  subdivision_area: string | null;
  block_lot: string | null;
  house_number: string | null;
  landmark_note: string | null;
  city: string | null;
  about: string | null;
  avatar_url: string | null;
  availability: string | null;
  verified_at: string | null;
  barangay_verified_at: string | null;
};

type ProviderProfileRow = {
  service_type: string | null;
  headline: string | null;
  bio: string | null;
  service_area: string | null;
  availability: string | null;
  rate_text: string | null;
  rate_min: number | null;
  rate_max: number | null;
  rate_type: string | null;
  custom_offered_services: string[] | null;
  custom_service_review_status: string | null;
  profile_completed_at: string | null;
};

type ClientProfileRow = {
  headline: string | null;
  bio: string | null;
  needed_services: string[] | null;
  custom_needed_services: string[] | null;
  preferred_schedule: string | null;
  budget_preference: string | null;
  profile_completed_at: string | null;
};

type PreferencesRow = {
  offered_services: string[] | null;
  needed_services: string[] | null;
  custom_offered_services: string[] | null;
  custom_needed_services: string[] | null;
};

const PROFILE_SELECT =
  'id, email, full_name, first_name, last_name, phone, preferred_contact_method, province, barangay, purok_sitio, street, subdivision_area, block_lot, house_number, landmark_note, city, about, avatar_url, availability, verified_at, barangay_verified_at';
const PROVIDER_PROFILE_SELECT =
  'service_type, headline, bio, service_area, availability, rate_text, rate_min, rate_max, rate_type, custom_offered_services, custom_service_review_status, profile_completed_at';
const CLIENT_PROFILE_SELECT =
  'headline, bio, needed_services, custom_needed_services, preferred_schedule, budget_preference, profile_completed_at';
const PREFERENCES_SELECT =
  'offered_services, needed_services, custom_offered_services, custom_needed_services';

export function isProfileCompletionRequiredError(error: string | null | undefined) {
  return error === WORK_PROFILE_REQUIRED_MESSAGE || error === HIRING_PROFILE_REQUIRED_MESSAGE;
}

export function getCompletionModeForError(error: string | null | undefined): Exclude<ProfileCompletionMode, 'core'> | null {
  if (error === WORK_PROFILE_REQUIRED_MESSAGE) return 'work';
  if (error === HIRING_PROFILE_REQUIRED_MESSAGE) return 'hiring';
  return null;
}

export function getCompletionTitleForMode(mode: Exclude<ProfileCompletionMode, 'core'>) {
  return mode === 'work' ? 'Complete Work Profile' : 'Complete Hiring Profile';
}

export function getProfileSetupGateMessage() {
  return PROFILE_SETUP_REQUIRED_MESSAGE;
}

export async function getMyProfileCompletion(): Promise<ServiceResult<ProfileCompletionStatus>> {
  const user = await getCurrentUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const userId = user.data.id;
  const [{ data: profile, error: profileError }, { data: provider }, { data: client }, { data: prefs }] =
    await Promise.all([
      supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle<ProfileRow>(),
      supabase
        .from('provider_profiles')
        .select(PROVIDER_PROFILE_SELECT)
        .eq('user_id', userId)
        .maybeSingle<ProviderProfileRow>(),
      supabase
        .from('client_profiles')
        .select(CLIENT_PROFILE_SELECT)
        .eq('user_id', userId)
        .maybeSingle<ClientProfileRow>(),
      supabase
        .from('user_preferences')
        .select(PREFERENCES_SELECT)
        .eq('user_id', userId)
        .maybeSingle<PreferencesRow>(),
    ]);

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  if (!profile) {
    return { data: null, error: 'Complete onboarding before editing your profile.' };
  }

  return {
    data: buildCompletionStatus({
      profile,
      provider: provider ?? null,
      client: client ?? null,
      prefs: prefs ?? null,
    }),
    error: null,
  };
}

export async function saveCoreProfile(input: CoreProfileInput): Promise<ServiceResult<ProfileCompletionStatus>> {
  const user = await getCurrentUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const firstName = compactText(input.firstName);
  const lastName = compactText(input.lastName);
  const fullName = `${firstName} ${lastName}`.trim() || null;

  if (!firstName || !lastName) {
    return { data: null, error: 'Enter your first and last name.' };
  }

  if (!compactText(input.street) && !compactText(input.subdivisionArea)) {
    return { data: null, error: 'Enter your street or subdivision/area.' };
  }

  const privateAddress = formatPrivateLocation({
    province: DEFAULT_PROVINCE,
    city: DEFAULT_CITY,
    barangay: DEFAULT_BARANGAY,
    street: input.street,
    subdivisionArea: input.subdivisionArea,
    blockLot: input.blockLot,
    houseNumber: input.houseNumber,
    landmarkNote: input.landmarkNote,
  });

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      province: DEFAULT_PROVINCE,
      barangay: DEFAULT_BARANGAY,
      street: compactText(input.street) || null,
      subdivision_area: compactText(input.subdivisionArea) || null,
      block_lot: compactText(input.blockLot) || null,
      house_number: compactText(input.houseNumber) || null,
      landmark_note: compactText(input.landmarkNote) || null,
      city: DEFAULT_CITY,
      street_address: privateAddress || null,
      about: compactText(input.about) || null,
      availability: compactText(input.availability) || null,
    })
    .eq('id', user.data.id);

  if (error) {
    return { data: null, error: error.message };
  }

  return getMyProfileCompletion();
}

export async function saveWorkProfile(input: WorkProfileInput): Promise<ServiceResult<ProfileCompletionStatus>> {
  const user = await getCurrentUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const splitServices = splitOfficialAndCustomServices([
    ...input.offeredServices,
    ...input.customOfferedServices,
  ]);
  const offeredServices = uniqueList(splitServices.official);
  const customOfferedServices = uniqueList(splitServices.custom);
  const rateMin = parseRateAmount(input.rateMin);
  const rateMax = parseRateAmount(input.rateMax);

  if (rateMin !== null && rateMax !== null && rateMin > rateMax) {
    return { data: null, error: 'Minimum rate must not be greater than maximum rate.' };
  }

  if (input.rateType !== 'negotiable' && rateMin === null && rateMax === null) {
    return { data: null, error: 'Add a rate range or choose negotiable.' };
  }

  const payload = {
    user_id: user.data.id,
    service_type: offeredServices.join(', '),
    headline: compactText(input.headline) || null,
    bio: compactText(input.bio) || null,
    service_area: compactText(input.serviceArea) || null,
    availability: compactText(input.availability) || null,
    rate_text: compactText(input.rateText) || null,
    rate_min: rateMin,
    rate_max: rateMax,
    rate_type: input.rateType,
    custom_offered_services: customOfferedServices,
    custom_service_review_status: customOfferedServices.length ? 'pending' : 'none',
    profile_completed_at: isWorkProfileInputComplete({
      ...input,
      offeredServices,
      customOfferedServices,
    })
      ? new Date().toISOString()
      : null,
  };

  const roleError = await ensureUserRole(user.data.id, 'provider');
  if (roleError) return { data: null, error: roleError };

  const { error } = await supabase
    .from('provider_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    return { data: null, error: error.message };
  }

  return getMyProfileCompletion();
}

export async function saveHiringProfile(input: HiringProfileInput): Promise<ServiceResult<ProfileCompletionStatus>> {
  const user = await getCurrentUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const splitServices = splitOfficialAndCustomServices([
    ...input.neededServices,
    ...input.customNeededServices,
  ]);
  const neededServices = uniqueList(splitServices.official);
  const customNeededServices = uniqueList(splitServices.custom);
  const payload = {
    user_id: user.data.id,
    headline: compactText(input.headline) || null,
    bio: compactText(input.bio) || null,
    needed_services: neededServices,
    custom_needed_services: customNeededServices,
    preferred_schedule: compactText(input.preferredSchedule) || null,
    budget_preference: compactText(input.budgetPreference) || null,
    profile_completed_at: isHiringProfileInputComplete({ ...input, neededServices, customNeededServices })
      ? new Date().toISOString()
      : null,
  };

  const roleError = await ensureUserRole(user.data.id, 'client');
  if (roleError) return { data: null, error: roleError };

  const { error } = await supabase
    .from('client_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    return { data: null, error: error.message };
  }

  return getMyProfileCompletion();
}

export async function requireVerifiedCompleteProfile(
  role: ProfileActionRole,
): Promise<ServiceResult<string>> {
  const completion = await getMyProfileCompletion();
  if (completion.error) return { data: null, error: completion.error };
  if (!completion.data) return { data: null, error: 'Please sign in again to continue.' };

  if (!completion.data.isVerified) {
    return { data: null, error: PROFILE_VERIFICATION_REQUIRED_MESSAGE };
  }

  if (role === 'provider' && !completion.data.workComplete) {
    return { data: null, error: WORK_PROFILE_REQUIRED_MESSAGE };
  }

  if (role === 'client' && !completion.data.hiringComplete) {
    return { data: null, error: HIRING_PROFILE_REQUIRED_MESSAGE };
  }

  return { data: completion.data.userId, error: null };
}

async function getCurrentUser(): Promise<ServiceResult<{ id: string; email: string | null }>> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  return {
    data: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    error: null,
  };
}

async function ensureUserRole(userId: string, role: ProfileActionRole) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle<{ id: string }>();

  if (error) return error.message;
  if (data?.id) return null;

  const { error: insertError } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role, is_active: false });

  return insertError?.message ?? null;
}

function buildCompletionStatus({
  profile,
  provider,
  client,
  prefs,
}: {
  profile: ProfileRow;
  provider: ProviderProfileRow | null;
  client: ClientProfileRow | null;
  prefs: PreferencesRow | null;
}): ProfileCompletionStatus {
  const firstName = compactText(profile.first_name);
  const lastName = compactText(profile.last_name);
  const name = compactText(profile.full_name) || `${firstName} ${lastName}`.trim();
  const offeredServices = uniqueList([
    ...splitServices(provider?.service_type),
    ...(prefs?.offered_services ?? []),
  ]);
  const customOfferedServices = uniqueList([
    ...(provider?.custom_offered_services ?? []),
    ...(prefs?.custom_offered_services ?? []),
  ]);
  const neededServices = uniqueList([
    ...(client?.needed_services ?? []),
    ...(prefs?.needed_services ?? []),
  ]);
  const customNeededServices = uniqueList([
    ...(client?.custom_needed_services ?? []),
    ...(prefs?.custom_needed_services ?? []),
  ]);

  const core: ProfileCompletionStatus['core'] = {
    firstName,
    lastName,
    province: compactText(profile.province) || DEFAULT_PROVINCE,
    barangay: compactText(profile.barangay) || DEFAULT_BARANGAY,
    purokSitio: compactText(profile.purok_sitio),
    street: compactText(profile.street),
    subdivisionArea: compactText(profile.subdivision_area),
    blockLot: compactText(profile.block_lot),
    houseNumber: compactText(profile.house_number),
    landmarkNote: compactText(profile.landmark_note),
    city: compactText(profile.city) || DEFAULT_CITY,
    preferredContactMethod:
      compactText(profile.preferred_contact_method) || (compactText(profile.phone) ? 'phone' : 'app_message'),
    about: compactText(profile.about),
    availability: compactText(profile.availability),
    avatarUrl: compactText(profile.avatar_url) || null,
  };
  const work: ProfileCompletionStatus['work'] = {
    headline: compactText(provider?.headline) || compactText(provider?.service_type),
    bio: compactText(provider?.bio) || compactText(profile.about),
    offeredServices,
    serviceArea: compactText(provider?.service_area) ||
      [compactText(profile.barangay), compactText(profile.city)].filter(Boolean).join(', '),
    availability: compactText(provider?.availability) || compactText(profile.availability),
    rateText: compactText(provider?.rate_text),
    rateMin: provider?.rate_min ? String(provider.rate_min) : '',
    rateMax: provider?.rate_max ? String(provider.rate_max) : '',
    rateType: provider?.rate_type === 'hourly' || provider?.rate_type === 'daily' || provider?.rate_type === 'per_project'
      ? provider.rate_type
      : 'negotiable',
    customOfferedServices,
    completedAt: provider?.profile_completed_at ?? null,
  };
  const hiring: ProfileCompletionStatus['hiring'] = {
    headline: compactText(client?.headline) || 'Hiring local help',
    bio: compactText(client?.bio) || compactText(profile.about),
    neededServices,
    customNeededServices,
    preferredSchedule: compactText(client?.preferred_schedule) || compactText(profile.availability),
    budgetPreference: compactText(client?.budget_preference),
    completedAt: client?.profile_completed_at ?? null,
  };

  const missingCore = [
    !name ? 'Display name' : null,
    !core.barangay ? 'Barangay' : null,
    !core.street && !core.subdivisionArea ? 'Street or subdivision/area' : null,
    !core.city ? 'City' : null,
    !core.about ? 'Short public intro' : null,
    !core.availability ? 'Availability' : null,
  ].filter((value): value is string => Boolean(value));
  const coreComplete = missingCore.length === 0;
  const missingWork = [
    ...(!coreComplete ? ['Core Profile'] : []),
    !work.headline ? 'Work headline' : null,
    !work.bio ? 'Work bio' : null,
    !work.offeredServices.length && !work.customOfferedServices.length ? 'Services offered' : null,
    !work.serviceArea ? 'Service area' : null,
    !work.availability ? 'Work availability' : null,
  ].filter((value): value is string => Boolean(value));
  const missingHiring = [
    ...(!coreComplete ? ['Core Profile'] : []),
    !hiring.headline ? 'Hiring headline' : null,
    !hiring.bio ? 'Hiring intro' : null,
    !hiring.neededServices.length && !hiring.customNeededServices.length ? 'Services needed' : null,
    !hiring.preferredSchedule ? 'Preferred schedule' : null,
  ].filter((value): value is string => Boolean(value));

  const isVerified = Boolean(profile.barangay_verified_at || profile.verified_at);
  const workComplete = missingWork.length === 0;
  const hiringComplete = missingHiring.length === 0;
  const marketplaceSetupState = !isVerified
    ? 'unverified'
    : workComplete || hiringComplete
      ? 'ready'
      : 'verified_setup_incomplete';

  return {
    userId: profile.id,
    isVerified,
    coreComplete,
    workComplete,
    hiringComplete,
    marketplaceSetupState,
    photoRecommended: !core.avatarUrl,
    missingCore,
    missingWork,
    missingHiring,
    core,
    work,
    hiring,
  };
}

function isWorkProfileInputComplete(input: WorkProfileInput) {
  return Boolean(
    compactText(input.headline) &&
      compactText(input.bio) &&
      (uniqueList(input.offeredServices).length || uniqueList(input.customOfferedServices).length) &&
      compactText(input.serviceArea) &&
      compactText(input.availability),
  );
}

function isHiringProfileInputComplete(input: HiringProfileInput) {
  return Boolean(
    compactText(input.headline) &&
      compactText(input.bio) &&
      (uniqueList(input.neededServices).length || uniqueList(input.customNeededServices).length) &&
      compactText(input.preferredSchedule),
  );
}

function parseRateAmount(value: string | null | undefined) {
  const cleanValue = compactText(value).replace(/,/g, '');
  if (!cleanValue) return null;

  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function splitServices(value: string | null | undefined) {
  return uniqueList((value ?? '').split(','));
}

function uniqueList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => compactText(value)).filter(Boolean)),
  );
}
