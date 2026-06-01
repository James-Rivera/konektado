import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
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
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
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
      <View style={styles.headerIcon} />
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
          roleLabel="Worker profile"
          verified={Boolean(profile.barangayVerifiedAt || profile.verifiedAt)}
        />
        {adminViewOnly ? <AdminContextBanner /> : null}

        {profile.selectedService ? (
          <Section title="Service you viewed">
            <ServiceContextCard service={profile.selectedService} onPress={onOpenService} />
          </Section>
        ) : null}

        <Section title="Trust and activity">
          <MetricGrid
            metrics={[
              { icon: 'star-border', label: 'Rating', value: formatRating(profile.averageRating, profile.reviewCount) },
              { icon: 'rate-review', label: 'Reviews', value: String(profile.reviewCount) },
              { icon: 'task-alt', label: 'Jobs done', value: String(profile.completedJobsCount) },
              { icon: 'schedule', label: 'Availability', value: shortValue(profile.availability) },
            ]}
          />
        </Section>

        {profile.about ? (
          <Section title="About">
            <Text style={styles.bodyText}>{profile.about}</Text>
          </Section>
        ) : null}

        <Section title="Capabilities">
          {profile.capabilities.length ? (
            <LimitedTagRow primary={displayService(profile.capabilities[0])} tags={profile.capabilities.slice(1)} />
          ) : (
            <EmptyPublicCard
              icon="handyman"
              message="This worker has not added capability categories yet."
              title="No capabilities listed"
            />
          )}
          {profile.serviceArea || profile.availability ? (
            <DetailRows
              rows={[
                { icon: 'location-on', text: profile.serviceArea || 'Service area to coordinate' },
                { icon: 'schedule', text: profile.availability || 'Availability to coordinate' },
              ]}
            />
          ) : null}
        </Section>

        <Section title="Credentials">
          {profile.credentials.length ? (
            <View style={styles.cardList}>
              {profile.credentials.slice(0, 3).map((credential) => (
                <CredentialCard credential={credential} key={credential.id} />
              ))}
            </View>
          ) : (
            <EmptyPublicCard
              icon="workspace-premium"
              message="Approved credentials and trust boosters will appear here."
              title="No public credentials yet"
            />
          )}
        </Section>

        <Section title="Worker reviews">
          {profile.reviews.length ? (
            <View style={styles.cardList}>
              {profile.reviews.slice(0, 3).map((review) => (
                <PublicReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : (
            <EmptyPublicCard
              icon="rate-review"
              message="Reviews appear after completed work."
              title="No worker reviews yet"
            />
          )}
        </Section>

        <Section title="Services Offered">
          {visibleServices.length ? (
            <View style={styles.cardList}>
              {visibleServices.map((service) => (
                <ServiceSummaryCard key={service.id} service={service} onPress={onOpenService} />
              ))}
            </View>
          ) : (
            <EmptyPublicCard
              icon="handyman"
              message="This worker has no other active services right now."
              title={profile.selectedService ? 'No other services' : 'No active services'}
            />
          )}
        </Section>

        <Section title="Safety note">
          <SafetyNote text="Payment and final agreement happen outside Konektado. Confirm schedule, exact location, and rate in Messages before starting." />
        </Section>
      </ScrollView>
      {adminViewOnly ? null : <PublicProfileCta bottomInset={bottomInset} cta={cta} />}
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
          roleLabel="Hiring profile"
          verified={Boolean(profile.barangayVerifiedAt || profile.verifiedAt)}
        />
        {adminViewOnly ? <AdminContextBanner /> : null}

        {profile.selectedJob ? (
          <Section title="Job you viewed">
            <JobContextCard job={profile.selectedJob} onPress={onOpenJob} />
          </Section>
        ) : null}

        <Section title="Trust and activity">
          <MetricGrid
            metrics={[
              { icon: 'star-border', label: 'Rating', value: formatRating(profile.averageRating, profile.reviewCount) },
              { icon: 'rate-review', label: 'Reviews', value: String(profile.reviewCount) },
              { icon: 'business-center', label: 'Jobs posted', value: String(profile.jobsPostedCount) },
              { icon: 'task-alt', label: 'Completed', value: String(profile.completedHiresCount) },
            ]}
          />
        </Section>

        {profile.about ? (
          <Section title="About">
            <Text style={styles.bodyText}>{profile.about}</Text>
          </Section>
        ) : null}

        <Section title="Hiring Style">
          {profile.commonNeeds.length ? (
            <LimitedTagRow primary={displayService(profile.commonNeeds[0])} tags={profile.commonNeeds.slice(1)} />
          ) : (
            <EmptyPublicCard
              icon="assignment"
              message="This client has not added common hiring needs yet."
              title="No common needs listed"
            />
          )}
          <DetailRows
            rows={[
              { icon: 'chat-bubble-outline', text: profile.coordinationStyle || 'Coordination style to discuss' },
              { icon: 'schedule', text: profile.preferredSchedule || 'Schedule to coordinate' },
            ]}
          />
        </Section>

        <Section title="Client reviews">
          {profile.reviews.length ? (
            <View style={styles.cardList}>
              {profile.reviews.slice(0, 3).map((review) => (
                <PublicReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : (
            <EmptyPublicCard
              icon="rate-review"
              message="Reviews from workers appear after completed hires."
              title="No client reviews yet"
            />
          )}
        </Section>

        <Section title="Job Posts">
          {profile.activeJobs.length ? (
            <View style={styles.cardList}>
              {profile.activeJobs.map((job) => (
                <JobSummaryCard key={job.id} job={job} onPress={onOpenJob} />
              ))}
            </View>
          ) : (
            <EmptyPublicCard
              icon="assignment"
              message="This client has no other active job posts right now."
              title={profile.selectedJob ? 'No other active jobs' : 'No active jobs'}
            />
          )}
        </Section>

        <Section title="Safety note">
          <SafetyNote text="Payment and final agreement happen outside Konektado. Confirm scope, schedule, and budget in Messages before starting." />
        </Section>
      </ScrollView>
      {adminViewOnly ? null : <PublicProfileCta bottomInset={bottomInset} cta={cta} />}
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
      <Text numberOfLines={3} style={styles.bodyText}>
        {review.comment || 'No written feedback.'}
      </Text>
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
          <SkeletonAvatar size={64} showPresence={false} />
          <View style={styles.summaryCopy}>
            <Skeleton height={20} width="62%" />
            <Skeleton height={14} width="70%" />
            <SkeletonChip height={26} width={132} />
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
        <View style={styles.section}>
          <Skeleton height={18} width={132} />
          <View style={styles.metricGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} borderRadius={radius.md} height={72} width="48%" />
            ))}
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
  verified,
}: {
  avatarUrl: string | null;
  location: string;
  name: string;
  roleLabel: string;
  verified: boolean;
}) {
  const displayAvatarUrl = getAvatarDisplayUrl({ avatarUrl });

  return (
    <View style={styles.summaryCard}>
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
          <MaterialIcons color={color.textSubtle} name="location-on" size={15} />
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

function MetricGrid({
  metrics,
}: {
  metrics: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }[];
}) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard}>
          <MaterialIcons
            color={metric.icon === 'star-border' ? color.brandYellow : color.primary}
            name={metric.icon}
            size={18}
          />
          <Text numberOfLines={1} style={styles.metricLabel}>
            {metric.label}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.metricValue}>
            {metric.value}
          </Text>
        </View>
      ))}
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

