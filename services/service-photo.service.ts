import { File } from 'expo-file-system';

import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import { supabase } from '@/utils/supabase';

const SERVICE_PHOTO_BUCKET = 'service-photos';

export type ServicePhotoAsset = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function normalizeFileName(value: string, fallback: string) {
  const trimmed = compactText(value) || fallback;
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90);
}

export async function uploadServicePhotos({
  assets,
  folderId,
}: {
  assets: ServicePhotoAsset[];
  folderId: string;
}): Promise<ServiceResult<string[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const uploads: string[] = [];
  const safeFolderId = normalizeFileName(folderId, 'service-draft');

  for (const [index, asset] of assets.entries()) {
    try {
      const localFile = new File(asset.uri);
      const fileBuffer = await localFile.arrayBuffer();
      const path = `${user.data}/${safeFolderId}/${Date.now()}-${index}-${normalizeFileName(
        asset.name ?? '',
        `photo-${index + 1}`,
      )}`;

      const { error: uploadError } = await supabase.storage.from(SERVICE_PHOTO_BUCKET).upload(path, fileBuffer, {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: false,
      });

      if (uploadError) {
        return { data: null, error: uploadError.message };
      }

      const { data } = supabase.storage.from(SERVICE_PHOTO_BUCKET).getPublicUrl(path);
      uploads.push(data.publicUrl);
    } catch {
      return { data: null, error: `Could not upload ${asset.name || 'photo'}.` };
    }
  }

  return { data: uploads, error: null };
}
