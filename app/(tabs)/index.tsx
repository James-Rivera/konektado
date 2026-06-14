import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    HomeFilterPill,
    HomeFilterTabs,
    HomeSectionHeader,
    HomeSetupNudge,
    HomeTopHeader,
} from '@/components/home/HomeDashboardUI';
import { HomeFeedFiltersSheet } from '@/components/home/HomeFeedFiltersSheet';
import { EmptyState } from '@/components/EmptyState';
import { useFeedback } from '@/components/FeedbackProvider';
import { HomeFeedCard, type HomeFeedCardProps } from '@/components/home/HomeFeedCard';
import { homeFilters, type HomeFilter } from '@/constants/demo-data';
import { getDisplayLabelForMvpService } from '@/constants/service-taxonomy';
import { color, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useSavedPosts } from '@/hooks/use-saved-posts';
import { useSafeTopInset } from '@/hooks/use-safe-top-inset';
import {
  compactText,
  formatJobBudget,
  formatClientJobsPostedText,
  formatClientRatingText,
  formatJobPostTitle,
  formatRelativeMarketplaceDate,
  formatServiceJobsDoneText,
  formatServicePostTitle,
  formatServiceRate,
  formatServiceRatingText,
  getPublicProfileAvatarUrl,
  getMarketplaceLocation,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import { searchJobs } from '@/services/job.service';
import { getMyUserPreferences } from '@/services/onboarding.service';
import { getUnreadNotificationCount } from '@/services/notification.service';
import { searchServices } from '@/services/service-profile.service';
import {
  DEFAULT_HOME_FEED_FILTERS,
  applyHomeFeedFilters,
  getHomeFeedFilterCount,
  getDefaultHomeFilter,
  type HomeFeedFilters,
  type HomeFeedType,
  resolveHomeFeedMode,
} from '@/services/home-feed.service';
import { getProfileCompletionDestination } from '@/services/profile-completion-actions';
import { getMyProfileCompletion } from '@/services/profile-completion.service';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';
import type {
  ProfileCompletionAction,
  ProfileCompletionMode,
  ProfileCompletionStatus,
} from '@/types/profile.types';
import { getCardImageUrl } from '@/utils/image-processing';

type HomeJobFeedItem = {
  key: string;
  type: 'job';
  itemId: string;
  cardProps: HomeFeedCardProps;
  createdAt: string;
  job: JobSummary;
};

type HomeWorkerFeedItem = {
  key: string;
  type: 'worker';
  itemId: string;
  cardProps: HomeFeedCardProps;
  createdAt: string;
  service: ServiceSearchResult;
};

type HomeFeedItem = HomeJobFeedItem | HomeWorkerFeedItem;
type HomeFeedSources = { jobs: HomeJobFeedItem[]; workers: HomeWorkerFeedItem[] };

const HOME_FEED_LIMIT = 30;
const HOME_FEED_CACHE_TTL_MS = 60 * 1000;

let homeFeedCache:
  | {
      loadedAt: number;
      sources: HomeFeedSources;
      userId: string | null;
    }
  | null = null;
let homeFeedInFlight:
  | {
      promise: Promise<HomeFeedSources>;
      userId: string | null;
    }
  | null = null;

function mapHomeFilterToFeedType(filter: HomeFilter): HomeFeedType {
  if (filter === 'Jobs') return 'jobs';
  if (filter === 'Services') return 'services';
  return 'all';
}

function mapFeedTypeToHomeFilter(feedType: HomeFeedType): HomeFilter {
  if (feedType === 'jobs') return 'Jobs';
  if (feedType === 'services') return 'Services';
  return 'For you';
}

function mapJobToHomeFeedCard(job: JobSummary): HomeFeedCardProps {
  const category = compactText(job.category) || 'Job';
  const serviceNeeded = compactText(job.serviceNeeded);
  const displayServiceNeeded = compactText(getDisplayLabelForMvpService(job.serviceNeeded));
  const schedule = compactText(job.scheduleText) || 'Schedule to coordinate';
  const posterName = compactText(job.client?.fullName) || 'Konektado resident';
  const displayCategory = displayServiceNeeded || category;

  return {
    kind: 'job',
    name: posterName,
    label: 'Posted a job',
    postedAt: formatRelativeMarketplaceDate(job.createdAt).replace(/^Posted /, ''),
    detailLine: `${formatJobBudget(job)} - ${schedule}`,
    title: formatJobPostTitle({
      title: job.title,
      serviceNeeded: displayServiceNeeded || job.serviceNeeded,
      category: displayCategory,
      cue: serviceNeeded ? 'needHelpWith' : 'lookingFor',
    }),
    description: job.description || 'No description provided yet.',
    meta: [
      { icon: 'star-border', text: formatClientRatingText(job) },
      { icon: 'work', text: formatClientJobsPostedText(job) },
      { icon: 'location-on', text: getMarketplaceLocation(job) },
    ],
    tags: Array.from(
      new Set(
        [displayCategory, displayServiceNeeded, ...job.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag)].filter(Boolean),
      ),
    ),
    primaryActionLabel: 'View Job',
    avatarUrl: job.client?.avatarUrl,
    imageUrl: getCardImageUrl({ imageUrl: job.photoUrls[0] }),
    isOnline: isPresenceActive(job.client?.availability),
  };
}

