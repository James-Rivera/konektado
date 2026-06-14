import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import {
    EmptyProfilePanel,
    MetricStrip,
    ProfileCompletionCard,
    ProfileHero,
    ProfileHistoryCard,
    ProfileLoadingSkeleton,
    ProfilePillRow,
    ProfileSection,
    ProfileSegmentedControl,
    ProfileTopBar,
    ReviewCard,
    VerificationStatusPanel,
    type MetricItem,
    type ProfileMode,
} from '@/components/profile/ProfilePrimitives';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import { listClientHiringHistory } from '@/services/client-profile.service';
import { listMyCredentials } from '@/services/credential.service';
import { listMyJobs } from '@/services/job.service';
import {
    formatJobPostTitle,
    formatServicePostTitle,
    isPresenceActive,
} from '@/services/marketplace.helpers';
import { getProfileCompletionDestination } from '@/services/profile-completion-actions';
import { getMyProfileCompletion } from '@/services/profile-completion.service';
import { listClientReviews, listWorkerReviews } from '@/services/review.service';
import { listMyServices } from '@/services/service-profile.service';
import { listWorkerHistory } from '@/services/worker-profile.service';
import type {
    CredentialSummary,
    JobSummary,
    ProviderService,
    PublicProfileHistoryItem,
    Review,
} from '@/types/marketplace.types';
import type {
    ProfileCompletionAction,
    ProfileCompletionMode,
    ProfileCompletionStatus,
} from '@/types/profile.types';

