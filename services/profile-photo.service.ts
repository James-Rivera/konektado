import { File } from 'expo-file-system';

import type { ServiceResult } from '@/services/auth.service';
import { getCurrentUserId } from '@/services/marketplace.helpers';
import { supabase } from '@/utils/supabase';

const PROFILE_PHOTO_BUCKET = 'profile-photos';

export type ProfilePhotoAsset = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
};

function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function normalizeFileName(value: string, fallback: string) {
  const trimmed = compactText(value) || fallback;
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90);
}

export async function uploadProfilePhoto(
  asset: ProfilePhotoAsset,
): Promise<ServiceResult<string>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  try {
    const localFile = new File(asset.uri);
    const fileBuffer = await localFile.arrayBuffer();
    const path = `${user.data}/avatar-${Date.now()}-${normalizeFileName(asset.name ?? '', 'profile-photo')}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, fileBuffer, {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.data);

    if (profileError) {
      await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
      return { data: null, error: profileError.message };
    }

    return { data: avatarUrl, error: null };
  } catch {
    return { data: null, error: `Could not upload ${asset.name || 'profile photo'}.` };
  }
}
