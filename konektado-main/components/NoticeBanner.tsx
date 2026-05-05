import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

type NoticeBannerProps = {
  title: string;
  message?: string;
  variant?: NoticeVariant;
  actionLabel?: string;
  onActionPress?: () => void;
  icon?: MaterialIconName;
};

export function NoticeBanner({
  title,
  message,
  variant = 'info',
  actionLabel,
  onActionPress,
  icon,
}: NoticeBannerProps) {
  const palette = getPalette(variant);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <MaterialIcons color={palette.icon} name={icon ?? palette.iconName} size={22} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actionLabel ? (
          <Pressable accessibilityRole="button" onPress={onActionPress} style={styles.action}>
            <Text style={[styles.actionText, { color: palette.icon }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function getPalette(variant: NoticeVariant): {
  background: string;
  border: string;
  icon: string;
  text: string;
  iconName: MaterialIconName;
} {
  if (variant === 'success') {
    return {
      background: color.successSoft,
      border: color.success,
      icon: '#2F7D32',
      text: color.text,
      iconName: 'check-circle',
    };
  }
  if (variant === 'warning') {
    return {
      background: color.warningSoft,
      border: '#F3D089',
      icon: color.warning,
      text: color.text,
      iconName: 'lock-outline',
    };
  }
  if (variant === 'danger') {
    return {
      background: color.dangerSoft,
      border: '#F3B4B4',
      icon: color.danger,
      text: color.text,
      iconName: 'error-outline',
    };
  }
  return {
    background: color.primarySoft,
    border: '#D6E8FF',
    icon: color.primary,
    text: color.text,
    iconName: 'info-outline',
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
  },
  copy: {
    flex: 1,
    gap: space['2xs'],
  },
  title: {
    ...typography.bodyMedium,
  },
  message: {
    ...typography.caption,
    color: color.textMuted,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: space.xs,
  },
  actionText: {
    ...typography.captionMedium,
  },
});
