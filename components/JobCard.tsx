import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, typography } from '@/constants/theme';

export type JobCardProps = {
  postedAt: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  clientRatingText: string;
  jobsPostedText: string;
  location: string;
  imageUrl?: string;
  showActionRow?: boolean;
  onPress?: () => void;
  onViewJob?: () => void;
  onSave?: () => void;
  onMessage?: () => void;
};

export function JobCard({
  postedAt,
  title,
  subtitle,
  description,
  tags,
  clientRatingText,
  jobsPostedText,
  location,
  imageUrl,
  showActionRow = false,
  onPress,
  onViewJob,
  onSave,
  onMessage,
}: JobCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${title} job post`}
      accessibilityRole="button"
      onPress={onPress ?? onViewJob}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topBlock}>
        <Text style={styles.postedAt}>{postedAt}</Text>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <IconButton icon="bookmark-border" label="Save job" onPress={onSave} />
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      {imageUrl ? (
        <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.photo} />
      ) : null}

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
        {!showActionRow ? (
          <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} />
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Meta icon="star-border" text={clientRatingText} />
        <Meta icon="work" text={jobsPostedText} />
        <Meta icon="location-on" text={location} />
      </View>

      {showActionRow ? (
        <>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>One-time job</Text>
            <Text style={styles.viewJobText}>View Job</Text>
          </View>
          <View style={styles.actionRow}>
            <ActionPill icon="visibility" label="View Job" onPress={onViewJob} primary />
            <ActionPill icon="bookmark-border" label="Save" onPress={onSave} />
            <ActionPill icon="chat-bubble" label="Message" onPress={onMessage} />
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <MaterialIcons
        color={icon === 'star-border' ? color.brandYellow : color.textSubtle}
        name={icon}
        size={16}
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

function ActionPill({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.actionPill,
        primary ? styles.actionPillPrimary : styles.actionPillSecondary,
        pressed && styles.pressed,
      ]}>
      <MaterialIcons color={primary ? color.primary : color.textSubtle} name={icon} size={18} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
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
    gap: 2,
  },
  postedAt: {
    ...typography.tiny,
    color: color.text,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  subtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 34,
  },
  description: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  photo: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 238,
    width: '100%',
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
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  footerLabel: {
    ...typography.caption,
    color: color.textSubtle,
  },
  viewJobText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    height: 34,
  },
  actionPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  actionPillPrimary: {
    backgroundColor: color.primarySoft,
  },
  actionPillSecondary: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderWidth: 1,
  },
  actionText: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  actionTextPrimary: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
});
