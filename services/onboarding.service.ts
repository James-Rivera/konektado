import {
  isOfferedDeliveryMode,
  splitOfficialAndCustomServices,
} from "@/constants/service-taxonomy";
import type { ServiceResult } from "@/services/auth.service";
import type {
    AppRole,
    OnboardingDraft,
    OnboardingIntent,
    UserPreferences,
} from "@/types/onboarding.types";
import { saveUserRole } from "@/utils/save-role";
import { supabase } from "@/utils/supabase";

export const DEFAULT_PROVINCE = "Batangas";
export const DEFAULT_CITY = "Santo Tomas";
export const DEFAULT_BARANGAY = "San Pedro";

export const emptyOnboardingDraft: OnboardingDraft = {
  firstName: "",
  lastName: "",
  birthdate: "",
  streetAddress: "",
  province: DEFAULT_PROVINCE,
  city: DEFAULT_CITY,
  barangay: DEFAULT_BARANGAY,
  purokSitio: "",
  street: "",
  subdivisionArea: "",
  blockLot: "",
  houseNumber: "",
  landmarkNote: "",
  preferredContactMethod: "app_message",
  offeredDeliveryMode: null,
  offeredServices: [],
  neededServices: [],
  customOfferedServices: [],
  customNeededServices: [],
  serviceType: "",
  hasCertifications: null,
  certificationDetails: "",
  wantsBarangayVerification: false,
  verificationNote: "",
  verificationFiles: [],
};

type UserPreferencesRow = {
  custom_needed_services: string[] | null;
  custom_offered_services: string[] | null;
  intent: OnboardingIntent;
  needed_services: string[] | null;
  offered_delivery_mode?: string | null;
  offered_services: string[] | null;
  onboarding_completed_at: string | null;
};

const PREFERENCES_SELECT =
  "intent, offered_delivery_mode, offered_services, needed_services, custom_offered_services, custom_needed_services, onboarding_completed_at";
const LEGACY_PREFERENCES_SELECT =
  "intent, offered_services, needed_services, custom_offered_services, custom_needed_services, onboarding_completed_at";

