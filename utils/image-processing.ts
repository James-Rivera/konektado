import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { Image, Platform } from 'react-native';

import { getCardCopyLocation } from '@/utils/photo-card-copy';

export { getCardCopyLocation, getMarketplacePhotoFileNames } from '@/utils/photo-card-copy';

const MB = 1024 * 1024;
const MAX_PUBLIC_SOURCE_IMAGE_BYTES = 25 * MB;
const PUBLIC_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

type PublicImagePurpose = 'avatar' | 'document-photo' | 'marketplace-photo';

type PublicImageAsset = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type OptimizedPublicImage = {
  height?: number;
  mimeType: string;
  name: string;
  optimized: boolean;
  size?: number;
  uri: string;
  width?: number;
};

export type PublicImageUploadBody = {
  body: ArrayBuffer;
  contentType: string;
};

const PUBLIC_IMAGE_CONFIG: Record<
  PublicImagePurpose,
  {
    compression: number;
    fileNameFallback: string;
    maxDimension: number;
  }
> = {
  avatar: {
    compression: 0.78,
    fileNameFallback: 'profile-photo',
    maxDimension: 640,
  },
  // ID and credential photos for barangay review: large enough that small
  // print stays readable, without uploading a 12 MP camera original.
  'document-photo': {
    compression: 0.85,
    fileNameFallback: 'document',
    maxDimension: 2000,
  },
  'marketplace-photo': {
    compression: 0.82,
    fileNameFallback: 'photo',
    maxDimension: 1400,
  },
};

// Feed cards are full-width and 222pt tall, so 800px wide is sharp at 3x
// density while costing a fraction of the 1400px detail photo.
const CARD_IMAGE_WIDTH = 800;
const CARD_IMAGE_COMPRESSION = 0.75;

function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function normalizePublicImageFileName(value: string | null | undefined, fallback: string) {
  const cleanName = compactText(value) || fallback;
  const nameWithoutExtension = cleanName.replace(/\.[a-zA-Z0-9]+$/, '');
  return `${nameWithoutExtension.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 82)}.jpg`;
}

function isSupportedPublicImageMime(mimeType: string | null | undefined) {
  if (!mimeType) return true;
  return /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(mimeType);
}

function getFileExtension(value: string | null | undefined) {
  const cleanValue = compactText(value).split('?')[0] ?? '';
  return cleanValue.includes('.') ? cleanValue.split('.').pop()?.toLowerCase() ?? '' : '';
}

function getLocalImageSize(uri: string) {
  return new Promise<{ height: number; width: number } | null>((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ height, width }),
      () => resolve(null),
    );
  });
}

function getResizeAction({
  height,
  maxDimension,
  width,
}: {
  height: number;
  maxDimension: number;
  width: number;
}): Action | null {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) return null;

  if (width >= height) {
    return { resize: { width: maxDimension } };
  }

  return { resize: { height: maxDimension } };
}

function getFileSize(uri: string) {
  if (Platform.OS === 'web') return undefined;

  try {
    return new File(uri).size;
  } catch {
    return undefined;
  }
}

export async function readPublicImageUploadBody(
  asset: PublicImageAsset,
): Promise<PublicImageUploadBody> {
  const contentType = compactText(asset.mimeType) || 'image/jpeg';

  if (/^(blob:|data:|https?:\/\/)/i.test(asset.uri)) {
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error(`Could not read ${asset.name || 'image'}.`);
    }

    return {
      body: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') || contentType,
    };
  }

  const localFile = new File(asset.uri);
  return {
    body: await localFile.arrayBuffer(),
    contentType,
  };
}

export function getPublicImageValidationError(asset: PublicImageAsset) {
  if (!asset.uri) {
    return 'Choose an image file first.';
  }

  if (!isSupportedPublicImageMime(asset.mimeType)) {
    return 'Choose a JPEG, PNG, WebP, HEIC, or HEIF image.';
  }

  const extension = getFileExtension(asset.name ?? asset.uri);
  if (!asset.mimeType && extension && !PUBLIC_IMAGE_EXTENSIONS.has(extension)) {
    return 'Choose a JPEG, PNG, WebP, HEIC, or HEIF image.';
  }

  if (asset.size && asset.size > MAX_PUBLIC_SOURCE_IMAGE_BYTES) {
    return 'Choose a photo smaller than 25 MB.';
  }

  return null;
}

