import { splitOfficialAndCustomServices } from '@/constants/service-taxonomy';
import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  formatPrivateLocation,
} from '@/services/marketplace.helpers';
import { DEFAULT_BARANGAY, DEFAULT_CITY, DEFAULT_PROVINCE } from '@/services/onboarding.service';
import type {
  CoreProfileInput,
  HiringProfileInput,
  ProfileActionRole,
  ProfileCompletionAction,
  ProfileCompletionMode,
  ProfileCompletionStatus,
  ProfileModeCompletion,
  ProfileVerificationStatus,
  WorkProfileInput,
} from '@/types/profile.types';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';
import {
  getLegalNameEditPolicy,
  NAME_LOCKED_SERVICE_ERROR,
} from '@/utils/verified-name-policy';

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
  verified_at: string | null;
  barangay_verified_at: string | null;
};

type ProfileNameGuardRow = Pick<
  ProfileRow,
  'barangay_verified_at' | 'first_name' | 'full_name' | 'last_name' | 'verified_at'
>;

type ProviderProfileRow = {
  service_type: string | null;
  headline: string | null;
  bio: string | null;
  service_area: string | null;
  availability: string | null;
  custom_offered_services: string[] | null;
  custom_service_review_status: string | null;
  profile_completed_at: string | null;
};

type ClientProfileRow = {
  headline: string | null;
  bio: string | null;
  needed_services: string[] | null;
  custom_needed_services: string[] | null;
  coordination_style: string | null;
  preferred_schedule: string | null;
  profile_completed_at: string | null;
};

type PreferencesRow = {
  offered_services: string[] | null;
  needed_services: string[] | null;
  custom_offered_services: string[] | null;
  custom_needed_services: string[] | null;
};

type CredentialReadinessRow = {
  id: string;
  status: string | null;
};

