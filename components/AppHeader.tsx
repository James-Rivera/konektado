import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actionIcon?: MaterialIconName;
  actionLabel?: string;
  onActionPress?: () => void;
  children?: ReactNode;
};

export function AppHeader({
  title,
  subtitle,
  eyebrow,
  actionIcon,
  actionLabel,
  onActionPress,
  children,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + space.md }]}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionIcon ? (
          <Pressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onPress={onActionPress}
            style={styles.iconButton}>
            <MaterialIcons color={color.text} name={actionIcon} size={22} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    gap: space.md,
    paddingBottom: space.lg,
    paddingHorizontal: space.xl,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    gap: space['2xs'],
  },
  eyebrow: {
    ...typography.captionMedium,
    color: color.primary,
  },
  title: {
    ...typography.screenTitle,
    color: color.text,
  },
  subtitle: {
    ...typography.body,
    color: color.textMuted,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
