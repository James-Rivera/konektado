import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

export type JobCardProps = {
  title: string;
  postedBy: string;
  postedAt?: string;
  location: string;
  schedule: string;
  budget?: string;
  description: string;
  detail?: string;
  tags?: string[];
  urgent?: boolean;
  photoPlaceholder?: boolean;
  onViewJob?: () => void;
  onMessage?: () => void;
  onSave?: () => void;
};

export function JobCard({
  title,
  postedBy,
  postedAt = 'Today',
  location,
  schedule,
  budget,
  description,
  detail,
  tags = [],
  urgent = false,
  photoPlaceholder = false,
  onViewJob,
  onMessage,
  onSave,
}: JobCardProps) {
  const visibleTags = tags.slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.poster}>
            Posted by {postedBy}
            {postedAt ? ` · ${postedAt}` : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="more-horiz" label="More job options" />
          <IconButton icon="bookmark-border" label="Save job" onPress={onSave} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Meta icon="location-on" text={location} />
        <Meta icon="schedule" text={schedule} />
        {budget ? <Meta icon="payments" text={budget} /> : null}
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={3} style={styles.description}>
          {description}
        </Text>
        {detail ? (
          <Text numberOfLines={2} style={styles.detail}>
            {detail}
          </Text>
        ) : null}
      </View>

      {photoPlaceholder ? (
        <View style={styles.photoPlaceholder}>
          <MaterialIcons color={color.textMuted} name="image" size={34} />
          <Text style={styles.photoText}>Job reference photo</Text>
        </View>
      ) : null}

      {visibleTags.length || urgent ? (
        <View style={styles.tagFrame}>
          <View style={styles.tagClip}>
            {visibleTags.map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
            {urgent && !visibleTags.includes('Urgent') ? <TagPill label="Urgent" /> : null}
          </View>
          <View style={styles.tagChevron}>
            <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <FeedActionButton icon="visibility" label="View Job" onPress={onViewJob} />
        <FeedActionButton icon="chat-bubble" label="Message" onPress={onMessage} />
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.iconButton}>
      <MaterialIcons color={color.textMuted} name={icon} size={18} />
    </Pressable>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <View style={styles.tagPill}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function FeedActionButton({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton}>
      <MaterialIcons color={color.textSubtle} name={icon} size={16} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.metaItem}>
      <MaterialIcons color={color.primary} name={icon} size={16} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    gap: space['2xs'],
  },
  title: {
    ...typography.sectionTitle,
    color: color.text,
  },
  poster: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 18,
    color: color.textMuted,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  iconButton: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 20,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
    maxWidth: '46%',
  },
  metaText: {
    ...typography.caption,
    color: color.textMuted,
  },
  copy: {
    gap: space.sm,
  },
  description: {
    ...typography.bodyMedium,
    color: color.text,
  },
  detail: {
    ...typography.caption,
    color: color.textMuted,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#DCEBFF',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    justifyContent: 'center',
    minHeight: 132,
    padding: space.xl,
  },
  photoText: {
    ...typography.captionMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  tagFrame: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 31,
    justifyContent: 'space-between',
    overflow: 'hidden',
    width: '100%',
  },
  tagClip: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space.xs,
    minWidth: 0,
    overflow: 'hidden',
  },
  tagPill: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 21,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  tagText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
    color: color.textSubtle,
    textAlign: 'center',
    width: 80,
  },
  tagChevron: {
    alignItems: 'center',
    height: 31,
    justifyContent: 'center',
    width: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    height: 34,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: space.md,
  },
  actionText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: color.textSubtle,
    textAlign: 'center',
  },
});