export default function ProfileScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const topInset = useSafeTopInset();
  const [mode, setMode] = useState<ProfileMode>('work');
  const { profile, loading: profileLoading, version } = useProfile();
  const [completion, setCompletion] = useState<ProfileCompletionStatus | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [workHistory, setWorkHistory] = useState<PublicProfileHistoryItem[]>([]);
  const [hiringHistory, setHiringHistory] = useState<PublicProfileHistoryItem[]>([]);
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [workerReviews, setWorkerReviews] = useState<Review[]>([]);
  const [clientReviews, setClientReviews] = useState<Review[]>([]);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const hasLoadedProfileDataRef = useRef(false);

  useEffect(() => {
    if (profileLoading || !isFocused) return undefined;

    let active = true;
    const showBlockingLoader = !hasLoadedProfileDataRef.current;

    if (showBlockingLoader) {
      setDataLoading(true);
    }
    setLoadError(null);

    Promise.all([
      getMyProfileCompletion(),
      listMyJobs(),
      listMyServices(),
      listMyCredentials(),
      profile?.id ? listWorkerReviews(profile.id) : Promise.resolve({ data: [], error: null } as const),
      profile?.id ? listClientReviews(profile.id) : Promise.resolve({ data: [], error: null } as const),
      profile?.id ? listWorkerHistory(profile.id) : Promise.resolve({ data: [], error: null } as const),
      profile?.id ? listClientHiringHistory(profile.id) : Promise.resolve({ data: [], error: null } as const),
    ])
      .then(([
        completionResult,
        jobResult,
        serviceResult,
        credentialResult,
        workerReviewResult,
        clientReviewResult,
        workHistoryResult,
        hiringHistoryResult,
      ]) => {
        if (!active) return;

        if (completionResult.error || !completionResult.data) {
          setCompletion(null);
          setLoadError(completionResult.error ?? 'Could not load your profile details.');
        } else {
          setCompletion(completionResult.data);
        }

        setJobs(jobResult.error || !jobResult.data ? [] : jobResult.data);
        setServices(serviceResult.error || !serviceResult.data ? [] : serviceResult.data);
        setCredentials(credentialResult.error || !credentialResult.data ? [] : credentialResult.data);
        setWorkerReviews(workerReviewResult.error || !workerReviewResult.data ? [] : [...workerReviewResult.data]);
        setClientReviews(clientReviewResult.error || !clientReviewResult.data ? [] : [...clientReviewResult.data]);
        setWorkHistory(workHistoryResult.error || !workHistoryResult.data ? [] : [...workHistoryResult.data]);
        setHiringHistory(hiringHistoryResult.error || !hiringHistoryResult.data ? [] : [...hiringHistoryResult.data]);
      })
      .catch(() => {
        if (active) {
          setLoadError('Could not refresh your profile right now.');
        }
      })
      .finally(() => {
        if (active) {
          hasLoadedProfileDataRef.current = true;
          if (showBlockingLoader) {
            setDataLoading(false);
          }
        }
      });

    return () => {
      active = false;
    };
  }, [isFocused, profile?.id, profileLoading, version]);

  const displayName =
    profile?.full_name ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident';
  const publicLocation = [profile?.barangay, profile?.city].filter(Boolean).join(', ') || 'Location not set';
  const isVerified = Boolean(completion?.isVerified || profile?.barangay_verified_at || profile?.verified_at);
  const activeCompletion = mode === 'work' ? completion?.workCompletion : completion?.hiringCompletion;
  const heroCompletion = completion && !completion.coreComplete ? completion.coreCompletion : activeCompletion;
  const modeAvailability = mode === 'work' ? completion?.work.availability : completion?.hiring.preferredSchedule;
  const metrics = mode === 'work'
    ? getWorkMetrics({ completion, reviews: workerReviews, services })
    : getHiringMetrics({ jobs, reviews: clientReviews });
  const isLoading = profileLoading || dataLoading;

  const openCompletion = (nextMode: ProfileCompletionMode) => {
    router.push({
      pathname: '/profile/complete' as never,
      params: { mode: nextMode },
    });
  };

  const openProfileAction = (action: ProfileCompletionAction) => {
    const destination = getProfileCompletionDestination(action);

    if (destination.type === 'message') {
      Alert.alert(destination.title, destination.message);
      return;
    }

    router.push({
      pathname: destination.pathname as never,
      params: destination.params,
    });
  };

  return (
    <View style={styles.screen}>
      <ProfileTopBar onSettings={() => router.push('/profile/settings')} topInset={topInset} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, space.sm) + 96 }]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ProfileLoadingSkeleton />
        ) : (
          <>
            <ProfileSegmentedControl mode={mode} onChange={setMode} />

            {loadError ? (
              <View style={styles.errorBand}>
                <MaterialIcons color={color.warning} name="warning-amber" size={18} />
                <Text style={styles.errorText}>{loadError}</Text>
              </View>
            ) : null}

            <ProfileHero
              avatarUrl={completion?.core.avatarUrl ?? profile?.avatar_url}
              badgeIcon={getVerificationBadgeIcon(completion)}
              badgeLabel={completion?.verification.label ?? (isVerified ? 'Verified' : 'Verification needed')}
              badgeTone={isVerified ? 'success' : 'warning'}
              initials={getInitials(displayName)}
              location={publicLocation}
              name={displayName}
              onAddPhoto={() =>
                openProfileAction({
                  id: 'profile-photo',
                  kind: 'add_profile_photo',
                  label: 'Add profile photo',
                  mode: 'core',
                  optional: true,
                })
              }
              onEdit={() => setQuickActionsVisible(true)}
              photoRecommended={Boolean(completion?.photoRecommended ?? !profile?.avatar_url)}
              presenceActive={isPresenceActive(modeAvailability)}
              stepsLabel={getModeStepsLabel(heroCompletion)}>
              <MetricStrip items={metrics} />
            </ProfileHero>

            <ProfileSection title="Marketplace">
              <ProfileHistoryCard
                description="Return to jobs and services you bookmarked."
                footerLeft="Private to you"
                footerRight="Jobs and services"
                meta="Saved posts"
                onPress={() => router.push('/saved' as never)}
                title="Saved Posts"
              />
            </ProfileSection>

            {mode === 'work' ? (
              <WorkProfileContent
                completion={completion}
                credentials={credentials}
                history={workHistory}
                onAction={openProfileAction}
                reviews={workerReviews}
                services={services}
                onAddCredential={() =>
                  openProfileAction({
                    id: 'credentials',
                    kind: 'add_credential',
                    label: 'Add credential',
                    mode: 'work',
                    optional: true,
                  })
                }
                onManageServices={() => router.push('/post/active')}
                onOpenService={(serviceId) =>
                  router.push({ pathname: '/services/[serviceId]', params: { serviceId } })
                }
              />
            ) : (
              <HiringProfileContent
                completion={completion}
                history={hiringHistory}
                jobs={jobs}
                onAction={openProfileAction}
                reviews={clientReviews}
                onCompleteHiring={() => openCompletion('hiring')}
                onManagePosts={() => router.push('/post/active')}
                onOpenJob={(jobId) => router.push({ pathname: '/job/[jobId]', params: { jobId } })}
              />
            )}
          </>
        )}
      </ScrollView>
      <ProfileQuickActionsSheet
        mode={mode}
        onClose={() => setQuickActionsVisible(false)}
        onSettings={() => {
          setQuickActionsVisible(false);
          router.push('/profile/settings');
        }}
        onUpdatePhoto={() => {
          setQuickActionsVisible(false);
          openProfileAction({
            id: 'profile-photo',
            kind: 'add_profile_photo',
            label: 'Update profile picture',
            mode: 'core',
            optional: true,
          });
        }}
        onViewPublicProfile={() => {
          setQuickActionsVisible(false);
          if (!profile?.id) {
            Alert.alert('Public profile', 'Sign in again to preview your public profile.');
            return;
          }

          if (mode === 'work') {
            router.push({ pathname: '/worker/[workerId]' as never, params: { workerId: profile.id } });
            return;
          }

          router.push({ pathname: '/client/[clientId]' as never, params: { clientId: profile.id } });
        }}
        visible={quickActionsVisible}
      />
    </View>
  );
}

