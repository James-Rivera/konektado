import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

export type WorkerCardProps = {
  name: string;
  serviceTitle: string;
  postedAt?: string;
  location: string;
  availability: string;
  headline?: string;
  description?: string;
  budgetHint?: string;
  rating?: string;
  completedJobs?: string;
  tags?: string[];
  verified?: boolean;
  onViewProfile?: () => void;
  onMessage?: () => void;
  onSave?: () => void;
};

export function WorkerCard({
  name,
  serviceTitle,
  postedAt = '1d ago',
  location,
  availability,
  headline,
  description,
  budgetHint,
  rating,
  completedJobs,
  tags = [],
  onViewProfile,
  onMessage,
  onSave,
}: WorkerCardProps) {
  const initials = getInitials(name);
  const visibleTags = tags.slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.service}>
              {serviceTitle}
              {postedAt ? ` · ${postedAt}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="more-horiz" label="More worker options" />
          <IconButton icon="bookmark-border" label="Save worker" onPress={onSave} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Summary icon="location-on" label={location} />
        <Summary icon="schedule" label={availability} />
        {budgetHint ? <Text style={styles.budgetHint}>{budgetHint}</Text> : null}
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.headline}>
          {headline ?? serviceTitle}
        </Text>
        {description ? (
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>

      {rating || completedJobs ? (
        <View style={styles.statsRow}>
          {rating ? <Summary icon="star" label={rating} /> : null}
          {completedJobs ? <Summary icon="check-circle" label={completedJobs} /> : null}
        </View>
      ) : null}

      {visibleTags.length ? (
        <View style={styles.tagFrame}>
          <View style={styles.tagClip}>
            {visibleTags.map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </View>
          <View style={styles.tagChevron}>
            <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <FeedActionButton icon="visibility" label="View Profile" onPress={onViewProfile} />
        <FeedActionButton icon="chat-bubble" label="Message" onPress={onMessage} />
      </View>
    </View>
  );
}

function Summary({ icon, label }: { icon: ComponentProps<typeof MaterialIcons>['name']; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <MaterialIcons color={icon === 'location-on' ? color.primary : color.textSubtle} name={icon} size={15} />
      <Text style={styles.summaryText}>{label}</Text>
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
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  identityRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space.md,
    minWidth: 0,
  },
  avatarWrap: {
    height: 44,
    width: 44,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statusDot: {
    backgroundColor: color.success,
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
  },
  avatarText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  identity: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  name: {
    ...typography.sectionTitle,
    color: color.text,
  },
  service: {
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  summaryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
  },
  summaryText: {
    ...typography.caption,
    color: color.textMuted,
  },
  budgetHint: {
    ...typography.captionMedium,
    color: color.primary,
  },
  copy: {
    gap: space.sm,
  },
  headline: {
    ...typography.bodyMedium,
    color: color.text,
  },
  description: {
    ...typography.caption,
    color: color.textMuted,
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