export async function optimizePublicImageForUpload(
  asset: PublicImageAsset,
  purpose: PublicImagePurpose,
): Promise<OptimizedPublicImage> {
  const config = PUBLIC_IMAGE_CONFIG[purpose];
  const fallbackName = normalizePublicImageFileName(asset.name, config.fileNameFallback);
  const sourceSizeBytes = asset.size ?? getFileSize(asset.uri);
  const validationError = getPublicImageValidationError({ ...asset, size: sourceSizeBytes });

  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const sourceSize = await getLocalImageSize(asset.uri);
    const resizeAction = sourceSize ? getResizeAction({ ...sourceSize, maxDimension: config.maxDimension }) : null;
    const actions = resizeAction ? [resizeAction] : [];
    const result = await manipulateAsync(asset.uri, actions, {
      compress: config.compression,
      format: SaveFormat.JPEG,
    });

    return {
      height: result.height,
      mimeType: 'image/jpeg',
      name: fallbackName,
      optimized: true,
      size: getFileSize(result.uri),
      uri: result.uri,
      width: result.width,
    };
  } catch {
    return {
      mimeType: asset.mimeType ?? 'image/jpeg',
      name: fallbackName,
      optimized: false,
      size: sourceSizeBytes,
      uri: asset.uri,
    };
  }
}

export function getAvatarDisplayUrl({
  avatarUrl,
  thumbnailUrl,
}: {
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  return compactText(thumbnailUrl) || compactText(avatarUrl) || null;
}

/**
 * Upload body for a verification or credential file. Photos are resized to the
 * `document-photo` preset and re-encoded as JPEG; PDFs and anything the
 * optimizer cannot handle are uploaded unchanged, so a failed resize never
 * blocks a submission. `name` gets a `.jpg` extension when the file was
 * re-encoded.
 */
export async function readDocumentUploadBody(asset: {
  uri: string;
  name: string;
  mimeType?: string | null;
}): Promise<PublicImageUploadBody & { name: string }> {
  if (isSupportedPublicImageMime(asset.mimeType) && asset.mimeType) {
    const optimized = await optimizePublicImageForUpload(asset, 'document-photo').catch(() => null);
    if (optimized?.optimized) {
      const body = await readPublicImageUploadBody(optimized);
      return { ...body, name: normalizePublicImageFileName(asset.name, 'document') };
    }
  }

  const body = await readPublicImageUploadBody({
    ...asset,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  });
  return { ...body, name: asset.name };
}

/**
 * A smaller copy of an already optimized marketplace photo for feed cards.
 * Returns null when it cannot be made, so callers can skip the card copy.
 */
export async function createCardImageForUpload(
  image: Pick<OptimizedPublicImage, 'uri' | 'width'>,
): Promise<PublicImageUploadBody | null> {
  try {
    const actions: Action[] =
      image.width && image.width > CARD_IMAGE_WIDTH ? [{ resize: { width: CARD_IMAGE_WIDTH } }] : [];
    const result = await manipulateAsync(image.uri, actions, {
      compress: CARD_IMAGE_COMPRESSION,
      format: SaveFormat.JPEG,
    });
    return await readPublicImageUploadBody({ uri: result.uri, mimeType: 'image/jpeg' });
  } catch {
    return null;
  }
}

export function getCardImageUrl({
  cardUrl,
  imageUrl,
  thumbnailUrl,
}: {
  cardUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  const fullImageUrl = compactText(imageUrl);
  return (
    compactText(thumbnailUrl) ||
    compactText(cardUrl) ||
    (fullImageUrl ? getCardCopyLocation(fullImageUrl) ?? fullImageUrl : '') ||
    undefined
  );
}

export function getDetailImageUrl({
  detailUrl,
  imageUrl,
  originalUrl,
}: {
  detailUrl?: string | null;
  imageUrl?: string | null;
  originalUrl?: string | null;
}) {
  return compactText(detailUrl) || compactText(originalUrl) || compactText(imageUrl) || null;
}