function splitServices(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function compactServices(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function normalizeIntent(raw: unknown): OnboardingIntent | null {
  if (raw === "client" || raw === "provider") return raw;
  return null;
}

function activeRoleForIntent(intent: OnboardingIntent): AppRole {
  return intent === "provider" ? "provider" : "client";
}

function mapPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    customNeededServices: row.custom_needed_services ?? [],
    customOfferedServices: row.custom_offered_services ?? [],
    intent: row.intent,
    neededServices: row.needed_services ?? [],
    offeredDeliveryMode: isOfferedDeliveryMode(row.offered_delivery_mode)
      ? row.offered_delivery_mode
      : null,
    offeredServices: row.offered_services ?? [],
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

function isMissingOfferedDeliveryModeColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("offered_delivery_mode"));
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
    return { data: null, error: "Please sign in again to continue." };
  }

  const user = userResult.user;
  const userMetadata = user.user_metadata as Record<string, unknown>;
  const metadataRole =
    normalizeIntent(userMetadata.role) ?? normalizeIntent(userMetadata.app_role);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, full_name, birthdate, street_address, province, city, barangay, purok_sitio, street, subdivision_area, block_lot, house_number, landmark_note, preferred_contact_method, role, active_role",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const { data: preferencesResult, error: preferencesError } = await supabase
    .from("user_preferences")
    .select(PREFERENCES_SELECT)
    .eq("user_id", user.id)
    .maybeSingle<UserPreferencesRow>();
  let preferences = preferencesResult;

  if (isMissingOfferedDeliveryModeColumn(preferencesError)) {
    const { data: legacyPreferences } = await supabase
      .from("user_preferences")
      .select(LEGACY_PREFERENCES_SELECT)
      .eq("user_id", user.id)
      .maybeSingle<UserPreferencesRow>();

    preferences = legacyPreferences ? { ...legacyPreferences, offered_delivery_mode: null } : null;
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role, is_active")
    .eq("user_id", user.id)
    .order("is_active", { ascending: false })
    .limit(1);

  const activeRole =
    normalizeIntent(profile?.active_role) ??
    normalizeIntent(profile?.role) ??
    normalizeIntent(userRoles?.[0]?.role);
  const intent = normalizeIntent(preferences?.intent) ?? metadataRole ?? activeRole;
  const fallbackName = profile?.full_name?.split(" ") ?? [];

  let providerServiceType = "";

  if (intent === "provider") {
    const { data: providerProfile } = await supabase
      .from("provider_profiles")
      .select("service_type, has_certifications, certification_details")
      .eq("user_id", user.id)
      .maybeSingle();

    providerServiceType = providerProfile?.service_type ?? "";
  }

  const offeredServices = preferences?.offered_services?.length
    ? preferences.offered_services
    : splitServices(providerServiceType);

  return {
    data: {
      draft: {
        ...emptyOnboardingDraft,
        firstName: profile?.first_name ?? fallbackName[0] ?? "",
        lastName: profile?.last_name ?? fallbackName.slice(1).join(" ") ?? "",
        birthdate: profile?.birthdate ?? "",
        streetAddress: profile?.street_address ?? "",
        province: profile?.province || DEFAULT_PROVINCE,
        city: profile?.city || DEFAULT_CITY,
        barangay: profile?.barangay || DEFAULT_BARANGAY,
        purokSitio: profile?.purok_sitio ?? "",
        street: profile?.street ?? "",
        subdivisionArea: profile?.subdivision_area ?? "",
        blockLot: profile?.block_lot ?? "",
        houseNumber: profile?.house_number ?? "",
        landmarkNote: profile?.landmark_note ?? "",
        preferredContactMethod: profile?.preferred_contact_method ?? "app_message",
        offeredDeliveryMode: isOfferedDeliveryMode(preferences?.offered_delivery_mode)
          ? preferences.offered_delivery_mode
          : null,
        offeredServices,
        neededServices: preferences?.needed_services ?? [],
        customOfferedServices: preferences?.custom_offered_services ?? [],
        customNeededServices: preferences?.custom_needed_services ?? [],
        serviceType: offeredServices.join(", "),
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
  const offeredSplit = splitOfficialAndCustomServices([
    ...draft.offeredServices,
    ...draft.customOfferedServices,
  ]);
  const neededSplit = splitOfficialAndCustomServices([
    ...draft.neededServices,
    ...draft.customNeededServices,
  ]);
  const offeredServices = compactServices(offeredSplit.official);
  const neededServices = compactServices(neededSplit.official);
  const customOfferedServices = compactServices(offeredSplit.custom);
  const customNeededServices = compactServices(neededSplit.custom);
  const privateAddress = compactServices([
    draft.houseNumber,
    draft.blockLot,
    draft.street,
    draft.subdivisionArea,
    draft.landmarkNote,
    draft.barangay,
    draft.city,
    draft.province,
  ]).join(", ");

  const roleError = await saveUserRole({
    activeRole,
    email,
    role: intent,
    userId,
  });

  if (roleError) {
    return { data: null, error: roleError.message };
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    role: activeRole,
    active_role: activeRole,
    first_name: draft.firstName.trim(),
    last_name: draft.lastName.trim(),
    full_name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
    birthdate: draft.birthdate ? draft.birthdate : null,
    street_address: privateAddress || draft.streetAddress.trim() || null,
    province: DEFAULT_PROVINCE,
    city: DEFAULT_CITY,
    barangay: DEFAULT_BARANGAY,
    street: draft.street.trim() || null,
    subdivision_area: draft.subdivisionArea.trim() || null,
    block_lot: draft.blockLot.trim() || null,
    house_number: draft.houseNumber.trim() || null,
    landmark_note: draft.landmarkNote.trim() || null,
    preferred_contact_method: draft.preferredContactMethod || "app_message",
  });

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const preferencesPayload = {
    user_id: userId,
    intent,
    offered_delivery_mode: intent === "provider" ? draft.offeredDeliveryMode : null,
    offered_services: offeredServices,
    needed_services: neededServices,
    custom_offered_services: customOfferedServices,
    custom_needed_services: customNeededServices,
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  let { error: preferencesError } = await supabase
    .from("user_preferences")
    .upsert(preferencesPayload);

  if (isMissingOfferedDeliveryModeColumn(preferencesError)) {
    const { offered_delivery_mode: _offeredDeliveryMode, ...legacyPreferencesPayload } =
      preferencesPayload;
    const retry = await supabase.from("user_preferences").upsert(legacyPreferencesPayload);
    preferencesError = retry.error;
  }

  if (preferencesError) {
    return { data: null, error: preferencesError.message };
  }

  if (intent === "provider") {
    const { error: providerProfileError } = await supabase
      .from("provider_profiles")
      .upsert({
        user_id: userId,
        service_type: offeredServices.join(", ") || null,
        custom_offered_services: customOfferedServices,
        custom_service_review_status: customOfferedServices.length ? "pending" : "none",
        has_certifications: null,
        certification_details: null,
        certification_status: null,
        updated_at: new Date().toISOString(),
      });

    if (providerProfileError) {
      return { data: null, error: providerProfileError.message };
    }
  } else if (intent === "client") {
    const { error: clientProfileError } = await supabase
      .from("client_profiles")
      .upsert({
        user_id: userId,
        updated_at: new Date().toISOString(),
      });

    if (clientProfileError) {
      return { data: null, error: clientProfileError.message };
    }
  }

  return { data: undefined, error: null };
}

export async function getMyUserPreferences(): Promise<
  ServiceResult<UserPreferences | null>
> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return { data: null, error: "Please sign in again to continue." };
  }

  let { data, error } = await supabase
    .from("user_preferences")
    .select(PREFERENCES_SELECT)
    .eq("user_id", userResult.user.id)
    .maybeSingle<UserPreferencesRow>();

  if (isMissingOfferedDeliveryModeColumn(error)) {
    const legacyResult = await supabase
      .from("user_preferences")
      .select(LEGACY_PREFERENCES_SELECT)
      .eq("user_id", userResult.user.id)
      .maybeSingle<UserPreferencesRow>();

    data = legacyResult.data ? { ...legacyResult.data, offered_delivery_mode: null } : null;
    error = legacyResult.error;
  }

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ? mapPreferences(data) : null, error: null };
}
