import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PresenceDot } from '@/components/PresenceDot';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import type {
  ProfileCompletionAction,
  ProfileCompletionMode,
  ProfileModeCompletion,
  ProfileVerificationStatus,
} from '@/types/profile.types';

export type ProfileMode = 'work' | 'hiring';
type ProfileCompletionCardMode = ProfileCompletionMode;
export type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type MetricItem = {
  icon?: MaterialIconName;
  label: string;
  value: string;
};

type BadgeTone = 'success' | 'warning' | 'primary';
type ActionTone = 'blue' | 'green' | 'yellow';

export function ProfileTopBar({
  onSettings,
  topInset,
}: {
  onSettings: () => void;
  topInset: number;
}) {
  return (
    <View style={[styles.topBar, { paddingTop: topInset + space.sm }]}>
      <Text style={styles.topBarTitle}>Profile</Text>
      <Pressable
        accessibilityLabel="Open profile settings"
        accessibilityRole="button"
        onPress={onSettings}
        style={({ pressed }) => [styles.topBarAction, pressed && styles.pressed]}>
        <MaterialIcons color={color.text} name="settings" size={22} />
      </Pressable>
    </View>
  );
}

export function ProfileSegmentedControl({
  mode,
  onChange,
}: {
  mode: ProfileMode;
  onChange: (mode: ProfileMode) => void;
}) {
  return (
    <View style={styles.segmentWrap}>
      <SegmentButton
        label="Work Profile"
        selected={mode === 'work'}
        onPress={() => onChange('work')}
      />
      <SegmentButton
        label="Hiring Profile"
        selected={mode === 'hiring'}
        onPress={() => onChange('hiring')}
      />
    </View>
  );
}

export function ProfileHero({
  avatarUrl,
  badgeIcon,
  badgeLabel,
  badgeTone,
  children,
  completedCount,
  initials,
  location,
  name,
  onAddPhoto,
  onEdit,
  photoRecommended,
  presenceActive,
  stepsLabel,
}: {
  avatarUrl: string | null | undefined;
  badgeIcon: MaterialIconName;
  badgeLabel: string;
  badgeTone: BadgeTone;
  children?: ReactNode;
  completedCount?: number;
  initials: string;
  location: string;
  name: string;
  onAddPhoto?: () => void;
  onEdit: () => void;
  photoRecommended?: boolean;
  presenceActive: boolean;
  stepsLabel?: string;
}) {
  return (
    <View style={styles.heroBand}>
      <View style={styles.heroRow}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
          <PresenceDot active={presenceActive} size={12} style={styles.presenceDot} />
        </View>
        <View style={styles.heroCopy}>
          <Text numberOfLines={1} style={styles.heroName}>
            {name}
          </Text>
          <View style={styles.locationRow}>
            <MaterialIcons color={color.verificationBlue} name="location-on" size={15} />
            <Text numberOfLines={1} style={styles.heroLocation}>
              {location}
            </Text>
          </View>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.statusBadge, styles[`${badgeTone}Badge`]]}>
              <MaterialIcons color={getBadgeIconColor(badgeTone)} name={badgeIcon} size={12} />
              <Text style={styles.statusBadgeText}>{badgeLabel}</Text>
            </View>
            <View style={styles.stepsBadge}>
              <Text style={styles.stepsBadgeText}>{stepsLabel ?? `${completedCount ?? 0}/3`}</Text>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.heroEdit, pressed && styles.pressed]}>
          <MaterialIcons color={color.verificationBlue} name="edit" size={22} />
        </Pressable>
      </View>
      {photoRecommended && onAddPhoto ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAddPhoto}
          style={({ pressed }) => [styles.photoPrompt, pressed && styles.pressed]}>
          <View style={styles.photoPromptIcon}>
            <MaterialIcons color={color.verificationBlue} name="photo-camera" size={18} />
          </View>
          <View style={styles.photoPromptCopy}>
            <Text style={styles.photoPromptTitle}>Add a profile photo</Text>
            <Text style={styles.photoPromptBody}>
              Help neighbors recognize and trust who they are talking to.
            </Text>
          </View>
          <MaterialIcons color={color.verificationBlue} name="chevron-right" size={20} />
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

