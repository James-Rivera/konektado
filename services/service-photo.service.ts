import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import {
  normalizePublicImageFileName,
  optimizePublicImageForUpload,
  readPublicImageUploadBody,
} from '@/utils/image-processing';
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
  return normalizePublicImageFileName(compactText(value), fallback);
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
      const optimizedAsset = await optimizePublicImageForUpload(asset, 'marketplace-photo');
      if (!optimizedAsset.optimized) {
        return { data: null, error: 'Image optimization failed. Try a smaller JPG, PNG, or WebP photo.' };
      }
      const uploadBody = await readPublicImageUploadBody(optimizedAsset);
      const path = `${user.data}/${safeFolderId}/${Date.now()}-${index}-${normalizeFileName(
        optimizedAsset.name,
        `photo-${index + 1}`,
      )}`;

      const { error: uploadError } = await supabase.storage.from(SERVICE_PHOTO_BUCKET).upload(path, uploadBody.body, {
        contentType: uploadBody.contentType,
        upsert: false,
      });

      if (uploadError) {
        return { data: null, error: `Storage upload failed. ${uploadError.message}` };
      }

      const { data } = supabase.storage.from(SERVICE_PHOTO_BUCKET).getPublicUrl(path);
      uploads.push(data.publicUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      return { data: null, error: message || `Could not upload ${asset.name || 'photo'}.` };
    }
  }

  return { data: uploads, error: null };
}
