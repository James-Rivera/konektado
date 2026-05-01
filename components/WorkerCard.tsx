import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

import { Pill } from './Pill';
import { PrimaryButton } from './PrimaryButton';

export type WorkerCardProps = {
  name: string;
  serviceTitle: string;
  location: string;
  availability: string;
  rating?: string;
  completedJobs?: string;
  tags?: string[];
  verified?: boolean;
  onViewProfile?: () => void;
  onMessage?: () => void;
};

export function WorkerCard({
  name,
  serviceTitle,
  location,
  availability,
  rating,
  completedJobs,
  tags = [],
  verified = false,
  onViewProfile,
  onMessage,
}: WorkerCardProps) {
  const initials = getInitials(name);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {verified ? <MaterialIcons color={color.success} name="verified" size={17} /> : null}
          </View>
          <Text style={styles.service}>{serviceTitle}</Text>
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        {rating ? <Summary icon="star" label={rating} /> : null}
        {completedJobs ? <Summary icon="check-circle" label={completedJobs} /> : null}
        <Summary icon="schedule" label={availability} />
      </View>

      {tags.length ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Pill key={tag} label={tag} />
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="View Profile" onPress={onViewProfile} variant="primary" />
        <PrimaryButton label="Message" onPress={onMessage} variant="outline" />
      </View>
    </View>
  );
}

function Summary({ icon, label }: { icon: ComponentProps<typeof MaterialIcons>['name']; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <MaterialIcons color={color.textSubtle} name={icon} size={15} />
      <Text style={styles.summaryText}>{label}</Text>
    </View>
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
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: {
    ...typography.sectionTitle,
    color: color.primary,
  },
  identity: {
    flex: 1,
    gap: space['2xs'],
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  name: {
    ...typography.sectionTitle,
    color: color.text,
    flexShrink: 1,
  },
  service: {
    ...typography.bodyMedium,
    color: color.textMuted,
  },
  location: {
    ...typography.caption,
    color: color.textSubtle,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  summaryItem: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  summaryText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
