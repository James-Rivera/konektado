import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { color, radius, space } from '@/constants/theme';

interface SkeletonProps {
  height?: number;
  width?: ViewStyle['width'];
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

/**
 * Skeleton component for loading states.
 *
 * A pulse/shimmer animated placeholder that matches the layout of content being loaded.
 * More performant and better UX than spinners.
 *
 * @example
 * ```tsx
 * // Single skeleton
 * <Skeleton height={16} width="80%" />
 *
 * // Complex layout
 * <View>
 *   <Skeleton height={44} width={44} borderRadius={22} />
 *   <Skeleton height={14} width="70%" style={{ marginTop: 8 }} />
 * </View>
 * ```
 */
export function Skeleton({ height = 16, width = '100%', borderRadius = radius.sm, style, animated = true }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!animated) return;

    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.6,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(animation);
    loop.start();

    return () => loop.stop();
  }, [animated, opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          height,
          width,
          borderRadius,
          opacity: animated ? opacity : 1,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for circular avatars or icons.
 */
export function SkeletonCircle({ size = 44, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton height={size} width={size} borderRadius={size / 2} style={style} />;
}

/**
 * Skeleton for text content.
 *
 * Renders multiple stacked lines that mimic paragraph text.
 */
export function SkeletonText({
  lines = 3,
  gap = space.sm,
  lineHeight = 14,
  lastLineWidth = '80%',
}: {
  lines?: number;
  gap?: number;
  lineHeight?: number;
  lastLineWidth?: ViewStyle['width'];
}) {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          style={{ marginBottom: index < lines - 1 ? gap : 0 }}
        />
      ))}
    </View>
  );
}

/**
 * Skeleton for card layouts.
 *
 * Shows a full card placeholder with header, avatar, and text lines.
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardContent}>
        <SkeletonCircle size={44} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Skeleton height={14} width="60%" style={{ marginBottom: space.sm }} />
          <Skeleton height={12} width="80%" />
        </View>
      </View>
      <Skeleton height={12} width="100%" style={{ marginTop: space.md }} />
      <Skeleton height={12} width="70%" style={{ marginTop: space.xs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: color.border,
  },
  card: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.md,
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