function EmptyPublicCard({
  icon,
  message,
  title,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  message: string;
  title: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <MaterialIcons color={color.textSubtle} name={icon} size={22} />
      <View style={styles.cardCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>{message}</Text>
      </View>
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
        <MaterialIcons color={cta.disabled ? color.textSubtle : color.primary} name="chat-bubble" size={17} />
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

function formatRating(averageRating: number | null, reviewCount: number) {
  if (averageRating && reviewCount > 0) return `${averageRating.toFixed(1)}`;
  return '-';
}

function shortValue(value: string | null | undefined) {
  const cleanValue = compactText(value);
  if (!cleanValue) return '-';
  return cleanValue.length > 16 ? 'Set' : cleanValue;
}

function compactText(value: string | null | undefined) {
  return value?.trim() ?? '';
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
    gap: space.xl,
    padding: space.xl,
  },
  summaryCard: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 64,
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
  },
  bodyText: {
    ...typography.body,
    color: color.textMuted,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  metricCard: {
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: space.xs,
    minHeight: 84,
    padding: space.md,
  },
  metricLabel: {
    ...typography.caption,
    color: color.textMuted,
  },
  metricValue: {
    ...typography.bodyMedium,
    color: color.text,
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
    ...typography.captionMedium,
    color: color.primary,
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
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  emptyMessage: {
    ...typography.caption,
    color: color.textMuted,
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
  ctaButton: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    minHeight: 42,
  },
  ctaDisabled: {
    backgroundColor: color.surfaceAlt,
  },
  ctaButtonText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  ctaButtonTextDisabled: {
    color: color.textSubtle,
  },
  pressed: {
    opacity: 0.72,
  },
});
