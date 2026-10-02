import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminContextBanner } from '@/components/admin/AdminContextBanner';
import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { Skeleton, SkeletonAvatar, SkeletonChip, SkeletonText } from '@/components/Skeleton';
import { getDisplayLabelForMvpService } from '@/constants/service-taxonomy';
import { color, radius, space, typography } from '@/constants/theme';
import {
    formatJobBudget,
    formatJobPostTitle,
    formatServicePostTitle,
    formatServiceRate,
    getExperienceLabel,
    getMarketplaceLocation,
} from '@/services/marketplace.helpers';
import type {
    CredentialSummary,
    JobSummary,
    ProviderService,
    PublicClientProfile,
    PublicProfileHistoryItem,
    PublicWorkerProfile,
    Review,
} from '@/types/marketplace.types';
import { getAvatarDisplayUrl } from '@/utils/image-processing';

type ProfileCta = {
  disabled?: boolean;
  helper?: string | null;
  label: string;
  loading?: boolean;
  onPress: () => void;
};

export function PublicProfileHeader({
  actionActive = false,
  actionIcon,
  actionLabel,
  title,
  onBack,
  onAction,
}: {
  actionActive?: boolean;
  actionIcon?: ComponentProps<typeof MaterialIcons>['name'];
  actionLabel?: string;
  title: string;
  onBack: () => void;
  onAction?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
        <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {actionIcon && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: actionActive }}
          onPress={onAction}
          style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
          <MaterialIcons
            color={actionActive ? color.primary : color.text}
            name={actionIcon}
            size={22}
          />
        </Pressable>
      ) : (
        <View style={styles.headerIcon} />
      )}
    </View>
  );
}

