import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  isCurrentUserAdmin,
  loadPublicProfiles,
  mapProfile,
  type ProfileRow,
} from '@/services/marketplace.helpers';
import { supabase } from '@/utils/supabase';

export type AdminPhotoSource = 'profile' | 'job' | 'service';

export type AdminPublicPhotoItem = {
  id: string;
  source: AdminPhotoSource;
  sourceId: string;
  ownerId: string;
  ownerName: string | null;
  profileRouteKind: 'client' | 'worker' | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  location: string | null;
  statusLabel: string;
  createdAt: string;
};

type JobPhotoRow = {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  photo_urls: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ServicePhotoRow = {
  id: string;
  provider_id: string;
  title: string;
  category: string | null;
  photo_urls: string[] | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

type ProfilePhotoRow = Pick<
  ProfileRow,
  | 'id'
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'barangay'
  | 'purok_sitio'
  | 'street'
  | 'subdivision_area'
  | 'city'
  | 'about'
  | 'avatar_url'
  | 'availability'
  | 'verified_at'
  | 'barangay_verified_at'
> & {
  updated_at?: string | null;
};

type UserRoleRow = {
  user_id: string;
  role: string;
  is_active: boolean | null;
};

export async function listAdminPublicPhotos({
  limit = 120,
}: {
  limit?: number;
} = {}): Promise<ServiceResult<AdminPublicPhotoItem[]>> {
  if (!(await isCurrentUserAdmin())) {
    return { data: null, error: 'Barangay admin access is required.' };
  }

  const normalizedLimit = normalizeLimit(limit);
  const [profilesResult, jobsResult, servicesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id, full_name, first_name, last_name, barangay, purok_sitio, street, subdivision_area, city, about, avatar_url, availability, verified_at, barangay_verified_at, updated_at',
      )
      .not('avatar_url', 'is', null)
      .limit(normalizedLimit),
    supabase
      .from('jobs')
      .select('id, owner_id, client_id, title, photo_urls, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(normalizedLimit),
    supabase
      .from('services')
      .select('id, provider_id, title, category, photo_urls, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(normalizedLimit),
  ]);

  const error = profilesResult.error ?? jobsResult.error ?? servicesResult.error;
  if (error) return { data: null, error: error.message };

  const profileRows = ((profilesResult.data as ProfilePhotoRow[] | null) ?? []).filter((row) =>
    Boolean(compactText(row.avatar_url)),
  );
  const jobRows = ((jobsResult.data as JobPhotoRow[] | null) ?? []).filter((row) => row.photo_urls?.length);
  const serviceRows = ((servicesResult.data as ServicePhotoRow[] | null) ?? []).filter((row) => row.photo_urls?.length);

  const ownerIds = Array.from(
    new Set([
      ...profileRows.map((row) => row.id),
      ...jobRows.map((row) => row.client_id ?? row.owner_id),
      ...serviceRows.map((row) => row.provider_id),
    ]),
  );
  const owners = await loadPublicProfiles(ownerIds);
  const profileRouteKinds = await loadProfileRouteKinds(ownerIds);

  const profilePhotos = profileRows.map((row) => {
    const profile = mapProfile(row);
    return {
      id: `profile:${row.id}`,
      source: 'profile' as const,
      sourceId: row.id,
      ownerId: row.id,
      ownerName: profile?.fullName ?? null,
      profileRouteKind: profileRouteKinds.get(row.id) ?? null,
      title: profile?.fullName ? `${profile.fullName}'s profile photo` : 'Profile photo',
      subtitle: profile?.approximateLocation ?? 'Resident profile',
      imageUrl: compactText(row.avatar_url),
      location: profile?.approximateLocation ?? null,
      statusLabel: 'Public profile',
      createdAt: row.updated_at ?? new Date(0).toISOString(),
    };
  });

  const jobPhotos = jobRows.flatMap((row) => {
    const ownerId = row.client_id ?? row.owner_id;
    const owner = owners.get(ownerId) ?? null;
    return (row.photo_urls ?? []).filter(Boolean).map((imageUrl, index) => ({
      id: `job:${row.id}:${index}`,
      source: 'job' as const,
      sourceId: row.id,
      ownerId,
      ownerName: owner?.fullName ?? null,
      profileRouteKind: 'client' as const,
      title: compactText(row.title) || 'Job photo',
      subtitle: owner?.fullName ? `Job by ${owner.fullName}` : `Job ${shortId(row.id)}`,
      imageUrl,
      location: owner?.approximateLocation ?? null,
      statusLabel: formatStatus(row.status),
      createdAt: row.created_at,
    }));
  });

  const servicePhotos = serviceRows.flatMap((row) => {
    const owner = owners.get(row.provider_id) ?? null;
    return (row.photo_urls ?? []).filter(Boolean).map((imageUrl, index) => ({
      id: `service:${row.id}:${index}`,
      source: 'service' as const,
      sourceId: row.id,
      ownerId: row.provider_id,
      ownerName: owner?.fullName ?? null,
      profileRouteKind: 'worker' as const,
      title: compactText(row.title) || compactText(row.category) || 'Service photo',
      subtitle: owner?.fullName ? `Service by ${owner.fullName}` : `Service ${shortId(row.id)}`,
      imageUrl,
      location: owner?.approximateLocation ?? null,
      statusLabel: row.is_active ? 'Active service' : 'Inactive service',
      createdAt: row.created_at,
    }));
  });

  return {
    data: [...profilePhotos, ...jobPhotos, ...servicePhotos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    error: null,
  };
}

async function loadProfileRouteKinds(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const routeKinds = new Map<string, 'client' | 'worker'>();
  if (!ids.length) return routeKinds;

  const { data } = await supabase
    .from('user_roles')
    .select('user_id, role, is_active')
    .in('user_id', ids)
    .in('role', ['provider', 'client']);

  const rows = (data as UserRoleRow[] | null) ?? [];
  for (const row of rows) {
    if (row.role !== 'provider' && row.role !== 'client') continue;

    const nextKind = row.role === 'provider' ? 'worker' : 'client';
    const current = routeKinds.get(row.user_id);

    if (!current || row.is_active || (current === 'client' && nextKind === 'worker')) {
      routeKinds.set(row.user_id, nextKind);
    }
  }

  return routeKinds;
}

function normalizeLimit(value: number) {
  if (!Number.isFinite(value)) return 120;
  return Math.max(1, Math.min(200, Math.floor(value)));
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatStatus(value: string | null | undefined) {
  const cleanValue = compactText(value);
  if (!cleanValue) return 'Public job';

  return cleanValue
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