function mapServiceToHomeFeedCard(service: ServiceSearchResult): HomeFeedCardProps {
  const category = compactText(getDisplayLabelForMvpService(service.category)) || compactText(service.category) || 'Service';
  const serviceTitle =
    service.category === 'Basic home repair' && compactText(service.title) === 'Basic home repair help'
      ? 'Minor home fix support'
      : compactText(service.title) || category;
  const providerName = compactText(service.provider?.fullName) || 'Konektado resident';
  const availability = compactText(service.availabilityText) || 'Available to coordinate';

  return {
    kind: 'worker',
    name: providerName,
    label: 'Posted a service',
    postedAt: formatRelativeMarketplaceDate(service.createdAt).replace(/^Posted /, ''),
    detailLine: `${formatServiceRate(service)} - ${availability}`,
    title: formatServicePostTitle({
      title: serviceTitle,
      category: service.category,
      cue: service.isActive ? 'availableFor' : 'offers',
    }),
    description:
      service.description && compactText(service.description) !== serviceTitle
        ? service.description
        : '',
    meta: [
      { icon: 'star-border', text: formatServiceRatingText(service) },
      { icon: 'check-circle', text: formatServiceJobsDoneText(service, service.completedJobsCount) },
      { icon: 'location-on', text: getMarketplaceLocation(service) },
    ],
    tags: Array.from(new Set([category, ...service.tags.map((tag) => getDisplayLabelForMvpService(tag) || tag)].filter(Boolean))),
    primaryActionLabel: 'View Profile',
    avatarUrl: getPublicProfileAvatarUrl(service.provider),
    imageUrl: getCardImageUrl({ imageUrl: service.photoUrls[0] }),
    isOnline: isPresenceActive(service.isActive && (service.availabilityText || service.provider?.availability || true)),
  };
}

function loadHomeFeedSources(userId: string | null) {
  if (homeFeedInFlight && homeFeedInFlight.userId === userId) {
    return homeFeedInFlight.promise;
  }

  const promise = Promise.all([
    searchJobs({ limit: HOME_FEED_LIMIT }),
    searchServices({ limit: HOME_FEED_LIMIT }),
  ]).then(([jobsResult, servicesResult]) => {
    if (jobsResult.error || servicesResult.error) {
      throw new Error(jobsResult.error ?? servicesResult.error ?? 'Could not load posts right now.');
    }

    const jobs =
      jobsResult.data?.map((job) => ({
        key: `job-${job.id}`,
        type: 'job' as const,
        itemId: job.id,
        cardProps: mapJobToHomeFeedCard(job),
        createdAt: job.createdAt,
        job,
      })) ?? [];

    const workers =
      servicesResult.data?.map((service) => ({
        key: `service-${service.id}`,
        type: 'worker' as const,
        itemId: service.id,
        cardProps: mapServiceToHomeFeedCard(service),
        createdAt: service.createdAt,
        service,
      })) ?? [];

    return { jobs, workers };
  }).finally(() => {
    if (homeFeedInFlight?.promise === promise) {
      homeFeedInFlight = null;
    }
  });

  homeFeedInFlight = { promise, userId };
  return promise;
}

