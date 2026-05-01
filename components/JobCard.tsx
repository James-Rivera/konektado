import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

import { Pill } from './Pill';
import { PrimaryButton } from './PrimaryButton';

export type JobCardProps = {
  title: string;
  postedBy: string;
  location: string;
  schedule: string;
  budget?: string;
  description: string;
  tags?: string[];
  urgent?: boolean;
  onViewJob?: () => void;
  onMessage?: () => void;
};

export function JobCard({
  title,
  postedBy,
  location,
  schedule,
  budget,
  description,
  tags = [],
  urgent = false,
  onViewJob,
  onMessage,
}: JobCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.poster}>Posted by {postedBy}</Text>
        </View>
        {urgent ? <Pill label="Urgent" tone="warning" icon="bolt" /> : null}
      </View>

      <View style={styles.metaGroup}>
        <Meta icon="location-on" text={location} />
        <Meta icon="schedule" text={schedule} />
        {budget ? <Meta icon="payments" text={budget} /> : null}
      </View>

      <Text numberOfLines={3} style={styles.description}>
        {description}
      </Text>

      {tags.length ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Pill key={tag} label={tag} />
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="View Job" onPress={onViewJob} variant="primary" />
        <PrimaryButton label="Message" onPress={onMessage} variant="outline" />
      </View>
    </View>
  );
}

function Meta({ icon, text }: { icon: ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.metaItem}>
      <MaterialIcons color={color.textSubtle} name={icon} size={16} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
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
    ...typography.caption,
    color: color.textMuted,
  },
  metaGroup: {
    gap: space.xs,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  metaText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  description: {
    ...typography.body,
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
