import {
  doesServiceMatchWorkType,
  getCategoryForMvpService,
  isMvpServiceCategory,
  isMvpServiceOption,
  type MvpServiceCategory,
  type SearchWorkType,
} from '@/constants/service-taxonomy';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';

export type HomeFeedMode = 'provider' | 'client' | 'mixed';

export type HomeFeedRankingContext = {
  activeRole?: string | null;
  city?: string | null;
  preferences: UserPreferences | null;
  userBarangay?: string | null;
};

export type HomeFeedType = 'all' | 'jobs' | 'services';
export type HomeFeedLocationPreference = 'same_barangay' | 'nearby' | 'any';
export type HomeFeedSort = 'recommended' | 'newest' | 'nearby';

export type HomeFeedFilters = {
  feedType: HomeFeedType;
  workType: SearchWorkType;
  category: 'all' | MvpServiceCategory;
  locationPreference: HomeFeedLocationPreference;
  sort: HomeFeedSort;
};

type Ranked<T> = {
  item: T;
  score: number;
  createdTime: number;
};

type RankedQueues<TJob, TWorker> = {
  jobs: Ranked<TJob>[];
  workers: Ranked<TWorker>[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const OPPOSITE_TYPE_RELEVANCE_GAP = 12;

export const DEFAULT_HOME_FEED_FILTERS: HomeFeedFilters = {
  feedType: 'all',
  workType: 'either',
  category: 'all',
  locationPreference: 'any',
  sort: 'recommended',
};

export function resolveHomeFeedMode(context: HomeFeedRankingContext): HomeFeedMode {
  const activeRole = normalizeRole(context.activeRole);
  if (activeRole) return activeRole;

  const preferenceIntent = normalizeRole(context.preferences?.intent);
  return preferenceIntent ?? 'mixed';
}

export function getDefaultHomeFilter(context: HomeFeedRankingContext) {
  const mode = resolveHomeFeedMode(context);
  if (mode === 'provider') return 'Jobs' as const;
  if (mode === 'client') return 'Services' as const;
  return 'For you' as const;
}

export function rankHomeFeedJobs<T>(
  jobs: Array<{ item: T; job: JobSummary }>,
  context: HomeFeedRankingContext,
) {
  return rankJobs(jobs, context).map(({ item }) => item);
}

export function rankHomeFeedWorkers<T>(
  workers: Array<{ item: T; service: ServiceSearchResult }>,
  context: HomeFeedRankingContext,
) {
  return rankWorkers(workers, context).map(({ item }) => item);
}

export function buildHomeForYouFeed<TJob, TWorker>({
  context,
  jobs,
  workers,
}: {
  context: HomeFeedRankingContext;
  jobs: Array<{ item: TJob; job: JobSummary }>;
  workers: Array<{ item: TWorker; service: ServiceSearchResult }>;
}) {
  const mode = resolveHomeFeedMode(context);
  const rankedJobs = rankJobs(jobs, context);
  const rankedWorkers = rankWorkers(workers, context);

  if (mode === 'provider') {
    return mergeWithPattern({
      pattern: ['job', 'job', 'job', 'worker'],
      primaryType: 'job',
      queues: { jobs: rankedJobs, workers: rankedWorkers },
    });
  }

  if (mode === 'client') {
    return mergeWithPattern({
      pattern: ['worker', 'worker', 'worker', 'job'],
      primaryType: 'worker',
      queues: { jobs: rankedJobs, workers: rankedWorkers },
    });
  }

  return mergeBalancedByScore({ jobs: rankedJobs, workers: rankedWorkers });
}

export function applyHomeFeedFilters<TJob, TWorker>({
  context,
  filters,
  jobs,
  workers,
}: {
  context: HomeFeedRankingContext;
  filters: HomeFeedFilters;
  jobs: Array<{ item: TJob; job: JobSummary }>;
  workers: Array<{ item: TWorker; service: ServiceSearchResult }>;
}) {
  const visibleJobs = filters.feedType === 'services'
    ? []
    : jobs.filter(({ job }) => matchesJobFilters(job, context, filters));
  const visibleWorkers = filters.feedType === 'jobs'
    ? []
    : workers.filter(({ service }) => matchesWorkerFilters(service, context, filters));

  return {
    jobs: sortFilteredJobs(visibleJobs, context, filters).map(({ item }) => item),
    services: sortFilteredWorkers(visibleWorkers, context, filters).map(({ item }) => item),
    all: buildFilteredMixedFeed({
      context,
      filters,
      jobs: visibleJobs,
      workers: visibleWorkers,
    }),
  };
}

export function getHomeFeedFilterCount(filters: HomeFeedFilters) {
  let count = 0;
  if (filters.workType !== DEFAULT_HOME_FEED_FILTERS.workType) count += 1;
  if (filters.category !== DEFAULT_HOME_FEED_FILTERS.category) count += 1;
  if (filters.locationPreference !== DEFAULT_HOME_FEED_FILTERS.locationPreference) count += 1;
  if (filters.sort !== DEFAULT_HOME_FEED_FILTERS.sort) count += 1;
  return count;
}

function buildFilteredMixedFeed<TJob, TWorker>({
  context,
  filters,
  jobs,
  workers,
}: {
  context: HomeFeedRankingContext;
  filters: HomeFeedFilters;
  jobs: Array<{ item: TJob; job: JobSummary }>;
  workers: Array<{ item: TWorker; service: ServiceSearchResult }>;
}) {
  const rankedJobs = sortFilteredJobs(jobs, context, filters);
  const rankedWorkers = sortFilteredWorkers(workers, context, filters);

  if (filters.sort === 'newest') {
    return [...rankedJobs, ...rankedWorkers]
      .sort((left, right) => right.createdTime - left.createdTime)
      .map(({ item }) => item);
  }

  if (filters.sort === 'nearby') {
    return mergeBalancedByScore({
      jobs: rankedJobs,
      workers: rankedWorkers,
    });
  }

  const mode = resolveHomeFeedMode(context);

  if (mode === 'provider') {
    return mergeWithPattern({
      pattern: ['job', 'job', 'job', 'worker'],
      primaryType: 'job',
      queues: { jobs: rankedJobs, workers: rankedWorkers },
    });
  }

  if (mode === 'client') {
    return mergeWithPattern({
      pattern: ['worker', 'worker', 'worker', 'job'],
      primaryType: 'worker',
      queues: { jobs: rankedJobs, workers: rankedWorkers },
    });
  }

  return mergeBalancedByScore({ jobs: rankedJobs, workers: rankedWorkers });
}

function rankJobs<T>(
  jobs: Array<{ item: T; job: JobSummary }>,
  context: HomeFeedRankingContext,
): Ranked<T>[] {
  const mode = resolveHomeFeedMode(context);

  return jobs
    .map(({ item, job }) => ({
      item,
      score: scoreJob(job, context, mode),
      createdTime: getCreatedTime(job.createdAt),
    }))
    .sort(compareRanked);
}

function sortFilteredJobs<T>(
  jobs: Array<{ item: T; job: JobSummary }>,
  context: HomeFeedRankingContext,
  filters: HomeFeedFilters,
): Ranked<T>[] {
  const ranked = jobs.map(({ item, job }) => ({
    item,
    score: getFilteredJobScore(job, context, filters),
    createdTime: getCreatedTime(job.createdAt),
  }));

  if (filters.sort === 'newest') {
    return ranked.sort(compareNewest);
  }

  return ranked.sort(compareRanked);
}

function rankWorkers<T>(
  workers: Array<{ item: T; service: ServiceSearchResult }>,
  context: HomeFeedRankingContext,
): Ranked<T>[] {
  const mode = resolveHomeFeedMode(context);

  return workers
    .map(({ item, service }) => ({
      item,
      score: scoreWorker(service, context, mode),
      createdTime: getCreatedTime(service.createdAt),
    }))
    .sort(compareRanked);
}

function sortFilteredWorkers<T>(
  workers: Array<{ item: T; service: ServiceSearchResult }>,
  context: HomeFeedRankingContext,
  filters: HomeFeedFilters,
): Ranked<T>[] {
  const ranked = workers.map(({ item, service }) => ({
    item,
    score: getFilteredWorkerScore(service, context, filters),
    createdTime: getCreatedTime(service.createdAt),
  }));

  if (filters.sort === 'newest') {
    return ranked.sort(compareNewest);
  }

  return ranked.sort(compareRanked);
}

function matchesJobFilters(
  job: JobSummary,
  context: HomeFeedRankingContext,
  filters: HomeFeedFilters,
) {
  const service = job.serviceNeeded ?? job.category;
  if (!doesServiceMatchWorkType(service, filters.workType)) return false;
  if (!matchesCategory(job.category, service, filters.category)) return false;
  return matchesLocationPreference(
    getLocationMatch({
      candidateBarangay: job.barangay,
      candidateLocationText: job.locationText,
      userBarangay: context.userBarangay,
      userCity: context.city,
    }),
    filters.locationPreference,
  );
}

function matchesWorkerFilters(
  service: ServiceSearchResult,
  context: HomeFeedRankingContext,
  filters: HomeFeedFilters,
) {
  if (!doesServiceMatchWorkType(service.category, filters.workType)) return false;
  if (!matchesCategory(service.category, service.category, filters.category)) return false;
  return matchesLocationPreference(
    getLocationMatch({
      candidateBarangay: service.barangay ?? service.provider?.barangay,
      candidateCity: service.provider?.city,
      candidateLocationText: service.locationText,
      userBarangay: context.userBarangay,
      userCity: context.city,
    }),
    filters.locationPreference,
  );
}

function matchesCategory(
  candidateCategory: string | null | undefined,
  candidateService: string | null | undefined,
  filterCategory: HomeFeedFilters['category'],
) {
  if (filterCategory === 'all') return true;
  return getTaxonomyGroup(candidateService) === filterCategory || getTaxonomyGroup(candidateCategory) === filterCategory;
}

function matchesLocationPreference(
  locationMatch: number,
  preference: HomeFeedLocationPreference,
) {
  if (preference === 'any') return true;
  if (preference === 'same_barangay') return locationMatch >= 0.8;
  return locationMatch > 0;
}

function getFilteredJobScore(
  job: JobSummary,
  context: HomeFeedRankingContext,
  filters: HomeFeedFilters,
) {
  if (filters.sort !== 'nearby') {
    return scoreJob(job, context, resolveHomeFeedMode(context));
  }

  const locationMatch = getLocationMatch({
    candidateBarangay: job.barangay,
    candidateLocationText: job.locationText,
    userBarangay: context.userBarangay,
    userCity: context.city,
  });

  return locationMatch * 100 + scoreJob(job, context, resolveHomeFeedMode(context));
}

function getFilteredWorkerScore(
  service: ServiceSearchResult,
  context: HomeFeedRankingContext,
  filters: HomeFeedFilters,
) {
  if (filters.sort !== 'nearby') {
    return scoreWorker(service, context, resolveHomeFeedMode(context));
  }

  const locationMatch = getLocationMatch({
    candidateBarangay: service.barangay ?? service.provider?.barangay,
    candidateCity: service.provider?.city,
    candidateLocationText: service.locationText,
    userBarangay: context.userBarangay,
    userCity: context.city,
  });

  return locationMatch * 100 + scoreWorker(service, context, resolveHomeFeedMode(context));
}

function scoreJob(job: JobSummary, context: HomeFeedRankingContext, mode: HomeFeedMode) {
  const serviceMatch = getJobServiceMatch(job, context.preferences);
  const locationMatch = getLocationMatch({
    candidateBarangay: job.barangay,
    candidateLocationText: job.locationText,
    userBarangay: context.userBarangay,
    userCity: context.city,
  });
  const recency = getRecencyScore(job.createdAt, 7);
  const clientTrust = getClientTrustScore(job);
  const modeBoost = mode === 'provider' ? 1 : mode === 'mixed' ? 0.35 : 0;

  return (
    serviceMatch * 45 +
    locationMatch * 20 +
    recency * 15 +
    clientTrust * 10 +
    modeBoost * 10
  );
}

function scoreWorker(service: ServiceSearchResult, context: HomeFeedRankingContext, mode: HomeFeedMode) {
  const serviceMatch = getWorkerServiceMatch(service, context.preferences);
  const locationMatch = getLocationMatch({
    candidateBarangay: service.barangay ?? service.provider?.barangay,
    candidateCity: service.provider?.city,
    candidateLocationText: service.locationText,
    userBarangay: context.userBarangay,
    userCity: context.city,
  });
  const availabilityMatch = getAvailabilityScore(service);
  const providerTrust = getProviderTrustScore(service);
  const recency = getRecencyScore(service.createdAt, 14);
  const modeBoost = mode === 'client' ? 1 : mode === 'mixed' ? 0.35 : 0;

  return (
    serviceMatch * 45 +
    locationMatch * 20 +
    availabilityMatch * 10 +
    providerTrust * 15 +
    recency * 5 +
    modeBoost * 5
  );
}

function getJobServiceMatch(job: JobSummary, preferences: UserPreferences | null) {
  return getTaxonomyMatch({
    candidateCategory: job.category,
    candidatePrimaryService: job.serviceNeeded,
    candidateTextValues: [job.title, job.description, job.category, job.serviceNeeded, ...job.tags],
    customPreferences: preferences?.customOfferedServices ?? [],
    structuredPreferences: preferences?.offeredServices ?? [],
  });
}

function getWorkerServiceMatch(
  service: ServiceSearchResult,
  preferences: UserPreferences | null,
) {
  return getTaxonomyMatch({
    candidateCategory: service.category,
    candidatePrimaryService: service.category,
    candidateTextValues: [
      service.title,
      service.description,
      service.category,
      service.availabilityText,
      service.locationText,
      ...service.tags,
    ],
    customPreferences: preferences?.customNeededServices ?? [],
    structuredPreferences: preferences?.neededServices ?? [],
  });
}

function getTaxonomyMatch({
  candidateCategory,
  candidatePrimaryService,
  candidateTextValues,
  customPreferences,
  structuredPreferences,
}: {
  candidateCategory?: string | null;
  candidatePrimaryService?: string | null;
  candidateTextValues: Array<string | null | undefined>;
  customPreferences: string[];
  structuredPreferences: string[];
}) {
  const normalizedPrimary = normalizeText(candidatePrimaryService);
  const normalizedCategory = normalizeText(candidateCategory);
  const normalizedStructured = structuredPreferences.map(normalizeText).filter(Boolean);

  if (!normalizedStructured.length && !customPreferences.length) {
    return 0.25;
  }

  if (
    normalizedPrimary &&
    normalizedStructured.some((preference) => preference === normalizedPrimary)
  ) {
    return 1;
  }

  if (
    normalizedCategory &&
    normalizedStructured.some((preference) => preference === normalizedCategory)
  ) {
    return 0.9;
  }

  if (hasSharedTaxonomyGroup(structuredPreferences, [candidatePrimaryService, candidateCategory])) {
    return 0.5;
  }

  const haystack = candidateTextValues.map((value) => normalizeText(value)).filter(Boolean).join(' ');
  if (customPreferences.some((preference) => isTextPreferenceMatch(preference, haystack))) {
    return 0.2;
  }

  return 0;
}

function hasSharedTaxonomyGroup(preferences: string[], candidates: Array<string | null | undefined>) {
  const candidateGroups = new Set(candidates
    .map(getTaxonomyGroup)
    .filter(Boolean));

  if (!candidateGroups.size) return false;

  return preferences.some((preference) => {
    const preferenceGroup = getTaxonomyGroup(preference);
    return Boolean(preferenceGroup && candidateGroups.has(preferenceGroup));
  });
}

function getTaxonomyGroup(value: string | null | undefined) {
  if (!value) return null;
  if (isMvpServiceCategory(value)) return value;
  if (isMvpServiceOption(value)) return getCategoryForMvpService(value);
  return null;
}

function getLocationMatch({
  candidateBarangay,
  candidateCity,
  candidateLocationText,
  userBarangay,
  userCity,
}: {
  candidateBarangay?: string | null;
  candidateCity?: string | null;
  candidateLocationText?: string | null;
  userBarangay?: string | null;
  userCity?: string | null;
}) {
  const candidateBarangayText = normalizeLocation(candidateBarangay);
  const candidateCityText = normalizeLocation(candidateCity);
  const candidateLocation = normalizeLocation(candidateLocationText);
  const barangay = normalizeLocation(userBarangay);
  const city = normalizeLocation(userCity);

  if (barangay && candidateBarangayText === barangay) return 1;
  if (barangay && candidateLocation.includes(barangay)) return 0.8;
  if (city && candidateCityText === city) return 0.5;
  if (city && candidateLocation.includes(city)) return 0.4;

  return 0;
}

function getAvailabilityScore(service: ServiceSearchResult) {
  if (!service.isActive) return 0;
  if (/\b(unavailable|not available|away|paused)\b/i.test(service.availabilityText ?? '')) return 0.2;
  return 1;
}

function getProviderTrustScore(service: ServiceSearchResult) {
  const raw =
    Math.min(service.reviewCount, 3) * 2 +
    Math.min(service.completedJobsCount, 3) * 2 +
    (service.averageRating && service.averageRating >= 4.5 ? 3 : 0);

  return Math.min(raw, 15) / 15;
}

function getClientTrustScore(job: JobSummary) {
  const raw =
    Math.min(job.clientReviewCount, 3) * 2 +
    Math.min(job.clientJobsPostedCount, 3) +
    (job.clientAverageRating && job.clientAverageRating >= 4.5 ? 1 : 0);

  return Math.min(raw, 10) / 10;
}

function getRecencyScore(createdAt: string, windowDays: number) {
  const createdTime = getCreatedTime(createdAt);
  if (!createdTime) return 0;

  const ageDays = Math.max(0, (Date.now() - createdTime) / MS_PER_DAY);
  return Math.max(0, 1 - Math.min(1, ageDays / windowDays));
}

function mergeWithPattern<TJob, TWorker>(
  {
    pattern,
    primaryType,
    queues,
  }: {
    pattern: Array<'job' | 'worker'>;
    primaryType: 'job' | 'worker';
    queues: RankedQueues<TJob, TWorker>;
  },
) {
  const jobs = [...queues.jobs];
  const workers = [...queues.workers];
  const mixed: Array<TJob | TWorker> = [];
  let patternIndex = 0;

  while (jobs.length || workers.length) {
    const preferredType = pattern[patternIndex % pattern.length];
    const preferred = preferredType === 'job' ? jobs : workers;
    const primary = primaryType === 'job' ? jobs : workers;
    const fallback = preferredType === 'job' ? workers : jobs;
    const nextPreferred = preferred[0];
    const nextPrimary = primary[0];
    const nextFallback = fallback[0];

    if (!nextPreferred && !nextFallback) break;

    if (!nextPreferred) {
      mixed.push(fallback.shift()!.item);
    } else if (!nextFallback) {
      mixed.push(preferred.shift()!.item);
    } else if (
      preferredType !== primaryType &&
      nextPrimary &&
      nextPreferred.score + OPPOSITE_TYPE_RELEVANCE_GAP < nextPrimary.score
    ) {
      mixed.push(primary.shift()!.item);
    } else {
      mixed.push(preferred.shift()!.item);
    }

    patternIndex += 1;
  }

  return mixed;
}

function mergeBalancedByScore<TJob, TWorker>(queues: RankedQueues<TJob, TWorker>) {
  const jobs = [...queues.jobs];
  const workers = [...queues.workers];
  const mixed: Array<TJob | TWorker> = [];
  let currentRunType: 'job' | 'worker' | null = null;
  let currentRunLength = 0;

  while (jobs.length || workers.length) {
    const nextJob = jobs[0];
    const nextWorker = workers[0];
    const highestType: 'job' | 'worker' =
      !nextWorker || (nextJob && nextJob.score >= nextWorker.score) ? 'job' : 'worker';
    const nextType: 'job' | 'worker' =
      currentRunType === highestType && currentRunLength >= 3
        ? highestType === 'job' && workers.length
          ? 'worker'
          : highestType === 'worker' && jobs.length
            ? 'job'
            : highestType
        : highestType;
    const queue = nextType === 'job' ? jobs : workers;
    const next = queue.shift();

    if (!next) break;

    mixed.push(next.item);
    if (currentRunType === nextType) {
      currentRunLength += 1;
    } else {
      currentRunType = nextType;
      currentRunLength = 1;
    }
  }

  return mixed;
}

function compareRanked<T>(left: Ranked<T>, right: Ranked<T>) {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;
  return right.createdTime - left.createdTime;
}

function compareNewest<T>(left: Ranked<T>, right: Ranked<T>) {
  return right.createdTime - left.createdTime;
}

function normalizeRole(value: unknown): HomeFeedMode | null {
  if (value === 'provider' || value === 'client') return value;
  return null;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeLocation(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\bbarangay\b/g, '')
    .replace(/\bbrgy\b/g, '')
    .replace(/\bsto\b/g, 'santo')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTextPreferenceMatch(preference: string, haystack: string) {
  const normalizedPreference = normalizeText(preference);
  if (!normalizedPreference) return false;
  if (haystack.includes(normalizedPreference)) return true;

  const words = normalizedPreference.split(' ').filter((word) => word.length >= 4);
  return words.some((word) => haystack.includes(word));
}

function getCreatedTime(createdAt: string) {
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}
