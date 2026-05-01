import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type PillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

type PillProps = {
  label: string;
  selected?: boolean;
  tone?: PillTone;
  icon?: MaterialIconName;
  onPress?: () => void;
  children?: ReactNode;
};

export function Pill({ label, selected = false, tone = 'neutral', icon, onPress, children }: PillProps) {
  const content = (
    <View style={styles.content}>
      {icon ? <MaterialIcons color={getTextColor(tone, selected)} name={icon} size={14} /> : null}
      <Text style={[styles.text, { color: getTextColor(tone, selected) }]}>{label}</Text>
      {children}
    </View>
  );

  if (!onPress) {
    return <View style={[styles.base, styles[tone], selected && styles.selected]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[tone],
        selected && styles.selected,
        pressed && styles.pressed,
      ]}>
      {content}
    </Pressable>
  );
}

function getTextColor(tone: PillTone, selected: boolean) {
  if (selected || tone === 'primary') return color.primary;
  if (tone === 'success') return '#2F7D32';
  if (tone === 'warning') return color.warning;
  if (tone === 'danger') return color.danger;
  return color.textMuted;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  text: {
    ...typography.captionMedium,
  },
  neutral: {
    backgroundColor: color.background,
    borderColor: color.border,
  },
  primary: {
    backgroundColor: color.primarySoft,
    borderColor: color.primarySoft,
  },
  success: {
    backgroundColor: color.successSoft,
    borderColor: color.successSoft,
  },
  warning: {
    backgroundColor: color.warningSoft,
    borderColor: color.warningSoft,
  },
  danger: {
    backgroundColor: color.dangerSoft,
    borderColor: color.dangerSoft,
  },
  selected: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  pressed: {
    opacity: 0.75,
  },
});