export function ProfileCompletionCard({
  completion,
  mode,
  onAction,
}: {
  completion: ProfileModeCompletion;
  mode: ProfileCompletionCardMode;
  onAction: (action: ProfileCompletionAction) => void;
}) {
  const title =
    mode === 'core'
      ? 'Complete your Core Profile'
      : mode === 'work'
        ? 'Complete your Work Profile'
        : 'Complete your Hiring Profile';
  const visibleMissing = completion.missingItems.slice(0, 3);
  const visibleOptional = completion.optionalItems.slice(0, 1);

  if (completion.state === 'ready') {
    return (
      <View style={styles.readyCard}>
        <View style={styles.readyIcon}>
          <MaterialIcons color="#2F7D32" name="check" size={18} />
        </View>
        <View style={styles.readyCardCopy}>
          <Text style={styles.readyCardTitle}>
            {mode === 'core'
              ? 'Core Profile ready'
              : mode === 'work'
                ? 'Work Profile ready'
                : 'Hiring Profile ready'}
          </Text>
          <Text style={styles.readyCardText}>
            {mode === 'core'
              ? 'Your shared identity is complete.'
              : 'Required setup is complete for this mode.'}
          </Text>
          {visibleOptional.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onAction(visibleOptional[0])}
              style={({ pressed }) => [styles.readyOptionalAction, pressed && styles.pressed]}>
              <Text style={styles.readyOptionalText}>{visibleOptional[0].label}</Text>
              <MaterialIcons color={color.verificationBlue} name="add" size={16} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.completionCard}>
      <View style={styles.completionHeader}>
        <View style={styles.completionTitleBlock}>
          <Text style={styles.completionTitle}>{title}</Text>
          <Text style={styles.completionStatus}>{completion.statusLabel}</Text>
        </View>
        {completion.state === 'not_set_up' ? (
          <View style={styles.notSetupPill}>
            <Text style={styles.notSetupText}>Not set up</Text>
          </View>
        ) : (
          <Text style={styles.completionPercent}>{completion.percent}%</Text>
        )}
      </View>

      {completion.state !== 'not_set_up' ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion.percent}%` }]} />
          </View>
          <Text style={styles.completionMeta}>
            {completion.completedSteps} of {completion.totalSteps} required steps completed
          </Text>
        </>
      ) : (
        <Text style={styles.completionMeta}>
          {mode === 'core'
            ? 'Finish your shared profile before setting up Work or Hiring.'
            : 'Set up this mode only when you want to use this side of Konektado.'}
        </Text>
      )}

      {visibleMissing.length ? (
        <View style={styles.checklist}>
          <Text style={styles.checklistLabel}>Next steps</Text>
          {visibleMissing.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => onAction(item)}
              style={({ pressed }) => [styles.checklistRow, pressed && styles.pressed]}>
              <MaterialIcons color={color.verificationBlue} name="radio-button-unchecked" size={16} />
              <View style={styles.checklistCopy}>
                <Text style={styles.checklistTitle}>{item.label}</Text>
                {item.description ? (
                  <Text numberOfLines={2} style={styles.checklistDescription}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <MaterialIcons color={color.textSubtle} name="chevron-right" size={18} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.readyRow}>
          <MaterialIcons color={color.success} name="check-circle" size={18} />
          <Text style={styles.readyText}>Start with the recommended action below.</Text>
        </View>
      )}

      {visibleOptional.length ? (
        <View style={styles.optionalBlock}>
          <Text style={styles.optionalLabel}>Optional</Text>
          {visibleOptional.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => onAction(item)}
              style={({ pressed }) => [styles.optionalRow, pressed && styles.pressed]}>
              <Text style={styles.optionalText}>{item.label}</Text>
              <MaterialIcons color={color.verificationBlue} name="add" size={18} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {completion.nextRecommendedAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction(completion.nextRecommendedAction as ProfileCompletionAction)}
          style={({ pressed }) => [styles.completionCta, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={styles.completionCtaText}>
            {completion.nextRecommendedAction.label}
          </Text>
          <MaterialIcons color={color.white} name="arrow-forward" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function VerificationStatusPanel({
  status,
  onAction,
}: {
  status: ProfileVerificationStatus;
  onAction: (action: ProfileCompletionAction) => void;
}) {
  const icon = status.status === 'approved'
    ? 'verified'
    : status.status === 'pending'
      ? 'schedule'
      : status.status === 'unverified'
        ? 'shield'
        : 'error-outline';

  return (
    <View style={styles.verificationPanel}>
      <View style={styles.verificationHeader}>
        <View style={styles.verificationIcon}>
          <MaterialIcons color={color.verificationBlue} name={icon} size={20} />
        </View>
        <Text style={styles.verificationTitle}>{status.label}</Text>
      </View>
      <View style={styles.verificationBody}>
        <Text style={styles.verificationDescription}>{status.description}</Text>
        {status.reviewerNote && status.status !== 'approved' ? (
          <Text style={styles.verificationNote}>Reviewer note: {status.reviewerNote}</Text>
        ) : null}
      </View>
      {status.action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction(status.action as ProfileCompletionAction)}
          style={({ pressed }) => [styles.verificationAction, pressed && styles.pressed]}>
          <Text style={styles.verificationActionText}>{status.action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <View style={styles.metricStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.metricTile}>
          <View style={styles.metricValueRow}>
            {item.icon ? <MaterialIcons color={color.verificationBlue} name={item.icon} size={14} /> : null}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.metricValue}>
              {item.value}
            </Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.metricLabel}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ActionRail({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.actionRail}
      showsHorizontalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function ProfileActionCard({
  actionLabel,
  body,
  icon,
  onPress,
  title,
  tone = 'yellow',
}: {
  actionLabel: string;
  body: string;
  icon: MaterialIconName;
  onPress: () => void;
  title: string;
  tone?: ActionTone;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
      <View style={styles.actionHeader}>
        <View style={[styles.actionIcon, styles[`${tone}ActionIcon`]]}>
          <MaterialIcons color={getActionIconColor(tone)} name={icon} size={22} />
        </View>
        <View style={styles.actionCopy}>
          <Text numberOfLines={1} style={styles.actionTitle}>
            {title}
          </Text>
          <Text numberOfLines={2} style={styles.actionBody}>
            {body}
          </Text>
        </View>
      </View>
      <View style={styles.actionButton}>
        <Text numberOfLines={1} style={styles.actionButtonText}>
          {actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export function ProfileSection({
  children,
  onAdd,
  onEdit,
  title,
}: {
  children: ReactNode;
  onAdd?: () => void;
  onEdit?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionBand}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionActions}>
          {onAdd ? (
            <Pressable
              accessibilityLabel={`Add ${title}`}
              accessibilityRole="button"
              onPress={onAdd}
              style={({ pressed }) => [styles.sectionIconButton, pressed && styles.pressed]}>
              <MaterialIcons color={color.verificationBlue} name="add" size={20} />
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable
              accessibilityLabel={`Edit ${title}`}
              accessibilityRole="button"
              onPress={onEdit}
              style={({ pressed }) => [styles.sectionIconButton, pressed && styles.pressed]}>
              <MaterialIcons color={color.verificationBlue} name="edit" size={19} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function ProfilePillRow({ values }: { values: string[] }) {
  return (
    <View style={styles.pillRail}>
      {values.map((value) => (
        <View key={value} style={styles.servicePill}>
          <Text numberOfLines={1} style={styles.servicePillText}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function HistoryFilterTabs({
  active,
  onChange,
}: {
  active: 'active' | 'completed';
  onChange: (value: 'active' | 'completed') => void;
}) {
  return (
    <View style={styles.filterTabs}>
      <FilterTab label="Active" selected={active === 'active'} onPress={() => onChange('active')} />
      <FilterTab
        label="Completed"
        selected={active === 'completed'}
        onPress={() => onChange('completed')}
      />
    </View>
  );
}

export function ProfileHistoryCard({
  description,
  footerLeft,
  footerRight,
  meta,
  onPress,
  rightLabel,
  title,
}: {
  description?: string | null;
  footerLeft?: string | null;
  footerRight?: string | null;
  meta?: string | null;
  onPress?: () => void;
  rightLabel?: string | null;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.historyTop}>
        <View style={styles.historyTitleBlock}>
          <Text numberOfLines={2} style={styles.historyTitle}>
            {title}
          </Text>
          {meta ? <Text numberOfLines={1} style={styles.historyMeta}>{meta}</Text> : null}
        </View>
        {rightLabel ? <Text style={styles.historyDate}>{rightLabel}</Text> : null}
      </View>
      {description ? (
        <Text numberOfLines={3} style={styles.historyDescription}>
          {description}
        </Text>
      ) : null}
      {footerLeft || footerRight ? (
        <View style={styles.historyFooter}>
          {footerLeft ? (
            <View style={styles.historyFooterSide}>
              <MaterialIcons color={color.verificationBlue} name="location-on" size={14} />
              <Text numberOfLines={1} style={styles.historyFooterText}>
                {footerLeft}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {footerRight ? <Text style={styles.historyFooterAccent}>{footerRight}</Text> : null}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.historyCard}>{content}</View>;
}

export function ReviewCard({
  author,
  body,
  dateLabel,
  rating,
  title,
}: {
  author: string;
  body: string;
  dateLabel: string;
  rating: string;
  title: string;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewRatingPill}>
          <MaterialIcons color={color.accentYellow} name="star" size={15} />
          <Text style={styles.reviewRatingText}>{rating}</Text>
        </View>
        <Text numberOfLines={1} style={styles.reviewDate}>
          {dateLabel}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.reviewTitle}>
        {title}
      </Text>
      <Text numberOfLines={3} style={styles.reviewBody}>
        {body}
      </Text>
      <Text numberOfLines={1} style={styles.reviewAuthor}>
        From: {author}
      </Text>
    </View>
  );
}

export function EmptyProfilePanel({
  icon,
  message,
  title,
}: {
  icon: MaterialIconName;
  message: string;
  title: string;
}) {
  return (
    <View style={styles.emptyPanel}>
      <MaterialIcons color={color.textSubtle} name={icon} size={24} />
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>{message}</Text>
      </View>
    </View>
  );
}

export function ProfileLoadingSkeleton() {
  return (
    <>
      <View style={styles.skeletonSegment}>
        <Skeleton height={26} width="48%" borderRadius={radius.pill} />
        <Skeleton height={26} width="48%" borderRadius={radius.pill} />
      </View>
      <View style={styles.heroBand}>
        <View style={styles.heroRow}>
          <Skeleton height={68} width={68} borderRadius={radius.pill} />
          <View style={styles.heroCopy}>
            <Skeleton height={20} width="72%" />
            <Skeleton height={14} width="62%" />
            <Skeleton height={20} width={112} borderRadius={radius.pill} />
          </View>
          <Skeleton height={24} width={24} borderRadius={radius.sm} />
        </View>
        <View style={styles.metricStrip}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.metricTile}>
              <Skeleton height={14} width={36} />
              <Skeleton height={12} width={54} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.sectionBand}>
        <Skeleton height={16} width={110} />
        <View style={styles.skeletonRail}>
          <Skeleton height={120} width={210} borderRadius={radius.md} />
          <Skeleton height={120} width={210} borderRadius={radius.md} />
        </View>
      </View>
      <View style={styles.sectionBand}>
        <Skeleton height={18} width={88} />
        <Skeleton height={112} width="100%" borderRadius={radius.lg} />
      </View>
    </>
  );
}

function SegmentButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        selected && styles.segmentButtonSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function FilterTab({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterTab,
        selected && styles.filterTabSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.filterTabText, selected && styles.filterTabTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function getBadgeIconColor(tone: BadgeTone) {
  if (tone === 'success') return '#2F7D32';
  if (tone === 'warning') return color.warning;
  return color.verificationBlue;
}

function getActionIconColor(tone: ActionTone) {
  if (tone === 'green') return '#2F7D32';
  if (tone === 'blue') return color.verificationBlue;
  return color.verificationBlue;
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingBottom: space.sm,
    paddingHorizontal: space.xl,
  },
  topBarTitle: {
    ...typography.sectionTitle,
    color: color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  topBarAction: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  segmentWrap: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: space.xl,
    marginVertical: space.md,
    padding: space.xs,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  segmentButtonSelected: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderWidth: 1,
  },
  segmentText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 16,
    color: color.textMuted,
  },
  segmentTextSelected: {
    fontFamily: 'Satoshi-Bold',
    color: color.verificationBlue,
  },
  heroBand: {
    backgroundColor: color.background,
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    paddingTop: space.lg,
  },
  heroRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    position: 'relative',
    width: 76,
  },
  avatarImage: {
    borderRadius: radius.pill,
    height: '100%',
    width: '100%',
  },
  avatarText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    lineHeight: 30,
    color: color.verificationBlue,
  },
  presenceDot: {
    bottom: 5,
    right: 5,
  },
  heroCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
    paddingTop: space.xs,
  },
  heroName: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
    color: color.text,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
    minWidth: 0,
  },
  heroLocation: {
    ...typography.caption,
    color: color.textSubtle,
    flex: 1,
  },
  heroBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 20,
    paddingHorizontal: space.sm,
  },
  successBadge: {
    backgroundColor: color.successSoft,
    borderColor: color.success,
  },
  warningBadge: {
    backgroundColor: color.warningSoft,
    borderColor: color.warningSoft,
  },
  primaryBadge: {
    backgroundColor: color.primarySoft,
    borderColor: color.primarySoft,
  },
  statusBadgeText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    lineHeight: 16,
    color: color.text,
  },
  stepsBadge: {
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    minHeight: 20,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  stepsBadgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    color: color.verificationBlue,
  },
  heroEdit: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  photoPrompt: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  photoPromptIcon: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  photoPromptCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  photoPromptTitle: {
    ...typography.captionMedium,
    color: color.text,
  },
  photoPromptBody: {
    ...typography.caption,
    color: color.textMuted,
  },
  metricStrip: {
    flexDirection: 'row',
    gap: space.xs,
  },
  metricTile: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    flex: 1,
    gap: space['2xs'],
    minHeight: 54,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
  },
  metricValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['2xs'],
    maxWidth: '100%',
  },
  metricValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 16,
    color: color.text,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 14,
    color: color.text,
    textAlign: 'center',
  },
  completionCard: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  readyCard: {
    alignItems: 'flex-start',
    backgroundColor: color.successSoft,
    borderColor: color.success,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  readyIcon: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  readyCardCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  readyCardTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  readyCardText: {
    ...typography.caption,
    color: color.textMuted,
  },
  readyOptionalAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 28,
  },
  readyOptionalText: {
    ...typography.captionMedium,
    color: color.verificationBlue,
  },
  completionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  completionTitleBlock: {
    flex: 1,
    gap: space['2xs'],
  },
  completionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  completionStatus: {
    ...typography.caption,
    color: color.textMuted,
  },
  completionPercent: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: color.verificationBlue,
  },
  notSetupPill: {
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  notSetupText: {
    ...typography.captionMedium,
    color: color.verificationBlue,
  },
  progressTrack: {
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    height: '100%',
  },
  completionMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  checklist: {
    gap: space.sm,
  },
  checklistLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  checklistRow: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 48,
    padding: space.md,
  },
  checklistCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  checklistTitle: {
    ...typography.captionMedium,
    color: color.text,
  },
  checklistDescription: {
    ...typography.tiny,
    color: color.textMuted,
  },
  readyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  readyText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  optionalBlock: {
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: space.sm,
    paddingTop: space.md,
  },
  optionalLabel: {
    ...typography.captionMedium,
    color: color.text,
  },
  optionalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  optionalText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  completionCta: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: space.md,
  },
  completionCtaText: {
    ...typography.bodyMedium,
    color: color.white,
    flexShrink: 1,
  },
  verificationPanel: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  verificationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    minWidth: 0,
  },
  verificationIcon: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  verificationBody: {
    gap: space.xs,
  },
  verificationTitle: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
    minWidth: 0,
  },
  verificationDescription: {
    ...typography.caption,
    color: color.textMuted,
  },
  verificationNote: {
    ...typography.captionMedium,
    color: color.text,
  },
  verificationAction: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  verificationActionText: {
    ...typography.bodyMedium,
    color: color.white,
    textAlign: 'center',
  },
  actionRail: {
    gap: space.sm,
    paddingRight: space.xl,
  },
  actionCard: {
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 120,
    padding: space.md,
    width: 210,
  },
  actionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  blueActionIcon: {
    backgroundColor: color.primarySoft,
  },
  greenActionIcon: {
    backgroundColor: color.successSoft,
  },
  yellowActionIcon: {
    backgroundColor: color.background,
  },
  actionCopy: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  actionTitle: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
    color: color.textMuted,
  },
  actionBody: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 16,
    color: color.textMuted,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 29,
    paddingHorizontal: space.sm,
  },
  actionButtonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
    color: color.verificationBlue,
    textAlign: 'center',
  },
  sectionBand: {
    backgroundColor: color.background,
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
    color: color.text,
  },
  sectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  sectionIconButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  pillRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  servicePill: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: space.md,
  },
  servicePillText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: space.sm,
  },
  filterTab: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 82,
    paddingHorizontal: space.md,
  },
  filterTabSelected: {
    backgroundColor: color.background,
    borderColor: color.verificationBlue,
  },
  filterTabText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  filterTabTextSelected: {
    color: color.verificationBlue,
  },
  historyCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  historyTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
  },
  historyTitleBlock: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  historyTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: color.text,
  },
  historyMeta: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 18,
    color: color.verificationBlue,
  },
  historyDate: {
    ...typography.caption,
    color: color.textMuted,
    marginTop: 2,
  },
  historyDescription: {
    ...typography.caption,
    color: color.textMuted,
  },
  historyFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
  },
  historyFooterSide: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space['2xs'],
    minWidth: 0,
  },
  historyFooterText: {
    ...typography.caption,
    color: color.textSubtle,
    flex: 1,
  },
  historyFooterAccent: {
    ...typography.captionMedium,
    color: color.verificationBlue,
  },
  reviewCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  reviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
  },
  reviewRatingPill: {
    alignItems: 'center',
    backgroundColor: color.warningSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 26,
    paddingHorizontal: space.sm,
  },
  reviewRatingText: {
    ...typography.captionMedium,
    color: color.text,
  },
  reviewDate: {
    ...typography.caption,
    color: color.textMuted,
  },
  reviewTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  reviewBody: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: color.text,
  },
  reviewAuthor: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 16,
    color: color.textMuted,
  },
  emptyPanel: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  emptyCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  emptyMessage: {
    ...typography.caption,
    color: color.textMuted,
  },
  skeletonSegment: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    marginHorizontal: space.xl,
    marginVertical: space.sm,
    padding: space['2xs'],
  },
  skeletonRail: {
    flexDirection: 'row',
    gap: space.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
