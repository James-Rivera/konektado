import type { ServiceResult } from '@/services/auth.service';
import { compactText } from '@/services/marketplace.helpers';
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

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  barangay: string | null;
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
  profile_completed_at: string | null;
};

type ClientProfileRow = {
  headline: string | null;
  bio: string | null;
  needed_services: string[] | null;
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
  'id, email, full_name, first_name, last_name, barangay, city, about, avatar_url, availability, verified_at, barangay_verified_at';
const PROVIDER_PROFILE_SELECT =
  'service_type, headline, bio, service_area, availability, rate_text, profile_completed_at';
const CLIENT_PROFILE_SELECT =
  'headline, bio, needed_services, preferred_schedule, budget_preference, profile_completed_at';
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

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      barangay: compactText(input.barangay) || null,
      city: compactText(input.city) || null,
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

  const offeredServices = uniqueList(input.offeredServices);
  const payload = {
    user_id: user.data.id,
    service_type: offeredServices.join(', '),
    headline: compactText(input.headline) || null,
    bio: compactText(input.bio) || null,
    service_area: compactText(input.serviceArea) || null,
    availability: compactText(input.availability) || null,
    rate_text: compactText(input.rateText) || null,
    profile_completed_at: isWorkProfileInputComplete({ ...input, offeredServices })
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

  const neededServices = uniqueList(input.neededServices);
  const payload = {
    user_id: user.data.id,
    headline: compactText(input.headline) || null,
    bio: compactText(input.bio) || null,
    needed_services: neededServices,
    preferred_schedule: compactText(input.preferredSchedule) || null,
    budget_preference: compactText(input.budgetPreference) || null,
    profile_completed_at: isHiringProfileInputComplete({ ...input, neededServices })
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
    ...(prefs?.custom_offered_services ?? []),
  ]);
  const neededServices = uniqueList([
    ...(client?.needed_services ?? []),
    ...(prefs?.needed_services ?? []),
    ...(prefs?.custom_needed_services ?? []),
  ]);

  const core: ProfileCompletionStatus['core'] = {
    firstName,
    lastName,
    barangay: compactText(profile.barangay),
    city: compactText(profile.city),
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
    completedAt: provider?.profile_completed_at ?? null,
  };
  const hiring: ProfileCompletionStatus['hiring'] = {
    headline: compactText(client?.headline) || 'Hiring local help',
    bio: compactText(client?.bio) || compactText(profile.about),
    neededServices,
    preferredSchedule: compactText(client?.preferred_schedule) || compactText(profile.availability),
    budgetPreference: compactText(client?.budget_preference),
    completedAt: client?.profile_completed_at ?? null,
  };

  const missingCore = [
    !name ? 'Display name' : null,
    !core.barangay ? 'Barangay' : null,
    !core.city ? 'City' : null,
    !core.about ? 'Short public intro' : null,
    !core.availability ? 'Availability' : null,
  ].filter((value): value is string => Boolean(value));
  const coreComplete = missingCore.length === 0;
  const missingWork = [
    ...(!coreComplete ? ['Core Profile'] : []),
    !work.headline ? 'Work headline' : null,
    !work.bio ? 'Work bio' : null,
    !work.offeredServices.length ? 'Services offered' : null,
    !work.serviceArea ? 'Service area' : null,
    !work.availability ? 'Work availability' : null,
  ].filter((value): value is string => Boolean(value));
  const missingHiring = [
    ...(!coreComplete ? ['Core Profile'] : []),
    !hiring.headline ? 'Hiring headline' : null,
    !hiring.bio ? 'Hiring intro' : null,
    !hiring.neededServices.length ? 'Services needed' : null,
    !hiring.preferredSchedule ? 'Preferred schedule' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    userId: profile.id,
    isVerified: Boolean(profile.barangay_verified_at || profile.verified_at),
    coreComplete,
    workComplete: missingWork.length === 0,
    hiringComplete: missingHiring.length === 0,
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
      uniqueList(input.offeredServices).length &&
      compactText(input.serviceArea) &&
      compactText(input.availability),
  );
}

function isHiringProfileInputComplete(input: HiringProfileInput) {
  return Boolean(
    compactText(input.headline) &&
      compactText(input.bio) &&
      uniqueList(input.neededServices).length &&
      compactText(input.preferredSchedule),
  );
}

function splitServices(value: string | null | undefined) {
  return uniqueList((value ?? '').split(','));
}

function uniqueList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => compactText(value)).filter(Boolean)),
  );
}
