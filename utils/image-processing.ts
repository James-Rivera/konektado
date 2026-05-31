import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { Image, Platform } from 'react-native';

const MB = 1024 * 1024;
const MAX_PUBLIC_SOURCE_IMAGE_BYTES = 25 * MB;
const PUBLIC_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

type PublicImagePurpose = 'avatar' | 'marketplace-photo';

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
  'marketplace-photo': {
    compression: 0.82,
    fileNameFallback: 'photo',
    maxDimension: 1400,
  },
};

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

export function getCardImageUrl({
  cardUrl,
  imageUrl,
  thumbnailUrl,
}: {
  cardUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  return compactText(thumbnailUrl) || compactText(cardUrl) || compactText(imageUrl) || undefined;
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