export default function HomeScreen() {
  const router = useRouter();
  const { showErrorToast, showInfoToast, showSuccessToast } = useFeedback();
  const isFocused = useIsFocused();
  const { profile, loading: profileLoading, version } = useProfile();
  const { isPending, isSaved, refreshSavedPosts, toggleSaved } = useSavedPosts();
  const topInset = useSafeTopInset();
  const isVerified = Boolean(profile?.barangay_verified_at || profile?.verified_at);
  const [selectedFilter, setSelectedFilter] = useState<HomeFilter>('For you');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [feedSources, setFeedSources] = useState<{ jobs: HomeJobFeedItem[]; workers: HomeWorkerFeedItem[] }>({
    jobs: [],
    workers: [],
  });
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [optionalSetupDismissed, setOptionalSetupDismissed] = useState(false);
  const [profileCompletionStatus, setProfileCompletionStatus] =
    useState<ProfileCompletionStatus | null>(null);
  const [isCheckingSetupStatus, setIsCheckingSetupStatus] = useState(false);
  const [hasLoadedSetupStatus, setHasLoadedSetupStatus] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [appliedFeedFilters, setAppliedFeedFilters] = useState<HomeFeedFilters>(DEFAULT_HOME_FEED_FILTERS);
  const [draftFeedFilters, setDraftFeedFilters] = useState<HomeFeedFilters>(DEFAULT_HOME_FEED_FILTERS);
  const [feedFiltersVisible, setFeedFiltersVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(0);
  const headerVisibleRef = useRef(true);
  const lastScrollOffset = useRef(0);
  const feedRequestRef = useRef(0);

  useEffect(() => {
    let active = true;

    getMyUserPreferences().then((result) => {
      if (!active || result.error) return;
      setPreferences(result.data);
      const defaultFilter = getDefaultHomeFilter({
          activeRole: profile?.active_role,
          preferences: result.data,
      });
      const defaultFeedType = mapHomeFilterToFeedType(defaultFilter);
      setSelectedFilter(defaultFilter);
      setAppliedFeedFilters((current) => ({ ...current, feedType: defaultFeedType }));
      setDraftFeedFilters((current) => ({ ...current, feedType: defaultFeedType }));
    });

    return () => {
      active = false;
    };
  }, [profile?.active_role]);

  useEffect(() => {
    let active = true;

    if (profileLoading || !isFocused) {
      return () => {
        active = false;
      };
    }

    setIsCheckingSetupStatus(true);
    setHasLoadedSetupStatus(false);
    getMyProfileCompletion()
      .then((result) => {
        if (!active) return;
        setProfileCompletionStatus(result.error ? null : result.data);
      })
      .catch(() => {
        if (active) setProfileCompletionStatus(null);
      })
      .finally(() => {
        if (!active) return;
        setIsCheckingSetupStatus(false);
        setHasLoadedSetupStatus(true);
      });

    return () => {
      active = false;
    };
  }, [isFocused, profileLoading, version]);

  useEffect(() => {
    let active = true;

    if (!isFocused || profileLoading) {
      return () => {
        active = false;
      };
    }

    getUnreadNotificationCount().then((result) => {
      if (!active || result.error) return;
      setUnreadNotificationCount(result.data ?? 0);
    });

    return () => {
      active = false;
    };
  }, [isFocused, profileLoading]);

  useEffect(() => {
    if (!isFocused || profileLoading) return;
    void refreshSavedPosts();
  }, [isFocused, profileLoading, refreshSavedPosts]);

  useEffect(() => {
    let active = true;

    if (!isFocused) {
      return () => {
        active = false;
      };
    }

    const userId = profile?.id ?? null;
    const cachedFeed =
      homeFeedCache && homeFeedCache.userId === userId ? homeFeedCache : null;
    const cacheIsFresh =
      cachedFeed ? Date.now() - cachedFeed.loadedAt < HOME_FEED_CACHE_TTL_MS : false;

    if (cachedFeed) {
      setFeedSources(cachedFeed.sources);
      setFeedLoading(false);
      setFeedError(null);
    }

    if (cacheIsFresh) {
      return () => {
        active = false;
      };
    }

    const requestId = feedRequestRef.current + 1;
    feedRequestRef.current = requestId;
    setFeedLoading(!cachedFeed);
    setFeedError(null);

    loadHomeFeedSources(userId).then((sources) => {
      if (!active || requestId !== feedRequestRef.current) return;

      homeFeedCache = {
        loadedAt: Date.now(),
        sources,
        userId,
      };
      setFeedSources(sources);
      setFeedLoading(false);
    }).catch((error) => {
      if (!active || requestId !== feedRequestRef.current) return;
      setFeedError(error instanceof Error ? error.message : 'Could not load posts right now.');
      setFeedLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isFocused, profile?.id]);

  const feedVariants = useMemo(() => {
    const rankingContext = {
      activeRole: profile?.active_role,
      city: profile?.city,
      preferences,
      userBarangay: profile?.barangay,
    };
    const jobCandidates = feedSources.jobs.map((item) => ({ item, job: item.job }));
    const workerCandidates = feedSources.workers.map((item) => ({ item, service: item.service }));
    const filtered = applyHomeFeedFilters({
      context: rankingContext,
      filters: appliedFeedFilters,
      jobs: jobCandidates,
      workers: workerCandidates,
    });

    return {
      Jobs: filtered.jobs,
      Services: filtered.services,
      'For you': filtered.all,
    };
  }, [appliedFeedFilters, feedSources, preferences, profile?.active_role, profile?.barangay, profile?.city]);

  const feed = feedVariants[selectedFilter];
  const activeFeedFilterCount = getHomeFeedFilterCount(appliedFeedFilters);
  const hasAppliedFeedFilters =
    activeFeedFilterCount > 0 || appliedFeedFilters.feedType !== DEFAULT_HOME_FEED_FILTERS.feedType;
  const setupNudge = useMemo(
    () =>
      getHomeSetupNudge({
        activeRole: profile?.active_role,
        completion: profileCompletionStatus,
        optionalSetupDismissed,
        preferences,
        selectedFilter,
      }),
    [profileCompletionStatus, optionalSetupDismissed, preferences, profile?.active_role, selectedFilter],
  );
  const needsProfileSetup = Boolean(setupNudge);
  const shouldShowSetupPrompt =
    hasLoadedSetupStatus && !isCheckingSetupStatus && needsProfileSetup;

  const setHeaderVisible = (visible: boolean) => {
    if (!headerHeightRef.current) return;
    if (headerVisibleRef.current === visible) return;
    headerVisibleRef.current = visible;

    Animated.timing(headerTranslateY, {
      toValue: visible ? 0 : -headerHeightRef.current,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleHeaderLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (!height || height === headerHeightRef.current) return;
    headerHeightRef.current = height;
    setHeaderHeight(height);
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offset = event.nativeEvent.contentOffset.y;
    const delta = offset - lastScrollOffset.current;

    if (offset <= 0 || offset < 24) {
      setHeaderVisible(true);
      lastScrollOffset.current = offset;
      return;
    }

    if (Math.abs(delta) < 6) {
      lastScrollOffset.current = offset;
      return;
    }

    setHeaderVisible(delta < 0);
    lastScrollOffset.current = offset;
  };

  const openSetupAction = useCallback((action: ProfileCompletionAction) => {
    const destination = getProfileCompletionDestination(action);

    if (destination.type === 'route') {
      router.push({
        pathname: destination.pathname as never,
        params: destination.params,
      });
      return;
    }

    router.push({
      pathname: '/profile/complete' as never,
      params: { mode: action.mode },
    });
  }, [router]);

  const openJob = useCallback((jobId: string) => {
    router.push({ pathname: '/job/[jobId]', params: { jobId } });
  }, [router]);

  const openService = useCallback((serviceId: string, variant: 'default' | 'match') => {
    router.push({ pathname: '/services/[serviceId]', params: { serviceId, variant } });
  }, [router]);

  const openAdvancedSearch = useCallback(() => {
    const homeMode = resolveHomeFeedMode({
      activeRole: profile?.active_role,
      preferences,
    });
    const searchFilter =
      draftFeedFilters.feedType === 'services' ||
      (draftFeedFilters.feedType === 'all' && homeMode === 'client')
        ? 'Services'
        : 'Jobs';

    setFeedFiltersVisible(false);
    router.push({
      pathname: '/(tabs)/search',
      params: {
        filter: searchFilter,
        openFilters: '1',
      },
    });
  }, [draftFeedFilters.feedType, preferences, profile?.active_role, router]);

  const toggleFeedSave = useCallback(
    async (feedItem: HomeFeedItem) => {
      if (!isVerified) {
        showInfoToast('Complete barangay verification before saving items.');
        router.push('/verification' as never);
        return;
      }

      const target = getHomeSavedTarget(feedItem);
      const result = await toggleSaved(target);
      if (result.error || !result.data) {
        showErrorToast(result.error ?? 'Could not update saved items.');
        return;
      }

      showSuccessToast(result.data.saved ? 'Saved' : 'Removed from saved');
    },
    [isVerified, router, showErrorToast, showInfoToast, showSuccessToast, toggleSaved],
  );

  const openFeedFilters = useCallback(() => {
    setDraftFeedFilters(appliedFeedFilters);
    setFeedFiltersVisible(true);
  }, [appliedFeedFilters]);

  const applyFeedFilters = useCallback(() => {
    setAppliedFeedFilters(draftFeedFilters);
    setSelectedFilter(mapFeedTypeToHomeFilter(draftFeedFilters.feedType));
    setFeedFiltersVisible(false);
  }, [draftFeedFilters]);

  const resetFeedFilters = useCallback(() => {
    setDraftFeedFilters(DEFAULT_HOME_FEED_FILTERS);
  }, []);

  const changeQuickFeedFilter = useCallback((filter: HomeFilter) => {
    const feedType = mapHomeFilterToFeedType(filter);
    setSelectedFilter(filter);
    setAppliedFeedFilters((current) => ({ ...current, feedType }));
    setDraftFeedFilters((current) => ({ ...current, feedType }));
  }, []);

  const keyExtractor = useCallback((item: HomeFeedItem) => item.key, []);

  const renderFeedItem = useCallback(
    ({ item }: { item: HomeFeedItem }) => (
      <FeedCard
        feedItem={item}
        isSaved={isSaved(getHomeSavedTarget(item))}
        savePending={isPending(getHomeSavedTarget(item))}
        onOpenJob={openJob}
        onOpenService={openService}
        onToggleSaved={() => void toggleFeedSave(item)}
        workerVariant={selectedFilter === 'Services' ? 'default' : 'match'}
      />
    ),
    [isPending, isSaved, openJob, openService, selectedFilter, toggleFeedSave],
  );

  const renderListHeader = useCallback(
    () => (
      <>
        {shouldShowSetupPrompt && setupNudge ? (
          <HomeSetupNudge
            actionLabel={setupNudge.actionLabel}
            body={setupNudge.body}
            optional={setupNudge.optional}
            onAction={() => openSetupAction(setupNudge.action)}
            onDismiss={setupNudge.optional ? () => setOptionalSetupDismissed(true) : undefined}
            title={setupNudge.title}
          />
        ) : null}
        <HomeSectionHeader
          activeFilterCount={activeFeedFilterCount}
          onFilterPress={openFeedFilters}
        />
      </>
    ),
    [
      openSetupAction,
      activeFeedFilterCount,
      openFeedFilters,
      setupNudge,
      shouldShowSetupPrompt,
    ],
  );

  const renderListFooter = useCallback(
    () => (
      <>
        {feedLoading ? (
          <View style={styles.skeletonFeed}>
            <HomeFeedCardSkeleton kind={selectedFilter === 'Services' ? 'worker' : 'job'} loadingImage />
            <HomeFeedCardSkeleton kind={selectedFilter === 'Services' ? 'worker' : 'job'} />
            {selectedFilter === 'For you' ? <HomeFeedCardSkeleton kind="worker" loadingImage /> : null}
          </View>
        ) : null}
        {!feedLoading && feedError ? <Text style={styles.emptyText}>{feedError}</Text> : null}
        {!feedLoading && !feedError && !feed.length ? (
          hasAppliedFeedFilters ? (
            <EmptyState
              description="Try adjusting your feed filters."
              icon="filter-alt-off"
              title="No posts match these filters yet."
            />
          ) : (
            <Text style={styles.emptyText}>No posts to show yet.</Text>
          )
        ) : null}
      </>
    ),
    [feed.length, feedError, feedLoading, hasAppliedFeedFilters, selectedFilter],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={[]} style={styles.safeArea}>
        <Animated.View
          onLayout={handleHeaderLayout}
          style={[styles.headerStack, { transform: [{ translateY: headerTranslateY }] }]}>
          <HomeTopHeader
            onNotifications={() => router.push('/notifications' as never)}
            topInset={topInset}
            unreadCount={unreadNotificationCount}
          />
          <HomeFilterTabs>
            {homeFilters.map((filter) => (
              <HomeFilterPill
                key={filter}
                label={filter}
                onPress={() => changeQuickFeedFilter(filter)}
                selected={selectedFilter === filter}
              />
            ))}
          </HomeFilterTabs>
        </Animated.View>

        <FlatList
          contentContainerStyle={[styles.content, { paddingTop: headerHeight }]}
          data={feed}
          initialNumToRender={6}
          ItemSeparatorComponent={FeedSeparator}
          keyExtractor={keyExtractor}
          ListFooterComponent={renderListFooter}
          ListHeaderComponent={renderListHeader}
          maxToRenderPerBatch={6}
          onScroll={handleScroll}
          removeClippedSubviews
          renderItem={renderFeedItem}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
        <HomeFeedFiltersSheet
          filters={draftFeedFilters}
          onAdvancedSearch={openAdvancedSearch}
          onApply={applyFeedFilters}
          onChange={(key, value) =>
            setDraftFeedFilters((current) => ({ ...current, [key]: value }))
          }
          onClose={() => setFeedFiltersVisible(false)}
          onReset={resetFeedFilters}
          visible={feedFiltersVisible}
        />
      </SafeAreaView>
    </View>
  );
}

function FeedSeparator() {
  return <View style={styles.feedSeparator} />;
}

function getHomeSavedTarget(feedItem: HomeFeedItem) {
  if (feedItem.type === 'worker') {
    return {
      postType: 'service' as const,
      postId: feedItem.service.id,
    };
  }

  return {
      postType: 'job' as const,
      postId: feedItem.itemId,
  };
}

const FeedCard = memo(function FeedCard({
  feedItem,
  isSaved,
  savePending,
  onOpenJob,
  onOpenService,
  onToggleSaved,
  workerVariant,
}: {
  feedItem: HomeFeedItem;
  isSaved: boolean;
  savePending: boolean;
  onOpenJob: (jobId: string) => void;
  onOpenService: (serviceId: string, variant: 'default' | 'match') => void;
  onToggleSaved: () => void;
  workerVariant: 'default' | 'match';
}) {
  if (feedItem.type === 'worker') {
    return (
      <HomeFeedCard
        {...feedItem.cardProps}
        isSaved={isSaved}
        onPress={() => onOpenService(feedItem.itemId, workerVariant)}
        onPrimaryAction={() => onOpenService(feedItem.itemId, workerVariant)}
        onSave={onToggleSaved}
        savePending={savePending}
      />
    );
  }

  return (
    <HomeFeedCard
      {...feedItem.cardProps}
      isSaved={isSaved}
      onPress={() => onOpenJob(feedItem.itemId)}
      onPrimaryAction={() => onOpenJob(feedItem.itemId)}
      onSave={onToggleSaved}
      savePending={savePending}
    />
  );
});

type HomeSetupNudgeModel = {
  action: ProfileCompletionAction;
  actionLabel: string;
  body: string;
  optional?: boolean;
  title: string;
};

function getHomeSetupNudge({
  activeRole,
  completion,
  optionalSetupDismissed,
  preferences,
  selectedFilter,
}: {
  activeRole?: string | null;
  completion: ProfileCompletionStatus | null;
  optionalSetupDismissed: boolean;
  preferences: UserPreferences | null;
  selectedFilter: HomeFilter;
}): HomeSetupNudgeModel | null {
  if (!completion) return null;

  if (!completion.coreComplete) {
    return {
      action: completion.coreCompletion.nextRecommendedAction ?? fallbackProfileAction('core'),
      actionLabel: 'Continue setup',
      title: 'Finish your Core Profile',
      body: 'Add your basic details so neighbors know who they are connecting with.',
    };
  }

  if (completion.verification.status === 'unverified') {
    return {
      action: completion.verification.action ?? fallbackVerificationAction(),
      actionLabel: 'Start verification',
      title: 'Verify your barangay identity',
      body: 'Verification helps unlock posting, messaging, saving, and reviews.',
    };
  }

  if (completion.verification.status === 'pending') {
    return {
      action: completion.verification.action ?? fallbackVerificationAction(),
      actionLabel: 'View status',
      title: 'Verification pending',
      body: 'Your barangay verification is under review.',
    };
  }

  if (completion.verification.status === 'needs_more_info' || completion.verification.status === 'rejected') {
    return {
      action: completion.verification.action ?? fallbackVerificationAction(),
      actionLabel: 'Review verification',
      title: 'Verification needs attention',
      body: 'Review the reason and update your submission.',
    };
  }

  const contextMode = getHomeSetupContext({ activeRole, preferences, selectedFilter });
  const wantsToOffer =
    contextMode === 'provider' ||
    Boolean(
      preferences?.offeredDeliveryMode ||
        preferences?.offeredServices.length ||
        preferences?.customOfferedServices.length,
    );
  const wantsToHire =
    contextMode === 'client' ||
    Boolean(preferences?.neededServices.length || preferences?.customNeededServices.length);

  if (wantsToOffer && completion.workCompletion.state !== 'ready') {
    return {
      action: completion.workCompletion.nextRecommendedAction ?? fallbackProfileAction('work'),
      actionLabel: 'Complete Work Profile',
      title: 'Set up your Work Profile',
      body: 'Add your services, rates, and availability so clients can find you.',
    };
  }

  if (wantsToHire && completion.hiringCompletion.state !== 'ready') {
    return {
      action: completion.hiringCompletion.nextRecommendedAction ?? fallbackProfileAction('hiring'),
      actionLabel: 'Complete Hiring Profile',
      title: 'Set up your Hiring Profile',
      body: 'Add your preferences so Konektado can recommend better services.',
    };
  }

  if (completion.photoRecommended && !optionalSetupDismissed) {
    return {
      action: {
        id: 'profile-photo',
        kind: 'add_profile_photo',
        label: 'Add photo',
        mode: 'core',
        optional: true,
      },
      actionLabel: 'Add photo',
      body: 'Optional: help neighbors recognize you more easily.',
      optional: true,
      title: 'Add a profile photo',
    };
  }

  return null;
}

function getHomeSetupContext({
  activeRole,
  preferences,
  selectedFilter,
}: {
  activeRole?: string | null;
  preferences: UserPreferences | null;
  selectedFilter: HomeFilter;
}) {
  if (selectedFilter === 'Jobs') return 'provider';
  if (selectedFilter === 'Services') return 'client';
  return resolveHomeFeedMode({ activeRole, preferences });
}

function fallbackProfileAction(mode: ProfileCompletionMode): ProfileCompletionAction {
  if (mode === 'hiring') {
    return {
      id: 'home-hiring-profile',
      kind: 'edit_hiring_preferences',
      label: 'Complete Hiring Profile',
      mode,
    };
  }

  if (mode === 'work') {
    return {
      id: 'home-work-profile',
      kind: 'edit_availability',
      label: 'Complete Work Profile',
      mode,
    };
  }

  return {
    id: 'home-core-profile',
    kind: 'edit_shared_profile',
    label: 'Continue setup',
    mode,
  };
}

function fallbackVerificationAction(): ProfileCompletionAction {
  return {
    id: 'verification',
    kind: 'open_verification',
    label: 'Start verification',
    mode: 'core',
  };
}

function HomeFeedCardSkeleton({
  kind,
  loadingImage = false,
}: {
  kind: HomeFeedCardProps['kind'];
  loadingImage?: boolean;
}) {
  return (
    <HomeFeedCard
      description=""
      isLoading
      kind={kind}
      label=""
      loadingImage={loadingImage}
      meta={[]}
      name=""
      postedAt=""
      primaryActionLabel={kind === 'worker' ? 'View Profile' : 'View Job'}
      tags={[]}
      title=""
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  safeArea: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  headerStack: {
    backgroundColor: color.background,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  content: {
    paddingBottom: space.md,
  },
  feed: {
    backgroundColor: color.screenBackground,
    gap: 2,
  },
  feedSeparator: {
    backgroundColor: color.screenBackground,
    height: 2,
  },
  skeletonFeed: {
    gap: 2,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
});
