import type { ServiceResult } from '@/services/auth.service';
import type { AppRole, OnboardingDraft, OnboardingIntent, UserPreferences } from '@/types/onboarding.types';
import { saveUserRole } from '@/utils/save-role';
import { supabase } from '@/utils/supabase';

const DEFAULT_BARANGAY = 'Barangay San Pedro';
const DEFAULT_CITY = 'Sto. Tomas';

export const emptyOnboardingDraft: OnboardingDraft = {
  firstName: '',
  lastName: '',
  birthdate: '',
  streetAddress: '',
  city: DEFAULT_CITY,
  barangay: DEFAULT_BARANGAY,
  offeredServices: [],
  neededServices: [],
  customOfferedServices: [],
  customNeededServices: [],
  serviceType: '',
  hasCertifications: null,
  certificationDetails: '',
  wantsBarangayVerification: false,
  verificationNote: '',
  verificationFiles: [],
};

type UserPreferencesRow = {
  custom_needed_services: string[] | null;
  custom_offered_services: string[] | null;
  intent: OnboardingIntent;
  needed_services: string[] | null;
  offered_services: string[] | null;
  onboarding_completed_at: string | null;
};

function splitServices(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function compactServices(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeIntent(raw: unknown): OnboardingIntent | null {
  if (raw === 'client' || raw === 'provider' || raw === 'both') return raw;
  return null;
}

function activeRoleForIntent(intent: OnboardingIntent): AppRole {
  return intent === 'provider' ? 'provider' : 'client';
}

function mapPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    customNeededServices: row.custom_needed_services ?? [],
    customOfferedServices: row.custom_offered_services ?? [],
    intent: row.intent,
    neededServices: row.needed_services ?? [],
    offeredServices: row.offered_services ?? [],
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

export async function loadOnboardingDraft(): Promise<
  ServiceResult<{
    draft: OnboardingDraft;
    email: string | null;
    intent: OnboardingIntent | null;
    userId: string;
  }>
> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  const user = userResult.user;
  const metadataRole = normalizeIntent((user.user_metadata as Record<string, unknown>)?.role);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, full_name, birthdate, street_address, city, barangay, role, active_role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select(
      'intent, offered_services, needed_services, custom_offered_services, custom_needed_services, onboarding_completed_at',
    )
    .eq('user_id', user.id)
    .maybeSingle<UserPreferencesRow>();

  const activeRole = normalizeIntent(profile?.active_role) ?? normalizeIntent(profile?.role);
  const intent = preferences?.intent ?? metadataRole ?? activeRole;
  const fallbackName = profile?.full_name?.split(' ') ?? [];

  let providerServiceType = '';

  if (intent === 'provider' || intent === 'both') {
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('service_type, has_certifications, certification_details')
      .eq('user_id', user.id)
      .maybeSingle();

    providerServiceType = providerProfile?.service_type ?? '';
  }

  const offeredServices = preferences?.offered_services?.length
    ? preferences.offered_services
    : splitServices(providerServiceType);

  return {
    data: {
      draft: {
        ...emptyOnboardingDraft,
        firstName: profile?.first_name ?? fallbackName[0] ?? '',
        lastName: profile?.last_name ?? fallbackName.slice(1).join(' ') ?? '',
        birthdate: profile?.birthdate ?? '',
        streetAddress: profile?.street_address ?? '',
        city: profile?.city || DEFAULT_CITY,
        barangay: profile?.barangay || DEFAULT_BARANGAY,
        offeredServices,
        neededServices: preferences?.needed_services ?? [],
        customOfferedServices: preferences?.custom_offered_services ?? [],
        customNeededServices: preferences?.custom_needed_services ?? [],
        serviceType: offeredServices.join(', '),
      },
      email: user.email ?? null,
      intent,
      userId: user.id,
    },
    error: null,
  };
}

export async function saveOnboardingProfile({
  draft,
  email,
  intent,
  userId,
}: {
  draft: OnboardingDraft;
  email: string | null;
  intent: OnboardingIntent;
  userId: string;
}): Promise<ServiceResult<void>> {
  const activeRole = activeRoleForIntent(intent);
  const offeredServices = compactServices([...draft.offeredServices, ...draft.customOfferedServices]);
  const neededServices = compactServices([...draft.neededServices, ...draft.customNeededServices]);

  const roleError = await saveUserRole({
    activeRole,
    email,
    role: intent,
    userId,
  });

  if (roleError) {
    return { data: null, error: roleError.message };
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    role: activeRole,
    active_role: activeRole,
    first_name: draft.firstName.trim(),
    last_name: draft.lastName.trim(),
    full_name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
    birthdate: draft.birthdate ? draft.birthdate : null,
    street_address: draft.streetAddress.trim() || null,
    city: draft.city.trim() || DEFAULT_CITY,
    barangay: draft.barangay || DEFAULT_BARANGAY,
  });

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const { error: preferencesError } = await supabase.from('user_preferences').upsert({
    user_id: userId,
    intent,
    offered_services: offeredServices,
    needed_services: neededServices,
    custom_offered_services: compactServices(draft.customOfferedServices),
    custom_needed_services: compactServices(draft.customNeededServices),
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (preferencesError) {
    return { data: null, error: preferencesError.message };
  }

  if (intent === 'provider' || intent === 'both') {
    const { error: providerProfileError } = await supabase.from('provider_profiles').upsert({
      user_id: userId,
      service_type: offeredServices.join(', ') || null,
      has_certifications: null,
      certification_details: null,
      certification_status: null,
      updated_at: new Date().toISOString(),
    });

    if (providerProfileError) {
      return { data: null, error: providerProfileError.message };
    }
  }

  if (intent === 'client' || intent === 'both') {
    const { error: clientProfileError } = await supabase.from('client_profiles').upsert({
      user_id: userId,
      updated_at: new Date().toISOString(),
    });

    if (clientProfileError) {
      return { data: null, error: clientProfileError.message };
    }
  }

  return { data: undefined, error: null };
}

export async function getMyUserPreferences(): Promise<ServiceResult<UserPreferences | null>> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select(
      'intent, offered_services, needed_services, custom_offered_services, custom_needed_services, onboarding_completed_at',
    )
    .eq('user_id', userResult.user.id)
    .maybeSingle<UserPreferencesRow>();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ? mapPreferences(data) : null, error: null };
}