function ProfileQuickActionsSheet({
  mode,
  onClose,
  onSettings,
  onUpdatePhoto,
  onViewPublicProfile,
  visible,
}: {
  mode: ProfileMode;
  onClose: () => void;
  onSettings: () => void;
  onUpdatePhoto: () => void;
  onViewPublicProfile: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet maxHeight="46%" onClose={onClose} visible={visible}>
      <View style={styles.quickSheetHeader}>
        <Text style={styles.quickSheetTitle}>Profile actions</Text>
        <Text style={styles.quickSheetSubtitle}>Update how neighbors see your public profile.</Text>
      </View>
      <View style={styles.quickActionList}>
        <QuickActionRow
          icon="photo-camera"
          label="Update profile picture"
          subtitle="Use a clear public photo"
          onPress={onUpdatePhoto}
        />
        <QuickActionRow
          icon="visibility"
          label="View public profile"
          subtitle={mode === 'work' ? 'Preview your public worker profile' : 'Preview your public hiring profile'}
          onPress={onViewPublicProfile}
        />
        <QuickActionRow
          icon="settings"
          label="Settings"
          subtitle="Account, setup, credentials, and logout"
          onPress={onSettings}
        />
      </View>
    </BottomSheet>
  );
}

function QuickActionRow({
  icon,
  label,
  onPress,
  subtitle,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  subtitle: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickActionRow, pressed && styles.pressed]}>
      <View style={styles.quickActionIcon}>
        <MaterialIcons color={color.verificationBlue} name={icon} size={21} />
      </View>
      <View style={styles.quickActionCopy}>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons color={color.textSubtle} name="chevron-right" size={22} />
    </Pressable>
  );
}

