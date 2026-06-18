import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { PresenceDot } from '@/components/PresenceDot';
import { Skeleton, SkeletonAvatar, SkeletonChip } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';
import type { SearchWorkerItem } from '@/constants/search-demo-data';

export function SearchWorkerResultCard({
  worker,
  onMore,
  onOpenWorker,
  onSave,
  isSaved = false,
  savePending = false,
  isLoading = false,
  showSaveAction,
  loadingLocationInline = true,
}: {
  worker?: SearchWorkerItem;
  onMore?: () => void;
  onOpenWorker?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  savePending?: boolean;
  isLoading?: boolean;
  showSaveAction?: boolean;
  loadingLocationInline?: boolean;
}) {
  if (isLoading) {
    const showLoadingSave = showSaveAction ?? Boolean(onSave);

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.identityRow}>
            <SkeletonAvatar dotSize={10} size={44} />
            <View style={styles.identityCopy}>
              <Skeleton height={16} width="56%" />
              <Skeleton height={12} width="76%" />
            </View>
          </View>

          <View style={styles.iconRow}>
            <Skeleton height={20} width={20} borderRadius={10} />
            {showLoadingSave ? <Skeleton height={20} width={20} borderRadius={10} /> : null}
          </View>
        </View>

        <Skeleton height={16} width="88%" />
        <Skeleton height={12} width="46%" />

        <View style={styles.metaBlock}>
          <View style={[styles.metaRow, loadingLocationInline && styles.metaRowInline]}>
            <View style={[styles.metaItem, loadingLocationInline && styles.metaItemCompact]}>
              <Skeleton height={12} width={72} />
            </View>
            <View style={[styles.metaItem, loadingLocationInline && styles.metaItemCompact]}>
              <Skeleton height={12} width={82} />
            </View>
            {loadingLocationInline ? (
              <View style={[styles.metaItem, styles.metaItemCompact, styles.metaItemLocation]}>
                <Skeleton height={12} width="100%" />
              </View>
            ) : null}
          </View>
          {!loadingLocationInline ? (
            <View style={[styles.metaItem, styles.metaItemFull]}>
              <Skeleton height={12} width="54%" />
            </View>
          ) : null}
        </View>

        <Skeleton height={12} width="70%" />

        <View style={styles.tagRow}>
          <View style={styles.tagClip}>
            <SkeletonChip height={27} width={76} />
            <SkeletonChip height={27} width={90} />
            <SkeletonChip height={27} width={68} />
          </View>
          <Skeleton height={20} width={20} borderRadius={10} />
        </View>

        <SkeletonChip height={34} style={styles.loadingButton} width="100%" />
      </View>
    );
  }

  if (!worker || !onOpenWorker) return null;

  const showLocationInline = canShowLocationInline(worker.ratingText, worker.jobsDoneText, worker.location);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          <Avatar imageUrl={worker.avatarUrl} isActive={worker.isActive ?? true} name={worker.name} />
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.name}>
              {worker.name}
            </Text>
            <Text numberOfLines={1} style={styles.statusLine}>
              {worker.statusLine}
            </Text>
          </View>
        </View>

        <View style={styles.iconRow}>
          {onMore ? <IconButton label="More options" name="more-horiz" onPress={onMore} /> : null}
          {onSave ? (
            <IconButton
              disabled={savePending}
              label={isSaved ? 'Remove saved service' : 'Save service'}
              name={isSaved ? 'bookmark' : 'bookmark-border'}
              onPress={onSave}
            />
          ) : null}
        </View>
      </View>

      <Text style={styles.headline}>{worker.headline}</Text>
      <Text style={styles.rateLine}>{worker.rateLine}</Text>

      <View style={styles.metaBlock}>
        <View style={[styles.metaRow, showLocationInline && styles.metaRowInline]}>
          <MetaItem compact={showLocationInline} icon="star-border" text={worker.ratingText} tint="yellow" />
          <MetaItem compact={showLocationInline} icon="check-circle" text={worker.jobsDoneText} />
          {showLocationInline ? (
            <MetaItem compact icon="location-on" text={worker.location} variant="location" />
          ) : null}
        </View>
        {showLocationInline ? null : <MetaItem fullWidth icon="location-on" text={worker.location} />}
      </View>

      <Text style={styles.matchReason}>{worker.matchReason}</Text>

      <View style={styles.tagRow}>
        <View style={styles.tagClip}>
          {worker.tags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text numberOfLines={1} style={styles.tagText}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
        <MaterialIcons color={color.textMuted} name="chevron-right" size={20} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onOpenWorker}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.primary} name="visibility" size={16} />
        <Text style={styles.primaryButtonText}>View service</Text>
      </Pressable>
    </View>
  );
}

function Avatar({
  imageUrl,
  isActive,
  name,
}: {
  imageUrl?: string | null;
  isActive: boolean;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <View style={styles.avatar}>
      {imageUrl && !failed ? (
        <CachedRemoteImage
          onError={() => setFailed(true)}
          uri={imageUrl}
          style={styles.avatarImage}
        />
      ) : (
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      )}
      <PresenceDot active={isActive} size={10} style={styles.statusDot} />
    </View>
  );
}

function MetaItem({
  icon,
  text,
  compact = false,
  fullWidth = false,
  tint = 'default',
  variant = 'default',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  compact?: boolean;
  fullWidth?: boolean;
  tint?: 'default' | 'yellow';
  variant?: 'default' | 'location';
}) {
  return (
    <View
      style={[
        styles.metaItem,
        compact && styles.metaItemCompact,
        variant === 'location' && styles.metaItemLocation,
        fullWidth && styles.metaItemFull,
      ]}>
      <MaterialIcons color={tint === 'yellow' ? color.brandYellow : color.textMuted} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

function canShowLocationInline(firstMeta: string, secondMeta: string, location: string) {
  return firstMeta.length + secondMeta.length + location.length <= 36;
}

function IconButton({
  disabled,
  label,
  name,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  name: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        disabled && styles.iconButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <MaterialIcons
        color={name === 'bookmark' ? color.primary : color.textMuted}
        name={name}
        size={name === 'more-horiz' ? 18 : 20}
      />
    </Pressable>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  identityRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  avatarImage: {
    borderRadius: radius.pill,
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  statusDot: {
    bottom: 0,
    right: 0,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  statusLine: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  iconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  iconButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 18,
  },
  iconButtonDisabled: {
    opacity: 0.55,
  },
  metaBlock: {
    gap: 5,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 5,
  },
  metaRowInline: {
    flexWrap: 'nowrap',
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 4,
    maxWidth: '48%',
    minWidth: 0,
  },
  metaItemCompact: {
    maxWidth: '31%',
  },
  metaItemLocation: {
    flex: 1,
    maxWidth: '38%',
  },
  metaItemFull: {
    maxWidth: '100%',
    width: '100%',
  },
  metaText: {
    ...typography.caption,
    color: color.textMuted,
    flexShrink: 1,
    minWidth: 0,
  },
  rateLine: {
    ...typography.caption,
    color: color.textMuted,
  },
  headline: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 20,
  },
  matchReason: {
    ...typography.caption,
    color: color.textMuted,
    fontFamily: 'Satoshi-Italic',
  },
  tagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 31,
  },
  tagClip: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  tagPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: 13,
    height: 27,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  tagText: {
    color: '#42474C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  loadingButton: {
    borderRadius: radius.pill,
  },
  primaryButtonText: {
    ...typography.button,
    color: color.primary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'none',
  },
  pressed: {
    opacity: 0.75,
  },
});