export function PublicWorkerProfileView({
  adminViewOnly = false,
  bottomInset,
  cta,
  onOpenService,
  profile,
}: {
  adminViewOnly?: boolean;
  bottomInset: number;
  cta: ProfileCta;
  onOpenService?: (serviceId: string) => void;
  profile: PublicWorkerProfile;
}) {
  const visibleServices = profile.services;

  /*
   * Reading order follows what a resident decides on: who this is and whether
   * others trust them (hero), what they can hire them for (services), then
   * supporting context. Sections with nothing to show are omitted instead of
   * rendering a wall of "No X yet" cards; only Reviews keeps a one-line empty
   * state because "no reviews" is itself a trust signal.
   */
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(bottomInset, space.md) + (adminViewOnly ? space.xl : 116) },
        ]}
        showsVerticalScrollIndicator={false}>
        <PublicSummaryCard
          avatarUrl={profile.avatarUrl}
          location={profile.publicLocation}
          name={profile.fullName}
          roleLabel="Worker"
          stats={[
            ratingStat(profile.averageRating, profile.reviewCount),
            { label: profile.reviewCount === 1 ? 'Review' : 'Reviews', value: String(profile.reviewCount) },
            { label: 'Jobs done', value: String(profile.completedJobsCount) },
          ]}
          verified={Boolean(profile.barangayVerifiedAt || profile.verifiedAt)}
        />
        {adminViewOnly ? <AdminContextBanner /> : null}

        {profile.selectedService ? (
          <Section title="Service you viewed">
            <ServiceContextCard service={profile.selectedService} onPress={onOpenService} />
          </Section>
        ) : null}

        {visibleServices.length ? (
          <Section title={profile.selectedService ? 'Other services' : 'Services offered'}>
            <View style={styles.cardList}>
              {visibleServices.map((service) => (
                <ServiceSummaryCard key={service.id} service={service} onPress={onOpenService} />
              ))}
            </View>
          </Section>
        ) : !profile.selectedService ? (
          <Section title="Services offered">
            <InlineEmpty icon="handyman" text="No active services right now." />
          </Section>
        ) : null}

        {profile.about ? (
          <Section title="About">
            <Text style={styles.bodyText}>{profile.about}</Text>
          </Section>
        ) : null}

        {profile.skills.length ? (
          <Section title="Skills">
            <LimitedTagRow primary={displayService(profile.skills[0])} tags={profile.skills.slice(1)} />
            {/*
              Skills are self-declared. Barangay verification covers identity
              and residency, never competence, so the two must not read as
              one trust signal.
            */}
            <Text style={styles.skillsNote}>Skills are provided by the resident.</Text>
          </Section>
        ) : null}

        <Section title="Reviews">
          {profile.reviews.length ? (
            <View style={styles.cardList}>
              {profile.reviews.slice(0, 3).map((review) => (
                <PublicReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : (
            <InlineEmpty icon="rate-review" text="No reviews yet. Reviews appear after completed jobs." />
          )}
        </Section>

        {profile.workHistory.length ? (
          <Section title="Work history">
            <View style={styles.cardList}>
              {profile.workHistory.map((item) => (
                <HistorySummaryCard item={item} key={item.id} fallbackTitle="Completed work" />
              ))}
            </View>
          </Section>
        ) : null}

        {profile.credentials.length ? (
          <Section title="Credentials">
            <View style={styles.cardList}>
              {profile.credentials.slice(0, 3).map((credential) => (
                <CredentialCard credential={credential} key={credential.id} />
              ))}
            </View>
          </Section>
        ) : null}

        <SafetyNote text="Payment and final agreement happen outside Konektado. Confirm schedule, exact location, and rate in Messages before starting." />
      </ScrollView>
      {adminViewOnly ? null : <PublicProfileCta bottomInset={bottomInset} cta={withMessageHelper(cta)} />}
    </View>
  );
}

export function PublicClientProfileView({
  adminViewOnly = false,
  bottomInset,
  cta,
  onOpenJob,
  profile,
}: {
  adminViewOnly?: boolean;
  bottomInset: number;
  cta: ProfileCta;
  onOpenJob?: (jobId: string) => void;
  profile: PublicClientProfile;
}) {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(bottomInset, space.md) + (adminViewOnly ? space.xl : 116) },
        ]}
        showsVerticalScrollIndicator={false}>
        <PublicSummaryCard
          avatarUrl={profile.avatarUrl}
          location={profile.publicLocation}
          name={profile.fullName}
          roleLabel="Hiring"
          stats={[
            ratingStat(profile.averageRating, profile.reviewCount),
            { label: profile.reviewCount === 1 ? 'Review' : 'Reviews', value: String(profile.reviewCount) },
            { label: 'Hires', value: String(profile.completedHiresCount) },
            { label: 'Jobs posted', value: String(profile.jobsPostedCount) },
          ]}
          verified={Boolean(profile.barangayVerifiedAt || profile.verifiedAt)}
        />
        {adminViewOnly ? <AdminContextBanner /> : null}

        {profile.selectedJob ? (
          <Section title="Job you viewed">
            <JobContextCard job={profile.selectedJob} onPress={onOpenJob} />
          </Section>
        ) : null}

        {profile.activeJobs.length ? (
          <Section title={profile.selectedJob ? 'Other open jobs' : 'Open jobs'}>
            <View style={styles.cardList}>
              {profile.activeJobs.map((job) => (
                <JobSummaryCard key={job.id} job={job} onPress={onOpenJob} />
              ))}
            </View>
          </Section>
        ) : !profile.selectedJob ? (
          <Section title="Open jobs">
            <InlineEmpty icon="assignment" text="No open jobs right now." />
          </Section>
        ) : null}

        <Section title="How they hire">
          {profile.about ? <Text style={styles.bodyText}>{profile.about}</Text> : null}
          {profile.commonNeeds.length ? (
            <LimitedTagRow primary={displayService(profile.commonNeeds[0])} tags={profile.commonNeeds.slice(1)} />
          ) : null}
          <DetailRows
            rows={[
              { icon: 'chat-bubble-outline', text: profile.coordinationStyle || 'Coordination style to discuss' },
              { icon: 'schedule', text: profile.preferredSchedule || 'Schedule to coordinate' },
            ]}
          />
        </Section>

        <Section title="Reviews">
          {profile.reviews.length ? (
            <View style={styles.cardList}>
              {profile.reviews.slice(0, 3).map((review) => (
                <PublicReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : (
            <InlineEmpty icon="rate-review" text="No reviews yet. Reviews appear after completed jobs." />
          )}
        </Section>

        {profile.hiringHistory.length ? (
          <Section title="Hiring history">
            <View style={styles.cardList}>
              {profile.hiringHistory.map((item) => (
                <HistorySummaryCard item={item} key={item.id} fallbackTitle="Completed hire" />
              ))}
            </View>
          </Section>
        ) : null}

        <SafetyNote text="Payment and final agreement happen outside Konektado. Confirm scope, schedule, and budget in Messages before starting." />
      </ScrollView>
      {adminViewOnly ? null : <PublicProfileCta bottomInset={bottomInset} cta={withMessageHelper(cta)} />}
    </View>
  );
}

function CredentialCard({ credential }: { credential: CredentialSummary }) {
  return (
    <PublicCard>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {credential.title}
          </Text>
          <Text style={styles.cardMeta}>{credential.issuer || 'Approved trust booster'}</Text>
        </View>
        <MaterialIcons color="#2F7D32" name="verified" size={20} />
      </View>
    </PublicCard>
  );
}

function PublicReviewCard({ review }: { review: Review }) {
  return (
    <PublicCard>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{review.rating.toFixed(1)} rating</Text>
          <Text style={styles.cardMeta}>From {review.reviewer?.fullName ?? 'Resident'}</Text>
        </View>
        <MaterialIcons color={color.brandYellow} name="star" size={20} />
      </View>
      {review.comment ? (
        <Text numberOfLines={3} style={styles.bodyText}>{review.comment}</Text>
      ) : null}
      {review.jobContext ? (
        <DetailRows
          rows={[
            {
              icon: 'task-alt',
              text: `${review.jobContext.title} · ${formatShortDate(review.jobContext.completedAt)}`,
            },
          ]}
        />
      ) : null}
    </PublicCard>
  );
}

type SummaryStat = { label: string; value: string; star?: boolean };

/** "New" instead of a 0.0 rating, so an unreviewed resident is not read as badly rated. */
function ratingStat(averageRating: number | null, reviewCount: number): SummaryStat {
  if (averageRating === null || reviewCount === 0) return { label: 'Rating', value: 'New' };
  return { label: 'Rating', star: true, value: averageRating.toFixed(1) };
}

function InlineEmpty({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.inlineEmpty}>
      <MaterialIcons color={color.textMuted} name={icon} size={18} />
      <Text style={styles.inlineEmptyText}>{text}</Text>
    </View>
  );
}

function HistorySummaryCard({
  fallbackTitle,
  item,
}: {
  fallbackTitle: string;
  item: PublicProfileHistoryItem;
}) {
  return (
    <PublicCard>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {item.title || fallbackTitle}
          </Text>
          <Text style={styles.cardMeta}>{formatShortDate(item.completedAt)}</Text>
        </View>
        <MaterialIcons color={color.primary} name="task-alt" size={20} />
      </View>
      <DetailRows
        rows={[
          { icon: 'category', text: displayService(item.serviceLabel || item.category) || 'Marketplace work' },
          { icon: 'location-on', text: item.locationText || 'Barangay area' },
        ]}
      />
    </PublicCard>
  );
}

export function PublicProfileSkeleton({ bottomInset, showCta = true }: { bottomInset: number; showCta?: boolean }) {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(bottomInset, space.md) + (showCta ? 116 : space.xl) },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <SkeletonAvatar size={72} showPresence={false} />
            <View style={styles.summaryCopy}>
              <Skeleton height={20} width="62%" />
              <Skeleton height={14} width="70%" />
              <SkeletonChip height={26} width={132} />
            </View>
          </View>
          <View style={styles.statRow}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={index} style={styles.statCell}>
                <Skeleton height={18} width={36} />
                <Skeleton height={12} width={52} />
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Skeleton height={18} width={128} />
          <View style={styles.contextCard}>
            <Skeleton height={16} width="70%" />
            <Skeleton height={14} width="44%" />
            <SkeletonText lastLineWidth="64%" lines={2} />
          </View>
        </View>
      </ScrollView>
      {showCta ? (
        <View style={[styles.ctaBar, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
          <Skeleton height={12} width="90%" />
          <SkeletonChip height={42} width="100%" />
        </View>
      ) : null}
    </View>
  );
}

function PublicSummaryCard({
  avatarUrl,
  location,
  name,
  roleLabel,
  stats,
  verified,
}: {
  avatarUrl: string | null;
  location: string;
  name: string;
  roleLabel: string;
  stats: SummaryStat[];
  verified: boolean;
}) {
  const displayAvatarUrl = getAvatarDisplayUrl({ avatarUrl });

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.avatar}>
          {displayAvatarUrl ? (
            <CachedRemoteImage uri={displayAvatarUrl} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
          )}
        </View>
        <View style={styles.summaryCopy}>
          <Text numberOfLines={2} style={styles.name}>
            {name}
          </Text>
          <View style={styles.metaRow}>
            <MaterialIcons color={color.textMuted} name="location-on" size={15} />
            <Text numberOfLines={1} style={styles.metaText}>
              {location}
            </Text>
          </View>
          <View style={styles.badgeRow}>
            {verified ? (
              <View style={styles.verifiedBadge}>
                <MaterialIcons color="#2F7D32" name="verified" size={14} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Trust at a glance: the numbers a resident checks before messaging. */}
      <View style={styles.statRow}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={[styles.statCell, index > 0 && styles.statCellDivider]}>
            <View style={styles.statValueRow}>
              {stat.star ? <MaterialIcons color={color.accentYellow} name="star" size={16} /> : null}
              <Text numberOfLines={1} style={styles.statValue}>
                {stat.value}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.statLabel}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ServiceContextCard({
  service,
  onPress,
}: {
  service: ProviderService;
  onPress?: (serviceId: string) => void;
}) {
  return (
    <PublicCard onPress={onPress ? () => onPress(service.id) : undefined}>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {formatServicePostTitle({
              title: service.title,
              category: displayService(service.category),
            })}
          </Text>
          <Text style={styles.cardMeta}>{formatServiceRate(service)}</Text>
        </View>
        {onPress ? <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} /> : null}
      </View>
      <Text numberOfLines={3} style={styles.bodyText}>
        {service.description || service.availabilityText || 'Service details to coordinate.'}
      </Text>
      <DetailRows
        rows={[
          { icon: 'schedule', text: service.availabilityText || 'Schedule to coordinate' },
          { icon: 'location-on', text: getMarketplaceLocation(service) },
        ]}
      />
      <LimitedTagRow primary={displayService(service.category)} tags={service.tags} />
    </PublicCard>
  );
}

