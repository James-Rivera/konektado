import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton, SkeletonChip } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';
import type { SearchJobItem } from '@/constants/search-demo-data';

export function SearchJobResultCard({
  job,
  onOpenJob,
  onSave,
  isLoading = false,
  showSaveAction,
  loadingLocationInline = true,
}: {
  job?: SearchJobItem;
  onOpenJob?: () => void;
  onSave?: () => void;
  isLoading?: boolean;
  showSaveAction?: boolean;
  loadingLocationInline?: boolean;
}) {
  if (isLoading) {
    const showLoadingSave = showSaveAction ?? Boolean(onSave);

    return (
      <View style={styles.card}>
        <View style={styles.topBlock}>
          <Skeleton height={12} width="24%" />
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Skeleton height={16} width="72%" />
              <Skeleton height={12} width="58%" />
            </View>
            <View style={styles.iconRow}>
              <Skeleton height={20} width={20} borderRadius={10} />
              {showLoadingSave ? <Skeleton height={20} width={20} borderRadius={10} /> : null}
            </View>
          </View>
        </View>

        <View style={styles.metaBlock}>
          <View style={[styles.metaRow, loadingLocationInline && styles.metaRowInline]}>
            <View style={[styles.metaItem, loadingLocationInline && styles.metaItemCompact]}>
              <Skeleton height={12} width={72} />
            </View>
            <View style={[styles.metaItem, loadingLocationInline && styles.metaItemCompact]}>
              <Skeleton height={12} width={80} />
            </View>
            {loadingLocationInline ? (
              <View style={[styles.metaItem, styles.metaItemCompact, styles.metaItemLocation]}>
                <Skeleton height={12} width="100%" />
              </View>
            ) : null}
          </View>
          {!loadingLocationInline ? (
            <View style={[styles.metaItem, styles.metaItemFull]}>
              <Skeleton height={12} width="52%" />
            </View>
          ) : null}
        </View>

        <View style={styles.bodyBlock}>
          <Skeleton height={14} width="92%" />
          <Skeleton height={12} width="74%" />
        </View>

        <View style={styles.tagRow}>
          <SkeletonChip height={27} width={70} />
          <SkeletonChip height={27} width={84} />
          <SkeletonChip height={27} width={62} />
        </View>

        <SkeletonChip height={34} style={styles.loadingButton} width="100%" />
      </View>
    );
  }

  if (!job || !onOpenJob) return null;

  const showLocationInline = canShowLocationInline(job.clientRatingText, job.jobsPostedText, job.location);

  return (
    <View style={styles.card}>
      <View style={styles.topBlock}>
        <Text style={styles.postedAt}>{job.postedAt}</Text>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.subtitle}>{job.subtitle}</Text>
          </View>
          <View style={styles.iconRow}>
            <IconButton label="More options" name="more-horiz" onPress={() => Alert.alert('Options', 'More search actions are not connected in this demo.')} />
            {onSave ? <IconButton label="Save job" name="bookmark-border" onPress={onSave} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.metaBlock}>
        <View style={[styles.metaRow, showLocationInline && styles.metaRowInline]}>
          <MetaItem
            compact={showLocationInline}
            icon="star-border"
            text={job.clientRatingText}
            tint="yellow"
          />
          <MetaItem compact={showLocationInline} icon="work" text={job.jobsPostedText} />
          {showLocationInline ? (
            <MetaItem compact icon="location-on" text={job.location} variant="location" />
          ) : null}
        </View>
        {showLocationInline ? null : <MetaItem fullWidth icon="location-on" text={job.location} />}
      </View>

      <View style={styles.bodyBlock}>
        <Text style={styles.description}>{job.description}</Text>
        <Text style={styles.matchReason}>{job.matchReason}</Text>
      </View>

      <View style={styles.tagRow}>
        {job.tags.map((tag) => (
          <View key={tag} style={styles.tagPill}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onOpenJob}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <MaterialIcons color={color.primary} name="visibility" size={16} />
        <Text style={styles.primaryButtonText}>View Job</Text>
      </Pressable>
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
  label,
  name,
  onPress,
}: {
  label: string;
  name: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <MaterialIcons color={color.textMuted} name={name} size={name === 'more-horiz' ? 18 : 20} />
    </Pressable>
  );
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
  topBlock: {
    gap: 4,
  },
  postedAt: {
    color: color.text,
    fontFamily: 'Satoshi-Light',
    fontSize: 10,
    lineHeight: 20,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  subtitle: {
    ...typography.caption,
    color: color.textMuted,
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
  bodyBlock: {
    gap: 8,
  },
  description: {
    ...typography.body,
    color: color.text,
  },
  matchReason: {
    ...typography.caption,
    color: color.textMuted,
    fontFamily: 'Satoshi-Italic',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  },
  pressed: {
    opacity: 0.75,
  },
});
