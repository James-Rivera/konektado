// Marketplace photos uploaded with a feed-card copy are stored as
// `<name>.full.jpg` beside `<name>.card.jpg` (DEC-138). Older photos have no
// marker and no card copy, so they keep loading the full photo.
const FULL_IMAGE_SUFFIX = '.full.jpg';
const CARD_IMAGE_SUFFIX = '.card.jpg';

/**
 * Storage file names for a marketplace photo and its feed-card copy.
 * `baseName` is a normalized `.jpg` name from `normalizePublicImageFileName`.
 */
export function getMarketplacePhotoFileNames(baseName: string) {
  const stem = baseName.replace(/\.jpg$/i, '');
  return { card: `${stem}${CARD_IMAGE_SUFFIX}`, full: `${stem}${FULL_IMAGE_SUFFIX}` };
}

/**
 * The card copy's URL or storage path for a marketplace photo, or null when
 * the photo was uploaded without one.
 */
export function getCardCopyLocation(fullUrlOrPath: string) {
  const [path, query] = fullUrlOrPath.split('?');
  if (!path?.endsWith(FULL_IMAGE_SUFFIX)) return null;

  const cardPath = `${path.slice(0, -FULL_IMAGE_SUFFIX.length)}${CARD_IMAGE_SUFFIX}`;
  return query ? `${cardPath}?${query}` : cardPath;
}