function ServiceSummaryCard({
  service,
  onPress,
}: {
  service: ProviderService;
  onPress?: (serviceId: string) => void;
}) {
  return (
    <PublicCard onPress={onPress ? () => onPress(service.id) : undefined}>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {service.title || displayService(service.category)}
          </Text>
          <Text style={styles.cardMeta}>{formatServiceRate(service)}</Text>
        </View>
        {onPress ? <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} /> : null}
      </View>
      <DetailRows
        rows={[
          { icon: 'schedule', text: service.availabilityText || 'Schedule to coordinate' },
          {
            icon: 'workspace-premium',
            text: service.certificationAvailable
              ? compactText(service.certificationNote) || 'Certification available'
              : 'Certification not listed',
          },
          { icon: 'trending-up', text: getExperienceLabel(service.experienceLevel) },
        ]}
      />
      <LimitedTagRow primary={displayService(service.category)} tags={service.tags} />
    </PublicCard>
  );
}

function JobContextCard({
  job,
  onPress,
}: {
  job: JobSummary;
  onPress?: (jobId: string) => void;
}) {
  return (
    <PublicCard onPress={onPress ? () => onPress(job.id) : undefined}>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {formatJobPostTitle({
              title: job.title,
              serviceNeeded: displayService(job.serviceNeeded),
              category: job.category,
            })}
          </Text>
          <Text style={styles.cardMeta}>{formatJobBudget(job)}</Text>
        </View>
        {onPress ? <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} /> : null}
      </View>
      <Text numberOfLines={3} style={styles.bodyText}>
        {job.description || 'Job details to coordinate.'}
      </Text>
      <DetailRows
        rows={[
          { icon: 'schedule', text: job.scheduleText || 'Schedule to coordinate' },
          { icon: 'location-on', text: getMarketplaceLocation(job) },
        ]}
      />
      <LimitedTagRow primary={displayService(job.serviceNeeded || job.category)} tags={job.tags} />
    </PublicCard>
  );
}

