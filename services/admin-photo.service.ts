import type { ServiceResult } from '@/services/auth.service';
import {
  compactPhotoUrl,
  getPublicPhotoKey,
  hashPhotoUrl,
  type PublicPhotoSourceType,
  type PublicPhotoVisibility,
} from '@/services/content-visibility.service';
import {
  compactText,
  getCurrentUserId,
  isCurrentUserAdmin,
  loadPublicProfiles,
  mapProfile,
  type ProfileRow,
} from '@/services/marketplace.helpers';
import { supabase } from '@/utils/supabase';

export type AdminPhotoSource = 'profile' | 'job' | 'service';
export type AdminPhotoModerationStatus = 'visible' | 'flagged' | 'hidden' | 'cleared';
export type AdminPhotoAction = 'flag' | 'hide' | 'clear';

export type AdminPublicPhotoItem = {
  id: string;
  source: AdminPhotoSource;
  sourceId: string;
  sourceType: PublicPhotoSourceType;
  ownerId: string;
  ownerName: string | null;
  profileRouteKind: 'client' | 'worker' | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  imagePath: string | null;
  location: string | null;
  statusLabel: string;
  createdAt: string;
  moderationStatus: AdminPhotoModerationStatus;
  visibility: PublicPhotoVisibility;
  latestActionAt: string | null;
};

export type AdminPhotoDetail = AdminPublicPhotoItem & {
  latestAction: {
    action: AdminPhotoAction;
    reason: string | null;
    note: string | null;
    reviewedAt: string;
    reviewedBy: string;
    status: Exclude<AdminPhotoModerationStatus, 'visible'>;
  } | null;
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

type ModerationActionRow = {
  action: AdminPhotoAction;
  note: string | null;
  reason: string | null;
  reviewed_at: string;
  reviewed_by: string;
  status: 'flagged' | 'hidden' | 'cleared';
  target_id: string;
};

type VisibilityRow = {
  content_id: string;
  visibility: PublicPhotoVisibility;
};

export async function listPublicPhotosWithModeration({
  limit = 120,
}: {
  limit?: number;
} = {}): Promise<ServiceResult<AdminPublicPhotoItem[]>> {
  const photos = await loadAdminPublicPhotos({ limit });
  if (photos.error || !photos.data) return photos;

  const states = await loadModerationStates(photos.data.map((photo) => photo.id));
  return {
    data: photos.data
      .map((photo) => applyModerationState(photo, states))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    error: null,
  };
}

export function listAdminPublicPhotos(input?: { limit?: number }) {
  return listPublicPhotosWithModeration(input);
}

export async function getPublicPhotoDetail(photoKey: string): Promise<ServiceResult<AdminPhotoDetail>> {
  const cleanPhotoKey = compactText(photoKey);
  if (!cleanPhotoKey) return { data: null, error: 'Choose a photo to review.' };

  const photos = await loadAdminPublicPhotos({ limit: 220 });
  if (photos.error || !photos.data) return { data: null, error: photos.error };

  const photo = photos.data.find((item) => item.id === cleanPhotoKey);
  if (!photo) return { data: null, error: 'Photo not found.' };

  const states = await loadModerationStates([photo.id]);
  const action = states.actions.get(photo.id) ?? null;

  return {
    data: {
      ...applyModerationState(photo, states),
      latestAction: action,
    },
    error: null,
  };
}

export async function flagPhoto(
  photo: AdminPublicPhotoItem,
  reason: string,
  note?: string | null,
): Promise<ServiceResult<AdminPhotoDetail>> {
  return runPhotoModerationAction({
    action: 'flag',
    note,
    photo,
    reason,
    status: 'flagged',
  });
}

export async function hidePhoto(
  photo: AdminPublicPhotoItem,
  reason: string,
  note?: string | null,
): Promise<ServiceResult<AdminPhotoDetail>> {
  return runPhotoModerationAction({
    action: 'hide',
    note,
    photo,
    reason,
    status: 'hidden',
  });
}

export async function clearPhoto(
  photo: AdminPublicPhotoItem,
  note?: string | null,
): Promise<ServiceResult<AdminPhotoDetail>> {
  return runPhotoModerationAction({
    action: 'clear',
    note,
    photo,
    reason: null,
    status: 'cleared',
  });
}

export async function getPhotoVisibilityStatus(
  sourceType: PublicPhotoSourceType,
  sourceId: string,
  imageUrl: string,
): Promise<ServiceResult<AdminPhotoModerationStatus>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const photoKey = getPublicPhotoKey({ imageUrl, sourceId, sourceType });
  const states = await loadModerationStates([photoKey]);
  const state = states.actions.get(photoKey)?.status;
  if (state) return { data: state, error: null };

  return {
    data: states.visibility.get(photoKey) === 'hidden' ? 'hidden' : 'visible',
    error: null,
  };
}

