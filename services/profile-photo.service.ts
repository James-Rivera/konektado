import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import {
  normalizePublicImageFileName,
  optimizePublicImageForUpload,
  readPublicImageUploadBody,
} from '@/utils/image-processing';
import { supabase } from '@/utils/supabase';

const PROFILE_PHOTO_BUCKET = 'profile-photos';

export type ProfilePhotoAsset = {
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

export async function uploadProfilePhoto(
  asset: ProfilePhotoAsset,
): Promise<ServiceResult<string>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  try {
    const optimizedAsset = await optimizePublicImageForUpload(asset, 'avatar');
    if (!optimizedAsset.optimized) {
      return { data: null, error: 'Image optimization failed. Try a smaller JPG, PNG, or WebP photo.' };
    }
    const uploadBody = await readPublicImageUploadBody(optimizedAsset);
    const path = `${user.data}/avatar-${Date.now()}-${normalizeFileName(optimizedAsset.name, 'profile-photo')}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, uploadBody.body, {
        contentType: uploadBody.contentType,
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: `Storage upload failed. ${uploadError.message}` };
    }

    const { data } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.data);

    if (profileError) {
      await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
      return { data: null, error: `Profile photo save failed. ${profileError.message}` };
    }

    return { data: avatarUrl, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : null;
    return { data: null, error: message || `Could not upload ${asset.name || 'profile photo'}.` };
  }
}