function WorkProfileContent({
  completion,
  credentials,
  history,
  onAction,
  onAddCredential,
  onManageServices,
  onOpenService,
  reviews,
  services,
}: {
  completion: ProfileCompletionStatus | null;
  credentials: CredentialSummary[];
  history: PublicProfileHistoryItem[];
  onAction: (action: ProfileCompletionAction) => void;
  onAddCredential: () => void;
  onManageServices: () => void;
  onOpenService: (serviceId: string) => void;
  reviews: Review[];
  services: ProviderService[];
}) {
  const skillLabels = uniqueList([
    ...(completion?.work.offeredServices ?? []),
    ...(completion?.work.customOfferedServices ?? []),
  ]);
  const work = completion?.work;
  const activeServices = services.filter((service) => service.isActive);

  return (
    <>
      <ProfileSection title="Complete profile">
        {shouldShowVerificationPanel(completion) ? (
          <VerificationStatusPanel status={completion.verification} onAction={onAction} />
        ) : null}
        {completion && !completion.coreComplete ? (
          <ProfileCompletionCard completion={completion.coreCompletion} mode="core" onAction={onAction} />
        ) : completion?.workCompletion ? (
          <ProfileCompletionCard completion={completion.workCompletion} mode="work" onAction={onAction} />
        ) : null}
      </ProfileSection>

      <ProfileSection title="About My Work">
        {work?.headline || work?.bio ? (
          <ProfileHistoryCard
            description={work.bio || 'Add a short work bio so clients know how you generally work.'}
            footerLeft="Work Profile"
            footerRight={work.headline ? 'Summary set' : 'Intro set'}
            meta="Work Profile"
            title={work.headline || 'About my work'}
          />
        ) : (
          <EmptyProfilePanel
            icon="badge"
            message="Add a flexible work summary. Pricing and service-specific requirements belong in Service Listings."
            title="No work summary yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Skills">
        {skillLabels.length ? (
          <ProfilePillRow values={skillLabels} />
        ) : (
          <EmptyProfilePanel
            icon="handyman"
            message="Add the things you know how to do. Skills are separate from active service listings."
            title="No skills yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Experience">
        <ProfileHistoryCard
          description="Experience grows through completed work, credentials, and worker reviews."
          footerLeft={`${history.length} completed ${history.length === 1 ? 'work item' : 'work items'}`}
          footerRight={`${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`}
          meta="Trust summary"
          title="Work experience"
        />
      </ProfileSection>

      <ProfileSection title="Credentials" onAdd={onAddCredential}>
        {credentials.length ? (
          credentials.slice(0, 3).map((credential) => (
            <ProfileHistoryCard
              description={credential.issuer ? `Issued by ${credential.issuer}` : 'Optional trust proof'}
              footerRight={formatCredentialStatus(credential.status)}
              key={credential.id}
              meta="Trust booster"
              rightLabel={formatShortDate(credential.createdAt)}
              title={credential.title}
            />
          ))
        ) : (
          <EmptyProfilePanel
            icon="workspace-premium"
            message="Optional: add certificates or proof of training to build more trust."
            title="No credentials yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Usual Availability">
        {work?.availability ? (
          <ProfileHistoryCard
            description={work.availability}
            footerLeft="Profile default"
            footerRight="Can vary by listing"
            meta="Used only as a starting point for new listings"
            title="Usual availability"
          />
        ) : (
          <EmptyProfilePanel
            icon="schedule"
            message="Add when you are usually available. Each Service Listing can still set its own availability."
            title="No usual availability yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Usual Service Area">
        {work?.serviceArea ? (
          <ProfileHistoryCard
            description={work.serviceArea}
            footerLeft="Profile default"
            footerRight="Can vary by listing"
            meta="Used only as a starting point for new listings"
            title="Usual service area"
          />
        ) : (
          <EmptyProfilePanel
            icon="location-on"
            message="Add the area where you usually work. Each Service Listing can still use its own service area."
            title="No usual service area yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Worker Reviews">
        {reviews.length ? (
          reviews.slice(0, 3).map((review) => (
            <ReviewCard
              author={review.reviewer?.fullName ?? 'Resident'}
              body={review.comment || 'No written feedback.'}
              dateLabel={formatShortDate(review.createdAt)}
              key={review.id}
              rating={review.rating.toFixed(1)}
              title="Client feedback"
            />
          ))
        ) : (
          <EmptyProfilePanel
            icon="rate-review"
            message="Reviews appear after completed work."
            title="No worker reviews yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Work History">
        {history.length ? (
          history.slice(0, 4).map((item) => (
            <ProfileHistoryCard
              description={item.serviceLabel || item.category || 'Completed marketplace work'}
              footerLeft={item.locationText || 'Barangay area'}
              footerRight="Completed"
              key={item.id}
              meta="Completed work"
              rightLabel={formatShortDate(item.completedAt)}
              title={item.title}
            />
          ))
        ) : (
          <EmptyProfilePanel
            icon="work-history"
            message="Completed work will appear here after marketplace jobs are finished."
            title="No work history yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Services Offered">
        {activeServices.length ? (
          <>
            {activeServices.slice(0, 3).map((service) => (
              <ProfileHistoryCard
                description={service.description || service.availabilityText}
                footerLeft={service.locationText ?? service.barangay ?? 'Location to coordinate'}
                footerRight="Active"
                key={service.id}
                meta="Active service listing"
                onPress={() => onOpenService(service.id)}
                rightLabel={formatShortDate(service.createdAt)}
                title={formatServicePostTitle({
                  title: service.title,
                  category: service.category,
                })}
              />
            ))}
            <ProfileHistoryCard
              description="Open Post Dashboard when you need to manage service listings."
              footerLeft="Post Dashboard"
              footerRight="Service listings"
              meta="Post Dashboard"
              onPress={onManageServices}
              title="Open Post Dashboard"
            />
          </>
        ) : (
          <EmptyProfilePanel
            icon="work-history"
            message="Active service listings will appear here. Open Post Dashboard for listing management."
            title="No active services offered"
          />
        )}
      </ProfileSection>
    </>
  );
}

function HiringProfileContent({
  completion,
  history,
  jobs,
  onAction,
  onCompleteHiring,
  onManagePosts,
  onOpenJob,
  reviews,
}: {
  completion: ProfileCompletionStatus | null;
  history: PublicProfileHistoryItem[];
  jobs: JobSummary[];
  onAction: (action: ProfileCompletionAction) => void;
  onCompleteHiring: () => void;
  onManagePosts: () => void;
  onOpenJob: (jobId: string) => void;
  reviews: Review[];
}) {
  const neededServices = uniqueList([
    ...(completion?.hiring.neededServices ?? []),
    ...(completion?.hiring.customNeededServices ?? []),
  ]);
  const activeJobs = jobs.filter((job) => ['open', 'reviewing'].includes(job.status));
  const hiring = completion?.hiring;

  return (
    <>
      <ProfileSection title="Complete profile">
        {shouldShowVerificationPanel(completion) ? (
          <VerificationStatusPanel status={completion.verification} onAction={onAction} />
        ) : null}
        {completion && !completion.coreComplete ? (
          <ProfileCompletionCard completion={completion.coreCompletion} mode="core" onAction={onAction} />
        ) : completion?.hiringCompletion ? (
          <ProfileCompletionCard completion={completion.hiringCompletion} mode="hiring" onAction={onAction} />
        ) : null}
      </ProfileSection>

      <ProfileSection title="Hiring Introduction" onEdit={onCompleteHiring}>
        {hiring?.headline || hiring?.bio ? (
          <ProfileHistoryCard
            description={hiring.bio || 'Add a short intro so workers know what kind of client you are.'}
            footerLeft="Hiring Profile"
            footerRight={hiring.headline ? 'Summary set' : 'Intro set'}
            meta="Hiring Profile"
            title={hiring.headline || 'Hiring introduction'}
          />
        ) : (
          <EmptyProfilePanel
            icon="assignment-ind"
            message="Add a hiring intro. Specific job requirements belong in Job Posts."
            title="No hiring summary yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Usually Hires For / Common Needs" onEdit={onCompleteHiring}>
        {neededServices.length ? (
          <ProfilePillRow values={neededServices} />
        ) : (
          <EmptyProfilePanel
            icon="assignment"
            message="Add the broad categories you usually hire for. These are not active job posts."
            title="No common needs yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Coordination Style" onEdit={onCompleteHiring}>
        {hiring?.coordinationStyle ? (
          <ProfileHistoryCard
            description={hiring.coordinationStyle}
            footerLeft="Profile default"
            footerRight="Can vary by job"
            meta="Used only as a starting point for new job posts"
            title="Coordination style"
          />
        ) : (
          <EmptyProfilePanel
            icon="chat-bubble-outline"
            message="Add how you usually coordinate with workers. Each Job Post can still use its own details."
            title="No coordination style yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Preferred Coordination Time" onEdit={onCompleteHiring}>
        {hiring?.preferredSchedule ? (
          <ProfileHistoryCard
            description={hiring.preferredSchedule}
            footerLeft="Profile default"
            footerRight="Can vary by job"
            meta="Used only as a starting point for new job posts"
            title="Preferred coordination time"
          />
        ) : (
          <EmptyProfilePanel
            icon="schedule"
            message="Add when you usually coordinate with workers. Each Job Post can still set its own schedule."
            title="No preferred time yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Client Reviews">
        {reviews.length ? (
          reviews.slice(0, 3).map((review) => (
            <ReviewCard
              author={review.reviewer?.fullName ?? 'Resident'}
              body={review.comment || 'No written feedback.'}
              dateLabel={formatShortDate(review.createdAt)}
              key={review.id}
              rating={review.rating.toFixed(1)}
              title="Worker feedback"
            />
          ))
        ) : (
          <EmptyProfilePanel
            icon="rate-review"
            message="Worker reviews appear after completed marketplace interactions."
            title="No worker reviews yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Hiring History">
        {history.length ? (
          history.slice(0, 4).map((item) => (
            <ProfileHistoryCard
              description={item.serviceLabel || item.category || 'Completed marketplace hire'}
              footerLeft={item.locationText || 'Barangay area'}
              footerRight="Completed"
              key={item.id}
              meta="Completed hire"
              rightLabel={formatShortDate(item.completedAt)}
              title={item.title}
            />
          ))
        ) : (
          <EmptyProfilePanel
            icon="history"
            message="Completed hires will appear here after marketplace jobs are finished."
            title="No hiring history yet"
          />
        )}
      </ProfileSection>

      <ProfileSection title="Job Posts">
        {activeJobs.length ? (
          <>
            {activeJobs.slice(0, 4).map((job) => (
              <ProfileHistoryCard
                description={job.description}
                footerLeft={job.locationText ?? job.barangay ?? 'Location to coordinate'}
                footerRight={job.acceptedProviderId ? 'Worker hired' : formatWorkersNeeded(job)}
                key={job.id}
                meta={`Active job post - ${formatJobStatus(job.status)}`}
                onPress={() => onOpenJob(job.id)}
                rightLabel={formatShortDate(job.createdAt)}
                title={formatJobPostTitle({
                  title: job.title,
                  serviceNeeded: job.serviceNeeded,
                  category: job.category,
                })}
              />
            ))}
            <ProfileHistoryCard
              description="Open Post Dashboard when you need to manage job posts."
              footerLeft="Post Dashboard"
              footerRight="Job posts"
              meta="Post Dashboard"
              onPress={onManagePosts}
              title="Open Post Dashboard"
            />
          </>
        ) : (
          <EmptyProfilePanel
            icon="history"
            message="Active job posts will appear here. Open Post Dashboard for post management."
            title="No active job posts"
          />
        )}
      </ProfileSection>
    </>
  );
}

function getWorkMetrics({
  completion,
  reviews,
  services,
}: {
  completion: ProfileCompletionStatus | null;
  reviews: Review[];
  services: ProviderService[];
}): MetricItem[] {
  return [
    { icon: 'star', label: 'Rating', value: formatAverageRating(reviews) },
    { icon: 'rate-review', label: 'Reviews', value: String(reviews.length) },
    { icon: 'handyman', label: 'Offered', value: String(services.filter((service) => service.isActive).length) },
    { icon: 'schedule', label: 'Availability', value: shortMetricText(completion?.work.availability) },
  ];
}

function getHiringMetrics({
  jobs,
  reviews,
}: {
  jobs: JobSummary[];
  reviews: Review[];
}): MetricItem[] {
  const openJobs = jobs.filter((job) => ['open', 'reviewing', 'in_progress'].includes(job.status));

  return [
    { icon: 'star', label: 'Client rating', value: formatAverageRating(reviews) },
    { icon: 'groups', label: 'Hired', value: String(jobs.filter((job) => job.acceptedProviderId).length) },
    { icon: 'business-center', label: 'Jobs posted', value: String(jobs.length) },
    { icon: 'assignment', label: 'Open jobs', value: String(openJobs.length) },
  ];
}

function getVerificationBadgeIcon(completion: ProfileCompletionStatus | null) {
  if (completion?.verification.status === 'approved') return 'verified';
  if (completion?.verification.status === 'pending') return 'schedule';
  return 'warning-amber';
}

function shouldShowVerificationPanel(completion: ProfileCompletionStatus | null): completion is ProfileCompletionStatus {
  return Boolean(completion?.verification && completion.verification.status !== 'approved');
}

function getModeStepsLabel(completion: ProfileCompletionStatus['workCompletion'] | undefined) {
  if (!completion) return 'Not set up';
  if (completion.state === 'not_set_up') return 'Not set up';
  return `${completion.completedSteps}/${completion.totalSteps}`;
}

function formatCredentialStatus(status: CredentialSummary['status']) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Needs update';
  return 'Pending review';
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

function formatAverageRating(reviews: Review[]) {
  if (!reviews.length) return '-';
  return (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';

  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatJobStatus(status: JobSummary['status']) {
  return status
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function formatWorkersNeeded(job: JobSummary) {
  if (!job.workersNeeded) return 'Open';
  return `${job.workersNeeded} ${job.workersNeeded === 1 ? 'worker' : 'workers'}`;
}

function shortMetricText(value: string | null | undefined) {
  const cleanValue = value?.trim();
  if (!cleanValue) return '-';
  if (cleanValue.length <= 10) return cleanValue;
  return 'Set';
}

function uniqueList(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  content: {
    backgroundColor: color.background,
    gap: 3,
  },
  errorBand: {
    alignItems: 'flex-start',
    backgroundColor: color.warningSoft,
    flexDirection: 'row',
    gap: space.sm,
    marginHorizontal: space.xl,
    padding: space.md,
  },
  errorText: {
    ...typography.caption,
    color: color.warning,
    flex: 1,
  },
  quickSheetHeader: {
    gap: space.xs,
  },
  quickSheetTitle: {
    ...typography.sectionTitle,
    color: color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  quickSheetSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  quickActionList: {
    gap: space.sm,
  },
  quickActionRow: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  quickActionIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  quickActionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  quickActionLabel: {
    ...typography.bodyMedium,
    color: color.text,
  },
  quickActionSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
