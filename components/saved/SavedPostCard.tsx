import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';
import {
  formatJobBudget,
  formatServiceRate,
  getMarketplaceLocation,
} from '@/services/marketplace.helpers';
import type { SavedPost } from '@/services/saved-posts.service';

export function SavedPostCard({
  post,
  removing = false,
  onOpen,
  onRemove,
}: {
  post: SavedPost;
  removing?: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const available = Boolean(post.job || post.service);
  const title = post.job?.title ?? post.service?.title ?? 'Post unavailable';
  const owner = post.job?.client?.fullName ?? post.service?.provider?.fullName ?? 'Konektado resident';
  const location = post.job
    ? getMarketplaceLocation(post.job)
    : post.service
      ? getMarketplaceLocation(post.service)
      : 'This post may have been removed or is no longer visible.';
  const rate = post.job
    ? formatJobBudget(post.job)
    : post.service
      ? formatServiceRate(post.service)
      : null;

  return (
    <Pressable
      accessibilityRole={available ? 'button' : undefined}
      disabled={!available}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        !available && styles.unavailableCard,
        pressed && available && styles.pressed,
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{post.postType === 'job' ? 'Job' : 'Service'}</Text>
          </View>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Remove saved post"
          accessibilityRole="button"
          disabled={removing}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.primary} name="bookmark" size={22} />
        </Pressable>
      </View>

      {available ? (
        <>
          <Text numberOfLines={1} style={styles.owner}>{owner}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons color={color.textSubtle} name="location-on" size={16} />
            <Text numberOfLines={2} style={styles.metaText}>{location}</Text>
          </View>
          {rate ? (
            <View style={styles.metaRow}>
              <MaterialIcons color={color.textSubtle} name="payments" size={16} />
              <Text numberOfLines={1} style={styles.metaText}>{rate}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.unavailableText}>{location}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  unavailableCard: {
    backgroundColor: color.surfaceAlt,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  copy: {
    flex: 1,
    gap: space.sm,
    minWidth: 0,
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  typeText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  title: {
    ...typography.sectionTitle,
    color: color.text,
  },
  saveButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  owner: {
    ...typography.bodyMedium,
    color: color.text,
  },
  metaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  metaText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  unavailableText: {
    ...typography.body,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
