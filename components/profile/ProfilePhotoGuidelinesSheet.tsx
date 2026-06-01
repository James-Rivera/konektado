import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

type ProfilePhotoGuidelinesSheetProps = {
  onChoosePhoto: () => void;
  onClose: () => void;
  uploading?: boolean;
  visible: boolean;
};

const ACCEPTED_RULES = [
  'Only you in the photo',
  'Face clearly visible',
  'Bright lighting',
  'Recent and natural',
];

const REJECTED_RULES = [
  'Group photo',
  'Blurry or dark photo',
  'Face covered',
  'Cartoon, anime, or avatar',
  'ID or document photo',
  'Heavily edited photo',
];

const REJECTED_EXAMPLES: { icon: MaterialIconName; label: string }[] = [
  { icon: 'groups', label: 'Group photo' },
  { icon: 'blur-on', label: 'Blurry or dark' },
  { icon: 'visibility-off', label: 'Face covered' },
  { icon: 'badge', label: 'Avatar or ID' },
];

export function ProfilePhotoGuidelinesSheet({
  onChoosePhoto,
  onClose,
  uploading = false,
  visible,
}: ProfilePhotoGuidelinesSheetProps) {
  return (
    <BottomSheet maxHeight="88%" onClose={uploading ? () => {} : onClose} visible={visible}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Profile photo guidelines</Text>
          <Text style={styles.helper}>
            Use a clear, recent photo of your face so people can trust your profile.
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close profile photo guidelines"
          accessibilityRole="button"
          disabled={uploading}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.textMuted} name="close" size={26} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.acceptedCard}>
          <View style={styles.acceptedVisual}>
            <MaterialIcons color={color.primary} name="person" size={54} />
            <View style={styles.acceptedBadge}>
              <MaterialIcons color="#2F7D32" name="check" size={16} />
            </View>
          </View>
          <View style={styles.acceptedCopy}>
            <Text style={styles.acceptedEyebrow}>Accepted example</Text>
            <Text style={styles.acceptedTitle}>Clear face photo</Text>
            <Text style={styles.acceptedBody}>Bright, recent, natural, and only you.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not accepted</Text>
          <View style={styles.rejectedGrid}>
            {REJECTED_EXAMPLES.map((example) => (
              <View key={example.label} style={styles.rejectedTile}>
                <View style={styles.rejectedVisual}>
                  <MaterialIcons color={color.textSubtle} name={example.icon} size={28} />
                  <View style={styles.rejectedBadge}>
                    <MaterialIcons color={color.danger} name="close" size={12} />
                  </View>
                </View>
                <Text style={styles.rejectedLabel}>{example.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ruleColumns}>
          <RuleList icon="check-circle" rules={ACCEPTED_RULES} title="Use a photo with" tone="accepted" />
          <RuleList icon="cancel" rules={REJECTED_RULES} title="Avoid these" tone="rejected" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          icon="photo-library"
          label={uploading ? 'Uploading...' : 'Choose photo'}
          loading={uploading}
          onPress={onChoosePhoto}
        />
      </View>
    </BottomSheet>
  );
}

function RuleList({
  icon,
  rules,
  title,
  tone,
}: {
  icon: MaterialIconName;
  rules: string[];
  title: string;
  tone: 'accepted' | 'rejected';
}) {
  const iconColor = tone === 'accepted' ? '#2F7D32' : color.danger;

  return (
    <View style={styles.ruleBlock}>
      <Text style={styles.ruleTitle}>{title}</Text>
      {rules.map((rule) => (
        <View key={rule} style={styles.ruleRow}>
          <MaterialIcons color={iconColor} name={icon} size={16} />
          <Text style={styles.ruleText}>{rule}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  headerCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  helper: {
    ...typography.body,
    color: color.textMuted,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    gap: space.lg,
    paddingBottom: space.sm,
  },
  acceptedCard: {
    alignItems: 'center',
    backgroundColor: color.successSoft,
    borderColor: color.success,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
  },
  acceptedVisual: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.success,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 76,
    justifyContent: 'center',
    position: 'relative',
    width: 76,
  },
  acceptedBadge: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.success,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: -2,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 24,
  },
  acceptedCopy: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  acceptedEyebrow: {
    ...typography.captionMedium,
    color: '#2F7D32',
    textTransform: 'uppercase',
  },
  acceptedTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  acceptedBody: {
    ...typography.caption,
    color: color.textMuted,
  },
  section: {
    gap: space.sm,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  rejectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  rejectedTile: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: space.xs,
    minHeight: 94,
    padding: space.sm,
  },
  rejectedVisual: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  rejectedBadge: {
    alignItems: 'center',
    backgroundColor: color.dangerSoft,
    borderColor: color.danger,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: -2,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 18,
  },
  rejectedLabel: {
    ...typography.captionMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  ruleColumns: {
    gap: space.md,
  },
  ruleBlock: {
    gap: space.xs,
  },
  ruleTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  ruleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  ruleText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  footer: {
    borderTopColor: color.border,
    borderTopWidth: 1,
    paddingTop: space.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
