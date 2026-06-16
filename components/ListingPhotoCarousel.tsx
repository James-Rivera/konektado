import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { color, radius, space, typography } from '@/constants/theme';

type ListingPhotoCarouselProps = {
  accessibilityLabel?: string;
  borderRadius?: number;
  emptyLabel?: string;
  height?: number;
  photoUrls: (string | null | undefined)[];
  showEmptyState?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ListingPhotoCarousel({
  accessibilityLabel = 'Listing photos',
  borderRadius = radius.lg,
  emptyLabel = 'No photos added yet',
  height = 220,
  photoUrls,
  showEmptyState = false,
  style,
}: ListingPhotoCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const cleanedUrls = useMemo(
    () =>
      Array.from(
        new Set(
          photoUrls
            .map((url) => url?.trim())
            .filter((url): url is string => Boolean(url)),
        ),
      ),
    [photoUrls],
  );
  const slideWidth = containerWidth || Math.max(1, windowWidth - space.lg * 2);

  if (!cleanedUrls.length) {
    if (!showEmptyState) return null;

    return (
      <View
        accessibilityLabel={emptyLabel}
        style={[
          styles.frame,
          styles.emptyFrame,
          { borderRadius, height },
          style,
        ]}>
        <MaterialIcons color={color.textSubtle} name="image-not-supported" size={24} />
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.max(0, Math.min(cleanedUrls.length - 1, nextIndex)));
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={[styles.frame, { borderRadius, height }, style]}>
      <ScrollView
        horizontal
        onMomentumScrollEnd={handleScrollEnd}
        pagingEnabled
        scrollEnabled={cleanedUrls.length > 1}
        showsHorizontalScrollIndicator={false}>
        {cleanedUrls.map((url, index) => (
          <View key={`${url}-${index}`} style={[styles.slide, { width: slideWidth }]}>
            {failedUrls.has(url) ? (
              <PhotoFallback />
            ) : (
              <CachedRemoteImage
                accessibilityLabel={`${accessibilityLabel} ${index + 1}`}
                onError={() =>
                  setFailedUrls((current) => {
                    const next = new Set(current);
                    next.add(url);
                    return next;
                  })
                }
                uri={url}
                style={styles.image}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {cleanedUrls.length > 1 ? (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {activeIndex + 1} / {cleanedUrls.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function PhotoFallback() {
  return (
    <View style={styles.fallback}>
      <MaterialIcons color={color.textSubtle} name="image-not-supported" size={24} />
      <Text style={styles.emptyText}>Photo unavailable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: color.cardTint,
    overflow: 'hidden',
    width: '100%',
  },
  emptyFrame: {
    alignItems: 'center',
    borderColor: color.border,
    borderWidth: 1,
    gap: space.xs,
    justifyContent: 'center',
  },
  slide: {
    backgroundColor: color.cardTint,
    height: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    gap: space.xs,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  emptyText: {
    ...typography.caption,
    color: color.textSubtle,
  },
  indicator: {
    backgroundColor: 'rgba(17, 17, 17, 0.72)',
    borderRadius: radius.pill,
    bottom: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space['2xs'],
    position: 'absolute',
    right: space.sm,
  },
  indicatorText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
  },
});
