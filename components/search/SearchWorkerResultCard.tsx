import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, typography } from '@/constants/theme';
import type { SearchWorkerItem } from '@/constants/search-demo-data';

export function SearchWorkerResultCard({
  worker,
  onOpenWorker,
  onSave,
}: {
  worker: SearchWorkerItem;
  onOpenWorker: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(worker.name)}</Text>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{worker.name}</Text>
            <Text style={styles.statusLine}>{worker.statusLine}</Text>
          </View>
        </View>

        <View style={styles.iconRow}>
          <IconButton label="More options" name="more-horiz" onPress={() => Alert.alert('Options', 'More search actions are not connected in this demo.')} />
          <IconButton label="Save worker" name="bookmark-border" onPress={onSave} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaItem icon="star-border" text={worker.ratingText} tint="yellow" />
        <MetaItem icon="check-circle" text={worker.jobsDoneText} />
        <MetaItem icon="location-on" text={worker.location} />
      </View>

      <Text style={styles.rateLine}>{worker.rateLine}</Text>
      <Text style={styles.headline}>{worker.headline}</Text>
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
        <Text style={styles.primaryButtonText}>View profile</Text>
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
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  statusDot: {
    backgroundColor: color.brandYellow,
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 0,
    height: 10,
    position: 'absolute',
    right: 0,
    width: 10,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  statusLine: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
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
  rateLine: {
    ...typography.caption,
    color: color.textMuted,
  },
  headline: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
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
