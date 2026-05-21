import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { color, radius, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type MoreSheetAction = {
  disabled?: boolean;
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function MoreActionsSheet({
  actions,
  onClose,
  subtitle,
  title = 'Options',
  visible,
}: {
  actions: MoreSheetAction[];
  onClose: () => void;
  subtitle?: string | null;
  title?: string;
  visible: boolean;
}) {
  return (
    <BottomSheet maxHeight="72%" onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.actionList}>
        {actions.map((action) => {
          const danger = action.tone === 'danger';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled }}
              disabled={action.disabled}
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionRow,
                danger && styles.actionRowDanger,
                action.disabled && styles.actionRowDisabled,
                pressed && !action.disabled && styles.pressed,
              ]}>
              <MaterialIcons
                color={danger ? color.danger : color.text}
                name={action.icon}
                size={22}
              />
              <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>
                {action.label}
              </Text>
              <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: space.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: color.text,
  },
  subtitle: {
    ...typography.body,
    color: color.textMuted,
  },
  actionList: {
    gap: space.sm,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  actionRowDanger: {
    backgroundColor: color.dangerSoft,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
  },
  actionLabelDanger: {
    color: color.danger,
  },
  cancelButton: {
    alignItems: 'center',
    minHeight: 42,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.button,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.76,
  },
});