async function runPhotoModerationAction({
  action,
  note,
  photo,
  reason,
  status,
}: {
  action: AdminPhotoAction;
  note?: string | null;
  photo: AdminPublicPhotoItem;
  reason: string | null;
  status: 'flagged' | 'hidden' | 'cleared';
}): Promise<ServiceResult<AdminPhotoDetail>> {
  const admin = await requireAdmin();
  if (admin.error) return { data: null, error: admin.error };

  if ((action === 'flag' || action === 'hide') && !compactText(reason)) {
    return { data: null, error: 'Choose a reason before saving this review.' };
  }

  const reviewer = await getCurrentUserId();
  if (reviewer.error || !reviewer.data) return { data: null, error: reviewer.error ?? 'Please sign in again.' };

  const reviewedAt = new Date().toISOString();
  const { error: actionError } = await supabase.from('admin_moderation_actions').insert({
    action,
    image_path: photo.imagePath,
    image_url: photo.imageUrl,
    note: compactText(note) || null,
    owner_id: photo.ownerId,
    reason: compactText(reason) || null,
    reviewed_at: reviewedAt,
    reviewed_by: reviewer.data,
    source_id: photo.sourceId,
    source_type: photo.sourceType,
    status,
    target_id: photo.id,
    target_type: 'photo',
  });

  if (actionError) return { data: null, error: actionError.message };

  if (action === 'hide' || action === 'clear') {
    const visibilityResult = await upsertContentVisibility({
      hiddenBy: action === 'hide' ? reviewer.data : null,
      hiddenReason: action === 'hide' ? compactText(reason) || null : null,
      imageUrl: photo.imageUrl,
      ownerId: photo.ownerId,
      photoKey: photo.id,
      sourceId: photo.sourceId,
      sourceType: photo.sourceType,
      visibility: action === 'hide' ? 'hidden' : 'visible',
    });

    if (visibilityResult.error) return { data: null, error: visibilityResult.error };
  }

  return getPublicPhotoDetail(photo.id);
}

async function upsertContentVisibility({
  hiddenBy,
  hiddenReason,
  imageUrl,
  ownerId,
  photoKey,
  sourceId,
  sourceType,
  visibility,
}: {
  hiddenBy: string | null;
  hiddenReason: string | null;
  imageUrl: string;
  ownerId: string;
  photoKey: string;
  sourceId: string;
  sourceType: PublicPhotoSourceType;
  visibility: PublicPhotoVisibility;
}): Promise<ServiceResult<void>> {
  const hiddenAt = visibility === 'hidden' ? new Date().toISOString() : null;
  const { error } = await supabase.from('content_visibility').upsert(
    {
      content_id: photoKey,
      content_type: sourceType,
      hidden_at: hiddenAt,
      hidden_by: hiddenBy,
      hidden_reason: hiddenReason,
      image_url: imageUrl,
      owner_id: ownerId,
      source_id: sourceId,
      visibility,
    },
    { onConflict: 'content_type,content_id' },
  );

  return error ? { data: null, error: error.message } : { data: undefined, error: null };
}

