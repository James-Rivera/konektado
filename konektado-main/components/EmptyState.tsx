import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

import { PrimaryButton } from './PrimaryButton';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: MaterialIconName;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons color={color.primary} name={icon} size={26} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {actionLabel ? (
        <PrimaryButton label={actionLabel} onPress={onActionPress} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.xl,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  copy: {
    alignItems: 'center',
    gap: space.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: color.text,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: color.textMuted,
    textAlign: 'center',
  },
});
