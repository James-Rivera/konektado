import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PresenceDot } from '@/components/PresenceDot';
import { Skeleton, SkeletonAvatar, SkeletonChip, SkeletonImage } from '@/components/Skeleton';
import { color, radius, typography } from '@/constants/theme';

type FeedMetaItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
};

export type HomeFeedCardProps = {
  kind: 'job' | 'worker';
  name: string;
  label: string;
  postedAt: string;
  detailLine?: string;
  title: string;
  description: string;
  meta: FeedMetaItem[];
  tags: string[];
  primaryActionLabel: string;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  isOnline?: boolean;
  onPress?: () => void;
  onPrimaryAction?: () => void;
  onSave?: () => void;
  isLoading?: boolean;
  loadingImage?: boolean;
  loadingTagCount?: number;
  loadingMetaCount?: number;
  showSaveAction?: boolean;
};

export function HomeFeedCard({
  kind,
  name,
  label,
  postedAt,
  detailLine,
  title,
  description,
  meta,
  tags,
  primaryActionLabel,
  avatarUrl,
  imageUrl,
  isOnline = true,
  onPress,
  onPrimaryAction,
  onSave,
  isLoading = false,
  loadingImage = Boolean(imageUrl),
  loadingTagCount,
  loadingMetaCount,
  showSaveAction,
}: HomeFeedCardProps) {
  const visibleTags = tags.slice(0, 3);
  const overflowTagCount = Math.max(0, tags.length - visibleTags.length);
  const visibleLoadingTags = loadingTagCount ?? Math.max(1, Math.min(3, tags.length || 3));
  const visibleLoadingMeta = loadingMetaCount ?? Math.max(1, Math.min(3, meta.length || 3));

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.identityRow}>
            <SkeletonAvatar dotSize={11} size={44} />
            <View style={styles.identityCopy}>
              <Skeleton height={16} width="58%" />
              <View style={styles.contextRow}>
                <Skeleton height={12} width="38%" />
                <Skeleton height={6} width={6} borderRadius={3} />
                <Skeleton height={12} width="26%" />
              </View>
            </View>
          </View>
          {showSaveAction ?? Boolean(onSave) ? (
            <Skeleton height={28} width={28} borderRadius={14} />
          ) : null}
        </View>

        <View style={styles.bodyBlock}>
          <Skeleton height={12} width="54%" />
          <Skeleton height={kind === 'job' ? 18 : 16} width={kind === 'job' ? '88%' : '82%'} />
          <Skeleton height={38} width={kind === 'job' ? '94%' : '78%'} />
        </View>

        {loadingImage ? <SkeletonImage borderRadius={radius.lg} height={222} style={styles.photo} /> : null}

        {visibleLoadingTags > 0 ? (
          <View style={styles.tagRail}>
            <View style={styles.tagRow}>
              {Array.from({ length: visibleLoadingTags }).map((_, index) => (
                <SkeletonChip
                  height={27}
                  key={index}
                  width={index === 0 ? 76 : index === 1 ? 84 : 68}
                />
              ))}
            </View>
            <Skeleton height={20} width={20} borderRadius={10} />
          </View>
        ) : (
          <View style={styles.chevronOnly}>
            <Skeleton height={20} width={20} borderRadius={10} />
          </View>
        )}

        <View style={styles.metaRow}>
          {Array.from({ length: visibleLoadingMeta }).map((_, index) => (
            <View key={index} style={styles.metaItem}>
              <Skeleton height={12} width={index === 0 ? 76 : index === 1 ? 84 : 96} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={primaryActionLabel}
      accessibilityLabel={`${name} ${label}. ${title}`}
      accessibilityRole="button"
      onPress={onPress ?? onPrimaryAction}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          <Avatar imageUrl={avatarUrl} isOnline={isOnline} name={name} />
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <View style={styles.contextRow}>
              <Text numberOfLines={1} style={styles.contextText}>
                {label}
              </Text>
              <Text style={styles.contextDot}>-</Text>
              <Text numberOfLines={1} style={styles.contextText}>
                {postedAt}
              </Text>
            </View>
          </View>
        </View>
        {onSave ? (
          <IconButton
            icon="bookmark-border"
            label={kind === 'job' ? 'Save job' : 'Save service'}
            onPress={onSave}
          />
        ) : null}
      </View>

      <View style={styles.bodyBlock}>
        {detailLine ? (
          <Text numberOfLines={1} style={styles.detailLine}>
            {detailLine}
          </Text>
        ) : null}
        <PostTitle kind={kind} title={title} />
        {description ? (
          <Text numberOfLines={kind === 'job' ? 3 : 2} style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>

      {imageUrl ? <FeedPhoto imageUrl={imageUrl} /> : null}

      {tags.length ? (
        <View style={styles.tagRail}>
          <View style={styles.tagRow}>
            {visibleTags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text numberOfLines={1} style={styles.tagText}>
                  {tag}
                </Text>
              </View>
            ))}
            {overflowTagCount ? (
              <View style={styles.tagPill}>
                <Text numberOfLines={1} style={styles.tagText}>
                  +{overflowTagCount}
                </Text>
              </View>
            ) : null}
          </View>
          <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
        </View>
      ) : (
        <View style={styles.chevronOnly}>
          <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
        </View>
      )}

      <View style={styles.metaRow}>
        {meta.slice(0, 3).map((item) => (
          <Meta key={`${item.icon}-${item.text}`} icon={item.icon} text={item.text} />
        ))}
      </View>
    </Pressable>
  );
}

function PostTitle({ kind, title }: { kind: HomeFeedCardProps['kind']; title: string }) {
  const emphasis = kind === 'worker' ? 'I offer' : null;

  if (emphasis && title.toLowerCase().startsWith(emphasis.toLowerCase())) {
    const rest = title.slice(emphasis.length);

    return (
      <Text numberOfLines={3} style={styles.title}>
        <Text style={styles.titleStrong}>{emphasis}</Text>
        {rest}
      </Text>
    );
  }

  return (
    <Text numberOfLines={kind === 'job' ? 2 : 3} style={[styles.title, kind === 'job' && styles.jobTitle]}>
      {title}
    </Text>
  );
}

function Avatar({
  imageUrl,
  isOnline,
  name,
}: {
  imageUrl?: string | null;
  isOnline: boolean;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <View style={styles.avatar}>
      {imageUrl && !failed ? (
        <Image
          onError={() => setFailed(true)}
          resizeMode="cover"
          source={{ uri: imageUrl }}
          style={styles.avatarImage}
        />
      ) : (
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      )}
      <PresenceDot active={isOnline} size={11} style={styles.onlineDot} />
    </View>
  );
}

function FeedPhoto({ imageUrl }: { imageUrl: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (failed) {
    return (
      <View style={[styles.photo, styles.photoFallback]}>
        <MaterialIcons color={color.textSubtle} name="image-not-supported" size={24} />
      </View>
    );
  }

  return (
    <Image
      onError={() => setFailed(true)}
      resizeMode="cover"
      source={{ uri: imageUrl }}
      style={styles.photo}
    />
  );
}

function Meta({ icon, text }: FeedMetaItem) {
  const tint = icon === 'star-border' || icon === 'star' ? color.brandYellow : color.textSubtle;

  return (
    <View style={styles.metaItem}>
      <MaterialIcons color={tint} name={icon} size={icon === 'location-on' ? 14 : 16} />
      <Text numberOfLines={1} style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        onPress?.();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <MaterialIcons color={color.textMuted} name={icon} size={30} />
    </Pressable>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'K';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.background,
    gap: 18,
    padding: 16,
  },
  pressed: {
    opacity: 0.78,
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
    gap: 10,
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
  onlineDot: {
    bottom: 0,
    right: 0,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    ...typography.bodyMedium,
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  contextRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minWidth: 0,
  },
  contextText: {
    ...typography.caption,
    color: color.textMuted,
    flexShrink: 1,
  },
  contextDot: {
    ...typography.caption,
    color: color.textMuted,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 34,
  },
  bodyBlock: {
    gap: 8,
  },
  detailLine: {
    ...typography.caption,
    color: color.textMuted,
  },
  title: {
    ...typography.bodyMedium,
    color: color.text,
    fontSize: 16,
    lineHeight: 20,
  },
  titleStrong: {
    fontFamily: 'Satoshi-Bold',
  },
  jobTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  description: {
    ...typography.body,
    color: color.text,
  },
  photo: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 222,
    width: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    justifyContent: 'center',
  },
  tagRail: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 31,
  },
  tagRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
  },
  tagPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: 13,
    height: 27,
    justifyContent: 'center',
    maxWidth: 124,
    paddingHorizontal: 14,
  },
  tagText: {
    color: '#42474C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  chevronOnly: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    height: 20,
    justifyContent: 'center',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    minHeight: 18,
    rowGap: 6,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 4,
    maxWidth: 146,
    minWidth: 0,
  },
  metaText: {
    ...typography.caption,
    color: color.textSubtle,
    flexShrink: 1,
    minWidth: 0,
  },
});
