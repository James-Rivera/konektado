import { Image, type ImageProps } from 'expo-image';

type CachedRemoteImageProps = {
  accessibilityLabel?: string;
  contentFit?: ImageProps['contentFit'];
  onError?: ImageProps['onError'];
  style: ImageProps['style'];
  transition?: ImageProps['transition'];
  uri: string;
};

export function CachedRemoteImage({
  accessibilityLabel,
  contentFit = 'cover',
  onError,
  style,
  transition = 140,
  uri,
}: CachedRemoteImageProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      cachePolicy="disk"
      contentFit={contentFit}
      onError={onError}
      recyclingKey={uri}
      source={{ uri }}
      style={style}
      transition={transition}
    />
  );
}