type VerificationRow = {
  status: VerificationStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RequiredItem = {
  id: string;
  label: string;
  complete: boolean;
  action: ProfileCompletionAction;
};

const PROFILE_SELECT =
  'id, email, full_name, first_name, last_name, phone, preferred_contact_method, province, barangay, purok_sitio, street, subdivision_area, block_lot, house_number, landmark_note, city, about, avatar_url, verified_at, barangay_verified_at';
const PROVIDER_PROFILE_SELECT =
  'service_type, headline, bio, service_area, availability, custom_offered_services, custom_service_review_status, profile_completed_at';
const CLIENT_PROFILE_SELECT =
  'headline, bio, needed_services, custom_needed_services, coordination_style, preferred_schedule, profile_completed_at';
const PREFERENCES_SELECT =
  'offered_services, needed_services, custom_offered_services, custom_needed_services';
const VERIFICATION_SELECT =
  'status, reviewer_note, reviewed_at, created_at, updated_at';

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
  const [
    { data: profile, error: profileError },
    { data: provider },
    { data: client },
    { data: prefs },
    { data: credentials },
    { data: latestVerification },
  ] = await Promise.all([
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
    supabase
      .from('credentials')
      .select('id, status')
      .eq('provider_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('verifications')
      .select(VERIFICATION_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<VerificationRow>(),
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
      credentials: (credentials as CredentialReadinessRow[] | null) ?? [],
      latestVerification: latestVerification ?? null,
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

  if (!compactText(input.street)) {
    return { data: null, error: 'Add your area, street, purok, or sitio.' };
  }

  if (!compactText(input.preferredContactMethod)) {
    return { data: null, error: 'Choose your preferred coordination method.' };
  }

  const [{ data: profile, error: profileError }, { data: latestVerification, error: latestError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, full_name, verified_at, barangay_verified_at')
      .eq('id', user.data.id)
      .maybeSingle<ProfileNameGuardRow>(),
    supabase
      .from('verifications')
      .select(VERIFICATION_SELECT)
      .eq('user_id', user.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<VerificationRow>(),
  ]);

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  if (latestError) {
    return { data: null, error: latestError.message };
  }

  const legalNameEdit = getLegalNameEditPolicy({
    isVerified: Boolean(profile?.barangay_verified_at || profile?.verified_at),
    reviewerNote: latestVerification?.reviewer_note ?? null,
    status: latestVerification?.status ?? null,
  });

  const nameChanged = hasProfileNameChanged({
    current: profile ?? null,
    nextFirstName: firstName,
    nextFullName: fullName,
    nextLastName: lastName,
  });

  if (nameChanged && !legalNameEdit.canEdit) {
    return { data: null, error: NAME_LOCKED_SERVICE_ERROR };
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

  const profilePayload = {
      province: DEFAULT_PROVINCE,
      barangay: DEFAULT_BARANGAY,
      // Legacy DB names remain: street stores Area / Street / Purok / Sitio,
      // subdivision_area stores optional Additional area details.
      street: compactText(input.street) || null,
      subdivision_area: compactText(input.subdivisionArea) || null,
      // Legacy split fields remain; profile edit may store the combined exact detail in house_number.
      block_lot: compactText(input.blockLot) || null,
      house_number: compactText(input.houseNumber) || null,
      // Legacy landmark_note is now the private note for finding the resident.
      landmark_note: compactText(input.landmarkNote) || null,
      city: DEFAULT_CITY,
      street_address: privateAddress || null,
      preferred_contact_method: compactText(input.preferredContactMethod),
      about: compactText(input.about) || null,
    };

  const { error } = await supabase
    .from('profiles')
    .update(
      legalNameEdit.canEdit
        ? {
            ...profilePayload,
            first_name: firstName,
            full_name: fullName,
            last_name: lastName,
          }
        : profilePayload,
    )
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

  const payload = {
    user_id: user.data.id,
    // UI state is structured; provider_profiles.service_type is still legacy comma text.
    // Keep this boundary conversion until the database has a normalized profile service table.
    service_type: offeredServices.join(', '),
    headline: compactText(input.headline) || null,
    bio: compactText(input.bio) || null,
    service_area: compactText(input.serviceArea) || null,
    availability: compactText(input.availability) || null,
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
    // UI state is structured; client profile arrays remain the current persistence boundary.
    headline: compactText(input.headline) || null,
    bio: compactText(input.bio) || null,
    needed_services: neededServices,
    custom_needed_services: customNeededServices,
    coordination_style: compactText(input.coordinationStyle) || null,
    preferred_schedule: compactText(input.preferredSchedule) || null,
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
  credentials,
  latestVerification,
}: {
  profile: ProfileRow;
  provider: ProviderProfileRow | null;
  client: ClientProfileRow | null;
  prefs: PreferencesRow | null;
  credentials: CredentialReadinessRow[];
  latestVerification: VerificationRow | null;
}): ProfileCompletionStatus {
  const firstName = compactText(profile.first_name);
  const lastName = compactText(profile.last_name);
  const name = compactText(profile.full_name) || `${firstName} ${lastName}`.trim();
  const offeredServiceSplit = splitOfficialAndCustomServices([
    ...splitServices(provider?.service_type),
    ...(prefs?.offered_services ?? []),
    ...(provider?.custom_offered_services ?? []),
    ...(prefs?.custom_offered_services ?? []),
  ]);
  const offeredServices = uniqueList(offeredServiceSplit.official);
  const customOfferedServices = uniqueList(offeredServiceSplit.custom);
  const neededServiceSplit = splitOfficialAndCustomServices([
    ...(client?.needed_services ?? []),
    ...(prefs?.needed_services ?? []),
    ...(client?.custom_needed_services ?? []),
    ...(prefs?.custom_needed_services ?? []),
  ]);
  const neededServices = uniqueList(neededServiceSplit.official);
  const customNeededServices = uniqueList(neededServiceSplit.custom);

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
    preferredContactMethod: compactText(profile.preferred_contact_method),
    about: compactText(profile.about),
    avatarUrl: compactText(profile.avatar_url) || null,
  };
  const work: ProfileCompletionStatus['work'] = {
    headline: compactText(provider?.headline) || compactText(provider?.service_type),
    bio: compactText(provider?.bio) || compactText(profile.about),
    offeredServices,
    serviceArea: compactText(provider?.service_area) ||
      [compactText(profile.barangay), compactText(profile.city)].filter(Boolean).join(', '),
    availability: compactText(provider?.availability),
    customOfferedServices,
    completedAt: provider?.profile_completed_at ?? null,
  };
  const hiring: ProfileCompletionStatus['hiring'] = {
    headline: compactText(client?.headline),
    bio: compactText(client?.bio) || compactText(profile.about),
    neededServices,
    customNeededServices,
    coordinationStyle: compactText(client?.coordination_style),
    preferredSchedule: compactText(client?.preferred_schedule),
    completedAt: client?.profile_completed_at ?? null,
  };

  const isVerified = Boolean(
    profile.barangay_verified_at ||
      profile.verified_at ||
      latestVerification?.status === 'approved',
  );
  const verification = buildVerificationStatus({
    isVerified,
    latestVerification,
  });
  const legalNameEdit = getLegalNameEditPolicy({
    isVerified,
    reviewerNote: latestVerification?.reviewer_note ?? null,
    status: latestVerification?.status ?? null,
  });
  const coreCompletion = buildCoreCompletion({ core, name });
  const coreComplete = coreCompletion.state === 'ready';
  const missingCore = coreCompletion.missingItems.map((item) => item.label);

  const workCompletion = buildWorkCompletion({
    core,
    work,
    credentials,
    isVerified,
  });
  const hiringCompletion = buildHiringCompletion({
    core,
    hiring,
    isVerified,
  });
  const workComplete = coreComplete && isVerified && workCompletion.state === 'ready';
  const hiringComplete = coreComplete && isVerified && hiringCompletion.state === 'ready';
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
    coreCompletion,
    workCompletion,
    hiringCompletion,
    verification,
    legalNameEdit,
    photoRecommended: !core.avatarUrl,
    missingCore,
    missingWork: workCompletion.missingItems.map((item) => item.label),
    missingHiring: hiringCompletion.missingItems.map((item) => item.label),
    core,
    work,
    hiring,
  };
}

function hasProfileNameChanged({
  current,
  nextFirstName,
  nextFullName,
  nextLastName,
}: {
  current: ProfileNameGuardRow | null;
  nextFirstName: string;
  nextFullName: string | null;
  nextLastName: string;
}) {
  if (!current) return true;

  const currentFirstName = compactText(current.first_name);
  const currentLastName = compactText(current.last_name);
  const currentFullName = compactText(current.full_name) || `${currentFirstName} ${currentLastName}`.trim();

  return (
    nextFirstName !== currentFirstName ||
    nextLastName !== currentLastName ||
    compactText(nextFullName) !== currentFullName
  );
}

function buildCoreCompletion({
  core,
  name,
}: {
  core: ProfileCompletionStatus['core'];
  name: string;
}): ProfileModeCompletion {
  const hasName = Boolean(name);
  const hasBarangayLocation = Boolean(core.barangay && core.city);
  const hasPublicAddress = Boolean(compactText(core.street));
  const hasContactPreference = Boolean(core.preferredContactMethod);
  const setupStarted = Boolean(
    hasName ||
      hasBarangayLocation ||
      hasPublicAddress ||
      hasContactPreference ||
      compactText(core.about) ||
      core.avatarUrl,
  );
  const requiredItems: RequiredItem[] = [
    {
      id: 'shared-identity',
      label: 'Complete shared identity',
      complete: hasName,
      action: completionAction({
        id: 'shared-identity',
        kind: 'edit_shared_profile',
        label: 'Complete shared identity',
        description: 'Add your name once for both Work and Hiring profiles.',
        mode: 'core',
      }),
    },
    {
      id: 'barangay-location',
      label: 'Add barangay/location',
      complete: hasBarangayLocation && hasPublicAddress,
      action: completionAction({
        id: 'barangay-location',
        kind: 'edit_shared_profile',
        label: 'Add barangay/location',
        description: 'Add your public location so neighbors know who they are connecting with.',
        mode: 'core',
      }),
    },
    {
      id: 'contact-preference',
      label: 'Set preferred coordination',
      complete: hasContactPreference,
      action: completionAction({
        id: 'contact-preference',
        kind: 'edit_contact_preference',
        label: 'Set preferred coordination',
        description: 'Choose how people should coordinate with you in Konektado.',
        mode: 'core',
      }),
    },
  ];

  return buildModeCompletion({
    mode: 'core',
    setupStarted,
    isVerified: true,
    requiredItems,
    optionalItems: getSharedOptionalActions(core),
  });
}

function buildWorkCompletion({
  core,
  work,
  credentials,
  isVerified,
}: {
  core: ProfileCompletionStatus['core'];
  work: ProfileCompletionStatus['work'];
  credentials: CredentialReadinessRow[];
  isVerified: boolean;
}): ProfileModeCompletion {
  const hasSummary = Boolean(compactText(work.headline) && compactText(work.bio));
  const hasSkills = Boolean(work.offeredServices.length || work.customOfferedServices.length);
  const hasAvailability = Boolean(compactText(work.availability));
  const hasServiceArea = Boolean(compactText(work.serviceArea));
  const setupStarted = Boolean(
    providerTextStarted(work) ||
      hasSkills ||
      hasAvailability ||
      hasServiceArea,
  );
  const requiredItems: RequiredItem[] = [
    {
      id: 'work-summary',
      label: 'Add work summary',
      complete: hasSummary,
      action: completionAction({
        id: 'work-summary',
        kind: 'edit_work_profile',
        label: 'Add work summary',
        description: 'Add a flexible summary of the work you can do.',
        mode: 'work',
      }),
    },
    {
      id: 'capabilities',
      label: 'Add skills',
      complete: hasSkills,
      action: completionAction({
        id: 'capabilities',
        kind: 'edit_work_profile',
        label: 'Add skills',
        description: 'Choose the things you know how to do.',
        mode: 'work',
      }),
    },
    {
      id: 'service-area',
      label: 'Set service area',
      complete: hasServiceArea,
      action: completionAction({
        id: 'service-area',
        kind: 'edit_service_area',
        label: 'Set default service area',
        description: 'Show the areas where you can generally serve clients.',
        mode: 'work',
      }),
    },
    {
      id: 'availability',
      label: 'Set default availability',
      complete: hasAvailability,
      action: completionAction({
        id: 'availability',
        kind: 'edit_availability',
        label: 'Set default availability',
        description: 'Tell clients when you are usually available for work.',
        mode: 'work',
      }),
    },
  ];

  const optionalItems: ProfileCompletionAction[] = credentials.length
    ? getSharedOptionalActions(core)
    : [
        ...getSharedOptionalActions(core),
        {
          id: 'credentials',
          kind: 'add_credential',
          label: 'Optional: Add credentials to build more trust',
          description: 'Add certificates, training proof, or portfolio proof when you have them.',
          mode: 'work',
          optional: true,
        },
      ];

  return buildModeCompletion({
    mode: 'work',
    setupStarted,
    isVerified,
    requiredItems,
    optionalItems,
  });
}

function buildHiringCompletion({
  core,
  hiring,
  isVerified,
}: {
  core: ProfileCompletionStatus['core'];
  hiring: ProfileCompletionStatus['hiring'];
  isVerified: boolean;
}): ProfileModeCompletion {
  const hasIntro = Boolean(compactText(hiring.headline) || compactText(hiring.bio));
  const hasNeededServices = Boolean(hiring.neededServices.length || hiring.customNeededServices.length);
  const hasCoordinationStyle = Boolean(compactText(hiring.coordinationStyle));
  const hasPreferredSchedule = Boolean(compactText(hiring.preferredSchedule));
  const setupStarted = Boolean(
    hasIntro ||
      hasNeededServices ||
      hasCoordinationStyle ||
      hasPreferredSchedule ||
      compactText(hiring.coordinationStyle),
  );
  const requiredItems: RequiredItem[] = [
    {
      id: 'hiring-intro',
      label: 'Add a hiring intro',
      complete: hasIntro,
      action: completionAction({
        id: 'hiring-intro',
        kind: 'edit_hiring_preferences',
        label: 'Add a hiring intro',
        description: 'Tell workers what kind of help you usually need.',
        mode: 'hiring',
      }),
    },
    {
      id: 'needed-services',
      label: 'Add services you need',
      complete: hasNeededServices,
      action: completionAction({
        id: 'needed-services',
        kind: 'edit_hiring_preferences',
        label: 'Add services you need',
        description: 'Pick service categories so worker discovery can be more relevant.',
        mode: 'hiring',
      }),
    },
    {
      id: 'coordination-style',
      label: 'Set coordination style',
      complete: hasCoordinationStyle,
      action: completionAction({
        id: 'coordination-style',
        kind: 'edit_coordination_style',
        label: 'Set coordination style',
        description: 'Tell workers how you usually coordinate details.',
        mode: 'hiring',
      }),
    },
    {
      id: 'preferred-schedule',
      label: 'Set preferred schedule',
      complete: hasPreferredSchedule,
      action: completionAction({
        id: 'preferred-schedule',
        kind: 'edit_hiring_preferences',
        label: 'Set preferred schedule',
        description: 'Set when you usually hire help.',
        mode: 'hiring',
      }),
    },
  ];

  const optionalItems: ProfileCompletionAction[] = getSharedOptionalActions(core);

  return buildModeCompletion({
    mode: 'hiring',
    setupStarted,
    isVerified,
    requiredItems,
    optionalItems,
  });
}

function buildModeCompletion({
  mode,
  setupStarted,
  isVerified,
  requiredItems,
  optionalItems,
}: {
  mode: ProfileCompletionMode;
  setupStarted: boolean;
  isVerified: boolean;
  requiredItems: RequiredItem[];
  optionalItems: ProfileCompletionAction[];
}): ProfileModeCompletion {
  const completedSteps = requiredItems.filter((item) => item.complete).length;
  const totalSteps = requiredItems.length;
  const missingItems = requiredItems.filter((item) => !item.complete).map((item) => item.action);
  const requiredReady = totalSteps > 0 && completedSteps === totalSteps;
  const state = !setupStarted ? 'not_set_up' : requiredReady ? 'ready' : 'incomplete';
  const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const baseLabel =
    mode === 'core' ? 'Core Profile' : mode === 'work' ? 'Work Profile' : 'Hiring Profile';
  const firstMissing = missingItems[0]?.label;
  const statusLabel = state === 'not_set_up'
    ? 'Not set up'
    : requiredReady && !isVerified
      ? 'Ready after barangay verification'
      : state === 'ready'
        ? 'Ready'
        : firstMissing
          ? `Needs ${firstMissing.toLowerCase()}`
          : `${baseLabel} incomplete`;

  return {
    state,
    statusLabel,
    percent,
    completedSteps,
    totalSteps,
    missingItems,
    optionalItems,
    nextRecommendedAction: missingItems[0] ?? optionalItems[0] ?? null,
  };
}

function buildVerificationStatus({
  isVerified,
  latestVerification,
}: {
  isVerified: boolean;
  latestVerification: VerificationRow | null;
}): ProfileVerificationStatus {
  if (isVerified) {
    return {
      status: 'approved',
      label: 'Verified',
      description: 'Your official barangay verification is approved.',
      reviewerNote: latestVerification?.reviewer_note ?? null,
      submittedAt: latestVerification?.created_at ?? null,
      reviewedAt: latestVerification?.reviewed_at ?? latestVerification?.updated_at ?? null,
      action: null,
    };
  }

  const status = latestVerification?.status;
  if (status === 'pending') {
    return {
      status: 'pending',
      label: 'Verification pending',
      description: 'Your barangay verification is under review.',
      reviewerNote: latestVerification?.reviewer_note ?? null,
      submittedAt: latestVerification?.created_at ?? null,
      reviewedAt: latestVerification?.reviewed_at ?? null,
      action: {
        id: 'verification',
        kind: 'open_verification',
        label: 'View verification status',
        description: 'See your current barangay verification status.',
        mode: 'core',
      },
    };
  }

  if (status === 'needs_more_info') {
    return {
      status: 'needs_more_info',
      label: 'Needs more information',
      description: latestVerification?.reviewer_note || 'Barangay staff need updated details before approval.',
      reviewerNote: latestVerification?.reviewer_note ?? null,
      submittedAt: latestVerification?.created_at ?? null,
      reviewedAt: latestVerification?.reviewed_at ?? latestVerification?.updated_at ?? null,
      action: {
        id: 'verification',
        kind: 'open_verification',
        label: 'Update verification',
        description: 'Send the missing information for barangay review.',
        mode: 'core',
      },
    };
  }

  if (status === 'rejected') {
    return {
      status: 'rejected',
      label: 'Verification rejected',
      description: latestVerification?.reviewer_note || 'Review the reason and submit corrected details.',
      reviewerNote: latestVerification?.reviewer_note ?? null,
      submittedAt: latestVerification?.created_at ?? null,
      reviewedAt: latestVerification?.reviewed_at ?? latestVerification?.updated_at ?? null,
      action: {
        id: 'verification',
        kind: 'open_verification',
        label: 'Resubmit verification',
        description: 'Submit corrected details for barangay review.',
        mode: 'core',
      },
    };
  }

  return {
    status: 'unverified',
    label: 'Verification needed',
    description: 'Barangay verification is required before publishing services, messaging, and contacting through Messages.',
    reviewerNote: null,
    submittedAt: null,
    reviewedAt: null,
    action: {
      id: 'verification',
      kind: 'open_verification',
      label: 'Start barangay verification',
      description: 'Submit your verification request to unlock trusted marketplace actions.',
      mode: 'core',
    },
  };
}

function completionAction({
  id,
  kind,
  label,
  description,
  mode,
  targetId,
}: {
  id: string;
  kind: ProfileCompletionAction['kind'];
  label: string;
  description: string;
  mode: ProfileCompletionMode;
  targetId?: string | null;
}): ProfileCompletionAction {
  return {
    id,
    kind,
    label,
    description,
    mode,
    targetId: targetId ?? null,
  };
}

function providerTextStarted(work: ProfileCompletionStatus['work']) {
  return Boolean(
    compactText(work.headline) ||
      compactText(work.bio) ||
      compactText(work.serviceArea) ||
      compactText(work.availability),
  );
}

function getSharedOptionalActions(core: ProfileCompletionStatus['core']) {
  if (core.avatarUrl) return [];

  return [
    {
      id: 'profile-photo',
      kind: 'add_profile_photo' as const,
      label: 'Optional: Add a clear profile photo',
      description: 'Help neighbors recognize and trust who they are talking to.',
      mode: 'core' as const,
      optional: true,
    },
  ];
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
      compactText(input.coordinationStyle) &&
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