function JobSummaryCard({ job, onPress }: { job: JobSummary; onPress?: (jobId: string) => void }) {
  return (
    <PublicCard onPress={onPress ? () => onPress(job.id) : undefined}>
      <View style={styles.contextHeaderRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {job.title}
          </Text>
          <Text style={styles.cardMeta}>{formatJobBudget(job)}</Text>
        </View>
        {onPress ? <MaterialIcons color={color.textSubtle} name="chevron-right" size={20} /> : null}
      </View>
      <DetailRows
        rows={[
          { icon: 'schedule', text: job.scheduleText || 'Schedule to coordinate' },
          { icon: 'location-on', text: getMarketplaceLocation(job) },
        ]}
      />
      <LimitedTagRow primary={displayService(job.serviceNeeded || job.category)} tags={job.tags} />
    </PublicCard>
  );
}

function PublicCard({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.contextCard, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={styles.contextCard}>{children}</View>;
}

function DetailRows({ rows }: { rows: { icon: keyof typeof MaterialIcons.glyphMap; text: string }[] }) {
  return (
    <View style={styles.detailRows}>
      {rows.map((row) => (
        <View key={`${row.icon}-${row.text}`} style={styles.detailRow}>
          <MaterialIcons color={color.textSubtle} name={row.icon} size={15} />
          <Text numberOfLines={1} style={styles.detailText}>
            {row.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LimitedTagRow({ primary, tags }: { primary: string; tags: string[] }) {
  const secondary = Array.from(
    new Set(tags.map((tag) => displayService(tag)).filter((tag) => tag && tag !== primary)),
  );
  const visible = secondary.slice(0, 2);
  const hiddenCount = Math.max(0, secondary.length - visible.length);

  return (
    <View style={styles.tagRow}>
      {primary ? (
        <View style={styles.primaryTag}>
          <Text numberOfLines={1} style={styles.primaryTagText}>
            {primary}
          </Text>
        </View>
      ) : null}
      {visible.map((tag) => (
        <View key={tag} style={styles.secondaryTag}>
          <Text numberOfLines={1} style={styles.secondaryTagText}>
            {tag}
          </Text>
        </View>
      ))}
      {hiddenCount > 0 ? (
        <View style={styles.secondaryTag}>
          <Text style={styles.secondaryTagText}>+{hiddenCount} more</Text>
        </View>
      ) : null}
    </View>
  );
}

function SafetyNote({ text }: { text: string }) {
  return (
    <View style={styles.safetyNote}>
      <MaterialIcons color={color.primary} name="info-outline" size={18} />
      <Text style={styles.safetyText}>{text}</Text>
    </View>
  );
}

function PublicProfileCta({ bottomInset, cta }: { bottomInset: number; cta: ProfileCta }) {
  return (
    <View style={[styles.ctaBar, { paddingBottom: 12 + Math.max(bottomInset, 12) }]}>
      <Text style={styles.ctaHelper}>
        {cta.helper || 'Messages are for coordination. Final agreement happens outside Konektado.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: cta.disabled || cta.loading }}
        disabled={cta.disabled || cta.loading}
        onPress={cta.onPress}
        style={({ pressed }) => [
          styles.ctaButton,
          (cta.disabled || cta.loading) && styles.ctaDisabled,
          pressed && !cta.disabled && !cta.loading && styles.pressed,
        ]}>
        <MaterialIcons color={cta.disabled ? color.textMuted : color.text} name="chat-bubble" size={17} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[styles.ctaButtonText, cta.disabled && styles.ctaButtonTextDisabled]}>
          {cta.loading ? 'Opening...' : cta.label}
        </Text>
      </Pressable>
    </View>
  );
}

function withMessageHelper(cta: ProfileCta): ProfileCta {
  if (cta.helper) return cta;

  return {
    ...cta,
    helper: 'This resident prefers to coordinate through Konektado Messages first.',
  };
}

function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently completed';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayService(value: string | null | undefined) {
  return getDisplayLabelForMvpService(value) || compactText(value);
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'K';
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: space.lg,
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  content: {
    backgroundColor: color.background,
    gap: space['2xl'],
    padding: space.xl,
  },
  summaryCard: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.lg,
    padding: space.lg,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  summaryCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  name: {
    ...typography.screenTitle,
    color: color.text,
    fontSize: 21,
    lineHeight: 27,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    minWidth: 0,
  },
  metaText: {
    ...typography.body,
    color: color.textMuted,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: color.successSoft,
    borderColor: color.success,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 26,
    paddingHorizontal: space.sm,
  },
  verifiedText: {
    ...typography.captionMedium,
    color: color.text,
  },
  roleBadge: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: space.sm,
  },
  roleBadgeText: {
    ...typography.captionMedium,
    color: color.textMuted,
  },
  section: {
    gap: space.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
    fontSize: 17,
  },
  // Body copy is full-strength text; muted grey is reserved for metadata.
  bodyText: {
    ...typography.body,
    color: color.text,
  },
  skillsNote: {
    ...typography.caption,
    color: color.textMuted,
  },
  statRow: {
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: space.md,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: space['2xs'],
  },
  statCellDivider: {
    borderLeftColor: color.border,
    borderLeftWidth: 1,
  },
  statValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  statValue: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  statLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  inlineEmpty: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  inlineEmptyText: {
    ...typography.body,
    color: color.textMuted,
    flex: 1,
  },
  cardList: {
    gap: space.sm,
  },
  contextCard: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  contextHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  cardCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  cardMeta: {
    ...typography.bodyMedium,
    color: color.primaryText,
  },
  detailRows: {
    gap: space.xs,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  detailText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  primaryTag: {
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: space.sm,
  },
  primaryTagText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  secondaryTag: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: space.sm,
  },
  secondaryTagText: {
    ...typography.caption,
    color: color.textMuted,
  },
  safetyNote: {
    alignItems: 'flex-start',
    backgroundColor: color.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  safetyText: {
    ...typography.caption,
    color: color.textMuted,
    flex: 1,
  },
  ctaBar: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  ctaHelper: {
    ...typography.caption,
    color: color.textMuted,
  },
  // Primary action uses the Figma's yellow button with dark text (about 11:1).
  // The previous blue-on-pale-blue treatment was about 2.4:1.
  ctaButton: {
    alignItems: 'center',
    backgroundColor: color.accentYellow,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaDisabled: {
    backgroundColor: color.surfaceAlt,
  },
  ctaButtonText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  ctaButtonTextDisabled: {
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
