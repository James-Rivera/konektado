import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PresenceDot } from '@/components/PresenceDot';
import { color, radius, typography } from '@/constants/theme';

export type WorkerCardProps = {
  name: string;
  statusLine: string;
  rateLine: string;
  headline: string;
  tags: string[];
  ratingText: string;
  jobsDoneText: string;
  location: string;
  imageUrl?: string;
  isActive?: boolean;
  onPress?: () => void;
  onViewProfile?: () => void;
  onSave?: () => void;
};

export function WorkerCard({
  name,
  statusLine,
  rateLine,
  headline,
  tags,
  ratingText,
  jobsDoneText,
  location,
  imageUrl,
  isActive = true,
  onPress,
  onViewProfile,
  onSave,
}: WorkerCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${name} worker profile`}
      accessibilityRole="button"
      onPress={onPress ?? onViewProfile}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topBlock}>
        <View style={styles.headerRow}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
              <PresenceDot active={isActive} size={10} style={styles.statusDot} />
            </View>
            <View style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.name}>
                {name}
              </Text>
              <Text numberOfLines={1} style={styles.statusLine}>
                {statusLine}
              </Text>
            </View>
          </View>
          <IconButton icon="bookmark-border" label="Save worker" onPress={onSave} />
        </View>
        <Text numberOfLines={1} style={styles.rateLine}>
          {rateLine}
        </Text>
        <Text numberOfLines={3} style={styles.headline}>
          {headline}
        </Text>
      </View>

      {imageUrl ? <WorkerPhoto imageUrl={imageUrl} /> : null}

      <View style={styles.tagRow}>
        <View style={styles.tagClip}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text numberOfLines={1} style={styles.tagText}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
        <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
      </View>

      <View style={styles.metaRow}>
        <Meta icon="star-border" text={ratingText} />
        <Meta icon="check-circle" text={jobsDoneText} />
        <Meta icon="location-on" text={location} />
      </View>
    </Pressable>
  );
}

function WorkerPhoto({ imageUrl }: { imageUrl: string }) {
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

function Meta({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <MaterialIcons
        color={icon === 'star-border' ? color.brandYellow : color.textSubtle}
        name={icon}
        size={icon === 'location-on' ? 14 : 16}
      />
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
      <MaterialIcons color={color.textSubtle} name={icon} size={30} />
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
    gap: 18,
    padding: 16,
  },
  pressed: {
    opacity: 0.78,
  },
  topBlock: {
    gap: 12,
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
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  statusDot: {
    bottom: 1,
    right: 1,
  },
  titleWrap: {
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: color.text,
    ...typography.bodyMedium,
    fontFamily: 'Satoshi-Bold',
  },
  statusLine: {
    ...typography.caption,
    color: color.textMuted,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 34,
  },
  rateLine: {
    ...typography.caption,
    color: color.textMuted,
  },
  headline: {
    color: color.text,
    ...typography.bodyMedium,
  },
  photo: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 238,
    width: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    justifyContent: 'center',
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
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 18,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    maxWidth: 136,
  },
  metaText: {
    ...typography.caption,
    color: color.textSubtle,
  },
});
