import type { ServiceResult } from '@/services/auth.service';
import { uploadMarketplacePhoto } from '@/services/marketplace-photo-upload.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import { normalizePublicImageFileName, optimizePublicImageForUpload } from '@/utils/image-processing';

const JOB_PHOTO_BUCKET = 'job-photos';

export type JobPhotoAsset = {
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

export async function uploadJobPhotos({
  assets,
  folderId,
}: {
  assets: JobPhotoAsset[];
  folderId: string;
}): Promise<ServiceResult<string[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const uploads: string[] = [];
  const safeFolderId = normalizeFileName(folderId, 'draft');

  for (const [index, asset] of assets.entries()) {
    try {
      const optimizedAsset = await optimizePublicImageForUpload(asset, 'marketplace-photo');
      if (!optimizedAsset.optimized) {
        return { data: null, error: 'Image optimization failed. Try a smaller JPG, PNG, or WebP photo.' };
      }
      const upload = await uploadMarketplacePhoto({
        bucket: JOB_PHOTO_BUCKET,
        folderPath: `${user.data}/${safeFolderId}`,
        photo: {
          ...optimizedAsset,
          name: `${Date.now()}-${index}-${normalizeFileName(optimizedAsset.name, `photo-${index + 1}`)}`,
        },
      });

      if (upload.error || !upload.data) {
        return { data: null, error: upload.error ?? 'Storage upload failed.' };
      }

      uploads.push(upload.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      return { data: null, error: message || `Could not upload ${asset.name || 'photo'}.` };
    }
  }

  return { data: uploads, error: null };
}
