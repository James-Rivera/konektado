import type { ServiceResult } from '@/services/auth.service';
import {
  createCardImageForUpload,
  getMarketplacePhotoFileNames,
  readPublicImageUploadBody,
} from '@/utils/image-processing';
import { supabase } from '@/utils/supabase';

type OptimizedMarketplacePhoto = {
  mimeType: string;
  name: string;
  uri: string;
  width?: number;
};

/**
 * Uploads an optimized job/service photo plus an 800px feed-card copy
 * (DEC-138), and returns the full photo's public URL. Feed cards derive the
 * card URL from it with `getCardImageUrl`.
 *
 * When the card copy cannot be made, the photo is stored under its plain name,
 * which `getCardImageUrl` leaves alone, so cards never point at a missing file.
 */
export async function uploadMarketplacePhoto({
  bucket,
  folderPath,
  photo,
}: {
  bucket: string;
  folderPath: string;
  photo: OptimizedMarketplacePhoto;
}): Promise<ServiceResult<string>> {
  const [fullBody, cardBody] = await Promise.all([
    readPublicImageUploadBody(photo),
    createCardImageForUpload(photo),
  ]);
  const names = getMarketplacePhotoFileNames(photo.name);
  const fullPath = `${folderPath}/${cardBody ? names.full : photo.name}`;
  const cardPath = `${folderPath}/${names.card}`;
  const storage = supabase.storage.from(bucket);

  const [fullResult, cardResult] = await Promise.all([
    storage.upload(fullPath, fullBody.body, { contentType: fullBody.contentType, upsert: false }),
    cardBody
      ? storage.upload(cardPath, cardBody.body, { contentType: cardBody.contentType, upsert: false })
      : Promise.resolve({ error: null }),
  ]);

  const uploadError = fullResult.error ?? cardResult.error;
  if (uploadError) {
    // Do not leave half a pair behind: a lone `.full.jpg` would send cards to
    // a missing file, and a lone card copy is never referenced.
    const leftover = [fullResult.error ? null : fullPath, cardResult.error || !cardBody ? null : cardPath].filter(
      (path): path is string => Boolean(path),
    );
    if (leftover.length) await storage.remove(leftover);
    return { data: null, error: `Storage upload failed. ${uploadError.message}` };
  }

  return { data: storage.getPublicUrl(fullPath).data.publicUrl, error: null };
}
