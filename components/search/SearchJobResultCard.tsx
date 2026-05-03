import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, typography } from '@/constants/theme';
import type { SearchJobItem } from '@/constants/search-demo-data';

export function SearchJobResultCard({
  job,
  onOpenJob,
  onSave,
}: {
  job: SearchJobItem;
  onOpenJob: () => void;
  onSave: () => void;
}) {
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
            <IconButton label="Save job" name="bookmark-border" onPress={onSave} />
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaItem icon="star-border" text={job.clientRatingText} tint="yellow" />
        <MetaItem icon="work" text={job.jobsPostedText} />
        <MetaItem icon="location-on" text={job.location} />
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
  tint = 'default',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  tint?: 'default' | 'yellow';
}) {
  return (
    <View style={styles.metaItem}>
      <MaterialIcons color={tint === 'yellow' ? color.brandYellow : color.textMuted} name={icon} size={16} />
      <Text numberOfLines={1} style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
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
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    maxWidth: 118,
  },
  metaText: {
    ...typography.caption,
    color: color.textMuted,
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