async function loadAdminPublicPhotos({
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
    const imageUrl = compactText(row.avatar_url);
    const profile = mapProfile(row);
    return {
      id: getPublicPhotoKey({ imageUrl, sourceId: row.id, sourceType: 'profile_photo' }),
      source: 'profile' as const,
      sourceId: row.id,
      sourceType: 'profile_photo' as const,
      ownerId: row.id,
      ownerName: profile?.fullName ?? null,
      profileRouteKind: profileRouteKinds.get(row.id) ?? null,
      title: profile?.fullName ? `${profile.fullName}'s profile photo` : 'Profile photo',
      subtitle: profile?.approximateLocation ?? 'Resident profile',
      imageUrl,
      imagePath: getStoragePathFromPublicUrl(imageUrl),
      location: profile?.approximateLocation ?? null,
      statusLabel: 'Public profile',
      createdAt: row.updated_at ?? new Date(0).toISOString(),
      moderationStatus: 'visible' as const,
      visibility: 'visible' as const,
      latestActionAt: null,
    };
  });

  const jobPhotos = jobRows.flatMap((row) => {
    const ownerId = row.client_id ?? row.owner_id;
    const owner = owners.get(ownerId) ?? null;
    return Array.from(new Set((row.photo_urls ?? []).map(compactPhotoUrl).filter(Boolean))).map((imageUrl) => ({
      id: getPublicPhotoKey({ imageUrl, sourceId: row.id, sourceType: 'job_photo' }),
      source: 'job' as const,
      sourceId: row.id,
      sourceType: 'job_photo' as const,
      ownerId,
      ownerName: owner?.fullName ?? null,
      profileRouteKind: 'client' as const,
      title: compactText(row.title) || 'Job photo',
      subtitle: owner?.fullName ? `Job by ${owner.fullName}` : `Job ${shortId(row.id)}`,
      imageUrl,
      imagePath: getStoragePathFromPublicUrl(imageUrl),
      location: owner?.approximateLocation ?? null,
      statusLabel: formatStatus(row.status),
      createdAt: row.created_at,
      moderationStatus: 'visible' as const,
      visibility: 'visible' as const,
      latestActionAt: null,
    }));
  });

  const servicePhotos = serviceRows.flatMap((row) => {
    const owner = owners.get(row.provider_id) ?? null;
    return Array.from(new Set((row.photo_urls ?? []).map(compactPhotoUrl).filter(Boolean))).map((imageUrl) => ({
      id: getPublicPhotoKey({ imageUrl, sourceId: row.id, sourceType: 'service_photo' }),
      source: 'service' as const,
      sourceId: row.id,
      sourceType: 'service_photo' as const,
      ownerId: row.provider_id,
      ownerName: owner?.fullName ?? null,
      profileRouteKind: 'worker' as const,
      title: compactText(row.title) || compactText(row.category) || 'Service photo',
      subtitle: owner?.fullName ? `Service by ${owner.fullName}` : `Service ${shortId(row.id)}`,
      imageUrl,
      imagePath: getStoragePathFromPublicUrl(imageUrl),
      location: owner?.approximateLocation ?? null,
      statusLabel: row.is_active ? 'Active service' : 'Inactive service',
      createdAt: row.created_at,
      moderationStatus: 'visible' as const,
      visibility: 'visible' as const,
      latestActionAt: null,
    }));
  });

  return {
    data: [...profilePhotos, ...jobPhotos, ...servicePhotos],
    error: null,
  };
}

async function loadModerationStates(photoKeys: string[]) {
  const keys = Array.from(new Set(photoKeys.filter(Boolean)));
  const actions = new Map<string, AdminPhotoDetail['latestAction']>();
  const visibility = new Map<string, PublicPhotoVisibility>();

  if (!keys.length) return { actions, visibility };

  const [actionsResult, visibilityResult] = await Promise.all([
    supabase
      .from('admin_moderation_actions')
      .select('target_id, action, reason, note, status, reviewed_by, reviewed_at')
      .eq('target_type', 'photo')
      .in('target_id', keys)
      .order('reviewed_at', { ascending: false }),
    supabase
      .from('content_visibility')
      .select('content_id, visibility')
      .in('content_id', keys),
  ]);

  for (const row of ((visibilityResult.data as VisibilityRow[] | null) ?? [])) {
    visibility.set(row.content_id, row.visibility);
  }

  for (const row of ((actionsResult.data as ModerationActionRow[] | null) ?? [])) {
    if (actions.has(row.target_id)) continue;
    actions.set(row.target_id, {
      action: row.action,
      note: row.note,
      reason: row.reason,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      status: row.status,
    });
  }

  return { actions, visibility };
}

function applyModerationState(
  photo: AdminPublicPhotoItem,
  states: Awaited<ReturnType<typeof loadModerationStates>>,
): AdminPublicPhotoItem {
  const latestAction = states.actions.get(photo.id);
  const visibility = states.visibility.get(photo.id) ?? photo.visibility;
  const moderationStatus = latestAction?.status ?? (visibility === 'hidden' ? 'hidden' : 'visible');

  return {
    ...photo,
    latestActionAt: latestAction?.reviewedAt ?? null,
    moderationStatus,
    visibility,
  };
}

async function requireAdmin(): Promise<ServiceResult<void>> {
  if (!(await isCurrentUserAdmin())) {
    return { data: null, error: 'Barangay admin access is required.' };
  }

  return { data: undefined, error: null };
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
  return Math.max(1, Math.min(220, Math.floor(value)));
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

function getStoragePathFromPublicUrl(imageUrl: string) {
  const marker = '/storage/v1/object/public/';
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex < 0) return null;

  const pathStart = markerIndex + marker.length;
  const path = imageUrl.slice(pathStart).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

export function getPhotoDebugHash(imageUrl: string) {
  return hashPhotoUrl(imageUrl);
}
