import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: MaterialIconName;
  children?: ReactNode;
  compact?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  children,
  compact = false,
}: PrimaryButtonProps) {
  const buttonDisabled = disabled || loading;
  const foregroundColor = getForegroundColor(variant, buttonDisabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: buttonDisabled, busy: loading }}
      disabled={buttonDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        styles[variant],
        buttonDisabled && styles.disabled,
        pressed && !buttonDisabled && styles.pressed,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={foregroundColor} size="small" />
        ) : icon ? (
          <MaterialIcons color={foregroundColor} name={icon} size={18} />
        ) : null}
        <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
        {children}
      </View>
    </Pressable>
  );
}

function getForegroundColor(variant: ButtonVariant, disabled: boolean) {
  if (disabled) return color.textSubtle;
  if (variant === 'primary') return color.white;
  if (variant === 'secondary') return color.primary;
  if (variant === 'danger') return color.danger;
  return color.text;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  compact: {
    borderRadius: radius.pill,
    minHeight: 34,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
  },
  label: {
    ...typography.button,
    textAlign: 'center',
  },
  primary: {
    backgroundColor: color.primary,
  },
  secondary: {
    backgroundColor: color.primarySoft,
  },
  outline: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: color.dangerSoft,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    backgroundColor: color.surfaceAlt,
  },
});
