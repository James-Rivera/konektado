import { supabase } from '@/utils/supabase';

export type PublicPhotoSourceType = 'profile_photo' | 'job_photo' | 'service_photo';
export type PublicPhotoVisibility = 'visible' | 'hidden';

export type PublicContentVisibilityRow = {
  content_id: string;
  content_type: PublicPhotoSourceType;
  image_url: string | null;
  owner_id: string | null;
  source_id: string | null;
  visibility: PublicPhotoVisibility;
};

export function compactPhotoUrl(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function hashPhotoUrl(imageUrl: string) {
  const value = compactPhotoUrl(imageUrl);
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function getPublicPhotoKey({
  imageUrl,
  sourceId,
  sourceType,
}: {
  imageUrl: string;
  sourceId: string;
  sourceType: PublicPhotoSourceType;
}) {
  return `${sourceType}:${sourceId}:${hashPhotoUrl(imageUrl)}`;
}

export async function loadPublicPhotoVisibility(
  photoKeys: string[],
): Promise<Map<string, PublicContentVisibilityRow>> {
  const keys = Array.from(new Set(photoKeys.map(compactPhotoUrl).filter(Boolean)));
  const visibility = new Map<string, PublicContentVisibilityRow>();

  if (!keys.length) return visibility;

  const { data } = await supabase
    .from('public_content_visibility')
    .select('content_type, content_id, source_id, owner_id, image_url, visibility')
    .in('content_id', keys);

  for (const row of ((data as PublicContentVisibilityRow[] | null) ?? [])) {
    visibility.set(row.content_id, row);
  }

  return visibility;
}

export async function filterVisiblePhotoUrls({
  photoUrls,
  sourceId,
  sourceType,
}: {
  photoUrls: string[] | null | undefined;
  sourceId: string;
  sourceType: PublicPhotoSourceType;
}) {
  const cleanUrls = Array.from(new Set((photoUrls ?? []).map(compactPhotoUrl).filter(Boolean)));
  if (!cleanUrls.length) return [];

  const keys = cleanUrls.map((imageUrl) =>
    getPublicPhotoKey({
      imageUrl,
      sourceId,
      sourceType,
    }),
  );
  const visibility = await loadPublicPhotoVisibility(keys);

  return cleanUrls.filter((imageUrl) => {
    const key = getPublicPhotoKey({ imageUrl, sourceId, sourceType });
    return visibility.get(key)?.visibility !== 'hidden';
  });
}

export async function getVisibleProfileAvatarUrl({
  avatarUrl,
  profileId,
}: {
  avatarUrl: string | null | undefined;
  profileId: string;
}) {
  const imageUrl = compactPhotoUrl(avatarUrl);
  if (!imageUrl) return null;

  const photoKey = getPublicPhotoKey({
    imageUrl,
    sourceId: profileId,
    sourceType: 'profile_photo',
  });
  const visibility = await loadPublicPhotoVisibility([photoKey]);

  return visibility.get(photoKey)?.visibility === 'hidden' ? null : imageUrl;
}

export async function applyPublicPhotoVisibilityToProfiles<
  T extends { avatarUrl: string | null; id: string },
>(profiles: Map<string, T>) {
  const entries = Array.from(profiles.entries()).filter(([, profile]) => compactPhotoUrl(profile.avatarUrl));
  if (!entries.length) return profiles;

  const photoKeys = entries.map(([, profile]) =>
    getPublicPhotoKey({
      imageUrl: profile.avatarUrl ?? '',
      sourceId: profile.id,
      sourceType: 'profile_photo',
    }),
  );
  const visibility = await loadPublicPhotoVisibility(photoKeys);
  const nextProfiles = new Map(profiles);

  for (const [id, profile] of entries) {
    const photoKey = getPublicPhotoKey({
      imageUrl: profile.avatarUrl ?? '',
      sourceId: profile.id,
      sourceType: 'profile_photo',
    });

    if (visibility.get(photoKey)?.visibility === 'hidden') {
      nextProfiles.set(id, { ...profile, avatarUrl: null });
    }
  }

  return nextProfiles;
}

export async function applyPublicPhotoVisibilityToRows<
  T extends { id: string; photo_urls?: string[] | null },
>(rows: T[], sourceType: Exclude<PublicPhotoSourceType, 'profile_photo'>): Promise<T[]> {
  const photoKeys = rows.flatMap((row) =>
    (row.photo_urls ?? [])
      .map(compactPhotoUrl)
      .filter(Boolean)
      .map((imageUrl) => getPublicPhotoKey({ imageUrl, sourceId: row.id, sourceType })),
  );
  const visibility = await loadPublicPhotoVisibility(photoKeys);

  return rows.map((row) => ({
    ...row,
    photo_urls: (row.photo_urls ?? []).filter((imageUrl) => {
      const cleanUrl = compactPhotoUrl(imageUrl);
      if (!cleanUrl) return false;
      const photoKey = getPublicPhotoKey({ imageUrl: cleanUrl, sourceId: row.id, sourceType });
      return visibility.get(photoKey)?.visibility !== 'hidden';
    }),
  }));
}
