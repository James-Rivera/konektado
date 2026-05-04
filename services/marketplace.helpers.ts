import type { ServiceResult } from '@/services/auth.service';
import type {
    JobSummary,
    ProviderService,
    PublicProfileSummary,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

export type ProfileRow = {
  id: string;
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

export type JobRow = {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  service_needed: string | null;
  tags?: string[] | null;
  photo_urls: string[] | null;
  barangay: string | null;
  location: string | null;
  location_text: string | null;
  budget: number | null;
  budget_amount: number | null;
  workers_needed: number | null;
  schedule_text: string | null;
  status: JobSummary['status'];
  accepted_provider_id: string | null;
  allow_messages: boolean | null;
  auto_reply_enabled: boolean | null;
  auto_close_enabled: boolean | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
};

export type ServiceRow = {
  id: string;
  provider_id: string;
  category: string;
  title: string;
  description: string | null;
  tags?: string[] | null;
  photo_urls?: string[] | null;
  years_experience: number | null;
  availability_text: string | null;
  rate_text: string | null;
  barangay?: string | null;
  location_text?: string | null;
  allow_messages?: boolean | null;
  auto_reply_enabled?: boolean | null;
  auto_pause_enabled?: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export async function getCurrentUserId(): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { data: null, error: 'Please sign in again to continue.' };
  }

  return { data: data.user.id, error: null };
}

export async function requireVerifiedUser(): Promise<ServiceResult<string>> {
  const user = await getCurrentUserId();

  if (user.error) return user;

  const { data, error } = await supabase
    .from('profiles')
    .select('verified_at, barangay_verified_at')
    .eq('id', user.data)
    .maybeSingle<{ verified_at: string | null; barangay_verified_at: string | null }>();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data?.barangay_verified_at && !data?.verified_at) {
    return { data: null, error: 'Complete barangay verification to use this feature.' };
  }

  return user;
}

export async function isCurrentUserAdmin() {
  const user = await getCurrentUserId();
  if (user.error) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.data)
    .eq('role', 'barangay_admin')
    .limit(1)
    .maybeSingle<{ id: string }>();

  return Boolean(data);
}

export function mapProfile(row: ProfileRow | null | undefined): PublicProfileSummary | null {
  if (!row) return null;

  const displayName =
    compactText(row.full_name) ||
    `${compactText(row.first_name)} ${compactText(row.last_name)}`.trim() ||
    'Konektado resident';

  return {
    id: row.id,
    fullName: displayName,
    firstName: row.first_name,
    lastName: row.last_name,
    barangay: row.barangay,
    city: row.city,
    about: row.about,
    avatarUrl: row.avatar_url,
    availability: row.availability,
    barangayVerifiedAt: row.barangay_verified_at,
    verifiedAt: row.verified_at,
  };
}

export async function loadPublicProfiles(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, PublicProfileSummary>();

  const { data } = await supabase
    .from('profiles')
    .select(
      'id, full_name, first_name, last_name, barangay, city, about, avatar_url, availability, verified_at, barangay_verified_at',
    )
    .in('id', ids);

  return new Map(
    ((data as ProfileRow[] | null) ?? [])
      .map(mapProfile)
      .filter((profile): profile is PublicProfileSummary => Boolean(profile))
      .map((profile) => [profile.id, profile]),
  );
}

export function mapJob(row: JobRow, profiles: Map<string, PublicProfileSummary>): JobSummary {
  const clientId = row.client_id ?? row.owner_id;

  return {
    id: row.id,
    clientId,
    title: row.title,
    description: row.description,
    category: row.category,
    serviceNeeded: row.service_needed ?? null,
    tags: row.tags ?? [],
    photoUrls: row.photo_urls ?? [],
    barangay: row.barangay,
    locationText: row.location_text ?? row.location,
    budgetAmount: row.budget_amount ?? row.budget,
    workersNeeded: row.workers_needed ?? null,
    scheduleText: row.schedule_text,
    status: row.status,
    acceptedProviderId: row.accepted_provider_id,
    allowMessages: row.allow_messages ?? true,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    autoCloseEnabled: row.auto_close_enabled ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    client: profiles.get(clientId) ?? null,
  };
}

export function mapService(row: ServiceRow): ProviderService {
  return {
    id: row.id,
    providerId: row.provider_id,
    category: row.category,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    photoUrls: row.photo_urls ?? [],
    yearsExperience: row.years_experience,
    availabilityText: row.availability_text,
    rateText: row.rate_text,
    barangay: row.barangay ?? null,
    locationText: row.location_text ?? row.barangay ?? null,
    allowMessages: row.allow_messages ?? true,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    autoPauseEnabled: row.auto_pause_enabled ?? false,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
