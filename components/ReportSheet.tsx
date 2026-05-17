import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type ReportSheetSubmitValue = {
  reason: string;
  details: string | null;
};

type ReportReason = {
  icon: MaterialIconName;
  label: string;
};

const REPORT_REASONS: ReportReason[] = [
  { icon: 'privacy-tip', label: 'Fake profile or impersonation' },
  { icon: 'mark-email-unread', label: 'Spam or unwanted messages' },
  { icon: 'warning', label: 'Scam or unsafe activity' },
  { icon: 'report-problem', label: 'Inappropriate or harmful content' },
  { icon: 'article', label: 'Misleading job or service details' },
  { icon: 'more-horiz', label: 'Other concern' },
];

export function ReportSheet({
  description,
  onClose,
  onSubmit,
  submitting = false,
  targetLabel,
  title = 'Report',
  visible,
}: {
  description?: string;
  onClose: () => void;
  onSubmit: (value: ReportSheetSubmitValue) => void;
  submitting?: boolean;
  targetLabel?: string | null;
  title?: string;
  visible: boolean;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!visible) {
      setReason('');
      setDetails('');
    }
  }, [visible]);

  const helperText = useMemo(() => {
    if (description) return description;
    if (targetLabel) return `Tell us what happened with ${targetLabel}. Reports go to barangay admin review.`;
    return 'Tell us what happened. Reports go to barangay admin review.';
  }, [description, targetLabel]);

  const submit = () => {
    if (!reason || submitting) return;
    onSubmit({ reason, details: details.trim() || null });
  };

  return (
    <BottomSheet maxHeight="88%" onClose={submitting ? () => {} : onClose} visible={visible}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{helperText}</Text>
      </View>

      <View style={styles.reasons}>
        {REPORT_REASONS.map((option) => {
          const selected = reason === option.label;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={submitting}
              key={option.label}
              onPress={() => setReason(option.label)}
              style={({ pressed }) => [
                styles.reasonRow,
                selected && styles.reasonRowSelected,
                pressed && !submitting && styles.pressed,
              ]}>
              <View style={[styles.reasonIcon, selected && styles.reasonIconSelected]}>
                <MaterialIcons
                  color={selected ? color.primary : color.textMuted}
                  name={option.icon}
                  size={19}
                />
              </View>
              <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                {option.label}
              </Text>
              <MaterialIcons
                color={selected ? color.primary : color.textSubtle}
                name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={21}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.detailsWrap}>
        <Text style={styles.detailsLabel}>Details</Text>
        <TextInput
          editable={!submitting}
          multiline
          onChangeText={setDetails}
          placeholder="Optional details for the barangay admin"
          placeholderTextColor={color.textSubtle}
          style={styles.detailsInput}
          textAlignVertical="top"
          value={details}
        />
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          disabled={!reason}
          icon="report"
          label="Submit report"
          loading={submitting}
          onPress={submit}
        />
        <PrimaryButton
          disabled={submitting}
          label="Cancel"
          onPress={onClose}
          variant="ghost"
        />
      </View>
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
  description: {
    ...typography.body,
    color: color.textMuted,
    lineHeight: 20,
  },
  reasons: {
    gap: space.sm,
  },
  reasonRow: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 50,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  reasonRowSelected: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  reasonIcon: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  reasonIconSelected: {
    backgroundColor: color.background,
  },
  reasonLabel: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
    fontWeight: '700',
  },
  reasonLabelSelected: {
    color: color.primary,
  },
  detailsWrap: {
    gap: space.xs,
  },
  detailsLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  detailsInput: {
    ...typography.body,
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: color.text,
    minHeight: 96,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  actions: {
    gap: space.sm,
  },
  pressed: {
    opacity: 0.74,
  },
});
