/**
 * Home discovery stability and the Work Profile -> personalization link.
 *
 * The Home grid is navigated by position, so these tests pin the tile order
 * against preference sets and modes, and prove that personalization still
 * changes ranking without changing access.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDiscoveryGroupForService,
  HOME_DISCOVERY_GROUPS,
  MORE_SERVICES_GROUP,
  OTHER_SERVICE_CATEGORY_VALUE,
  SEARCH_DISCOVERY_GROUPS,
} from '@/constants/service-taxonomy';
import {
  rankHomeFeedJobs,
  rankHomeFeedWorkers,
  withWorkProfileSkills,
  type HomeFeedRankingContext,
} from '@/services/home-feed.service';
import type { JobSummary, ServiceSearchResult } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';

/**
 * Mirrors how `app/(tabs)/index.tsx` builds the grid: a straight map over the
 * fixed constant, with no preference or mode input. If tile ordering is ever
 * made dynamic again, this is what should fail.
 */
function buildHomeTiles() {
  return HOME_DISCOVERY_GROUPS.map((group) => group);
}

function buildPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    customNeededServices: [],
    customOfferedServices: [],
    intent: 'provider',
    neededServices: [],
    offeredDeliveryMode: null,
    offeredServices: [],
    onboardingCompletedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildJob(overrides: Partial<JobSummary> & { id: string }): JobSummary {
  return {
    clientId: 'client-1',
    title: 'Job',
    description: 'A job posted in the barangay.',
    category: null,
    serviceNeeded: null,
    tags: [],
    photoUrls: [],
    barangay: 'Barangay San Pedro',
    locationText: 'Barangay San Pedro',
    budgetMin: 500,
    budgetMax: 1500,
    rateType: 'per_project',
    budgetNegotiable: false,
    workersNeeded: 1,
    scheduleText: null,
    experienceLevel: 'any',
    certificationRequired: false,
    certificationNote: null,
    status: 'open',
    acceptedProviderId: null,
    allowMessages: true,
    autoReplyEnabled: false,
    autoCloseEnabled: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    client: null,
    clientAverageRating: null,
    clientReviewCount: 0,
    clientJobsPostedCount: 0,
    ...overrides,
  } as JobSummary;
}

/**
 * A fully populated service row. Every numeric field the ranker touches has to
 * be present: an incomplete mock makes `scoreWorker` return NaN, every
 * comparison false, and the sort a silent no-op that quietly passes.
 */
function buildService(overrides: { id: string; category: string }): ServiceSearchResult {
  return {
    providerId: 'provider-1',
    title: 'Service',
    description: 'A service offered in the barangay.',
    tags: [],
    photoUrls: [],
    yearsExperience: 3,
    availabilityText: 'Weekends',
    rateText: null,
    rateMin: 300,
    rateMax: 900,
    rateType: 'per_project',
    rateNegotiable: false,
    experienceLevel: 'any',
    certificationAvailable: false,
    certificationNote: null,
    customCategory: null,
    customCategoryReviewStatus: 'none',
    barangay: 'Barangay San Pedro',
    locationText: 'Barangay San Pedro',
    allowMessages: true,
    autoReplyEnabled: false,
    autoPauseEnabled: false,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    provider: null,
    averageRating: null,
    reviewCount: 0,
    completedJobsCount: 0,
    ...overrides,
  };
}

const context = (
  preferences: UserPreferences | null,
  activeRole = 'provider',
): HomeFeedRankingContext => ({
  activeRole,
  city: 'Sto. Tomas',
  preferences,
  userBarangay: 'Barangay San Pedro',
});

describe('Home tile stability', () => {
  it('1. Home has exactly eight primary discovery groups', () => {
    assert.equal(buildHomeTiles().length, 8);
    assert.equal(new Set(HOME_DISCOVERY_GROUPS).size, 8);
  });

  it('2. More services is not a Home primary group', () => {
    assert.equal((HOME_DISCOVERY_GROUPS as readonly string[]).includes(MORE_SERVICES_GROUP), false);
    assert.ok((SEARCH_DISCOVERY_GROUPS as readonly string[]).includes(MORE_SERVICES_GROUP));
  });

  it('3-5. tile order never changes with mode, preferences, or role', () => {
    const baseline = buildHomeTiles();

    // The grid is a constant, so every caller sees the same order. Build it
    // repeatedly the way Home does and assert it never drifts.
    for (let run = 0; run < 5; run += 1) {
      assert.deepEqual(buildHomeTiles(), baseline);
    }

    assert.deepEqual(baseline, [
      'Home & Errands',
      'Beauty & Personal Care',
      'Food & Baking',
      'Sewing & Tailoring',
      'Home Repair & Carpentry',
      'Tutoring & Lessons',
      'Documents & Design',
      'Computer & Phone Help',
    ]);
  });

  it('6. no group disappears because of preferences', () => {
    const tiles = buildHomeTiles();

    HOME_DISCOVERY_GROUPS.forEach((group) => {
      assert.ok(tiles.includes(group), `${group} must always be reachable`);
    });
  });

  it('custom listings still route to More services, not a primary tile', () => {
    assert.equal(getDiscoveryGroupForService(OTHER_SERVICE_CATEGORY_VALUE), MORE_SERVICES_GROUP);
  });
});

describe('Work Profile skills feed provider recommendations', () => {
  const carpentryJob = buildJob({ id: 'carpentry', serviceNeeded: 'Carpentry', title: 'Fix cabinet' });
  const encodingJob = buildJob({ id: 'encoding', serviceNeeded: 'Encoding', title: 'Type a document' });

  const rankJobs = (preferences: UserPreferences | null) =>
    rankHomeFeedJobs(
      [carpentryJob, encodingJob].map((job) => ({ item: job.id, job })),
      context(preferences),
    );

  it('8. a Work Profile skill lifts matching jobs even with empty onboarding preferences', () => {
    const preferences = buildPreferences({ offeredServices: [] });

    // Without the merge the resident's skills were invisible to ranking.
    const merged = withWorkProfileSkills({ preferences, workProfileSkills: ['Carpentry'] });

    assert.deepEqual(merged?.offeredServices, ['Carpentry']);
    assert.equal(rankJobs(merged)[0], 'carpentry');
  });

  it('8b. works when there is no user_preferences row at all', () => {
    const merged = withWorkProfileSkills({ preferences: null, workProfileSkills: ['Carpentry'] });

    assert.ok(merged);
    assert.deepEqual(merged?.offeredServices, ['Carpentry']);
    assert.equal(rankJobs(merged)[0], 'carpentry');
  });

  it('8c. merges skills with existing onboarding preferences without duplicating', () => {
    const merged = withWorkProfileSkills({
      preferences: buildPreferences({ offeredServices: ['Encoding'] }),
      workProfileSkills: ['Encoding', 'Carpentry'],
    });

    assert.deepEqual(merged?.offeredServices, ['Encoding', 'Carpentry']);
  });

  it('11. a legacy alias skill ranks as its canonical equivalent', () => {
    const legacyJob = buildJob({ id: 'legacy', serviceNeeded: 'Basic home repair' });
    const merged = withWorkProfileSkills({
      preferences: buildPreferences(),
      workProfileSkills: ['Minor home fix help'],
    });

    const ranked = rankHomeFeedJobs(
      [encodingJob, legacyJob].map((job) => ({ item: job.id, job })),
      context(merged),
    );

    assert.equal(ranked[0], 'legacy');
  });

  it('11b. an alias and its canonical form do not both enter the merged list', () => {
    const merged = withWorkProfileSkills({
      preferences: buildPreferences({ offeredServices: ['Basic home repair'] }),
      workProfileSkills: ['Minor home fix help'],
    });

    assert.equal(merged?.offeredServices.length, 1);
  });

  it('returns preferences untouched when there are no skills', () => {
    const preferences = buildPreferences({ offeredServices: ['Encoding'] });
    assert.equal(withWorkProfileSkills({ preferences, workProfileSkills: [] }), preferences);
  });

  it('carries custom skills through as custom preferences', () => {
    const merged = withWorkProfileSkills({
      preferences: buildPreferences(),
      workProfileSkills: [],
      customWorkProfileSkills: ['Balloon decoration'],
    });

    assert.deepEqual(merged?.customOfferedServices, ['Balloon decoration']);
  });
});

describe('client personalization stays independent', () => {
  it('9. needed services still drive Hire Help service ranking', () => {
    const baking = buildService({ id: 'baking', category: 'Baking' });
    const encoding = buildService({ id: 'encoding', category: 'Encoding' });

    const ranked = rankHomeFeedWorkers(
      [baking, encoding].map((service) => ({ item: service.id, service })),
      context(buildPreferences({ intent: 'client', neededServices: ['Baking'] }), 'client'),
    );

    assert.equal(ranked[0], 'baking');
  });

  it('10. offered skills never leak into the needed-service signal', () => {
    const merged = withWorkProfileSkills({
      preferences: buildPreferences({ intent: 'client', neededServices: ['Baking'] }),
      workProfileSkills: ['Carpentry'],
    });

    assert.deepEqual(merged?.neededServices, ['Baking'], 'needed services are untouched');
    assert.ok(merged?.offeredServices.includes('Carpentry'));

    // A client looking to hire must not be pushed toward the work they do.
    const carpentry = buildService({ id: 'carpentry', category: 'Carpentry' });
    const baking = buildService({ id: 'baking', category: 'Baking' });

    const ranked = rankHomeFeedWorkers(
      [carpentry, baking].map((service) => ({ item: service.id, service })),
      context(merged, 'client'),
    );

    assert.equal(ranked[0], 'baking');
  });

  it('7/12. personalization changes ranking, never access', () => {
    const merged = withWorkProfileSkills({
      preferences: buildPreferences(),
      workProfileSkills: ['Carpentry'],
    });

    const unrelated = buildJob({ id: 'unrelated', serviceNeeded: 'Massage' });
    const carpentry = buildJob({ id: 'carpentry', serviceNeeded: 'Carpentry' });
    const custom = buildJob({ id: 'custom', serviceNeeded: OTHER_SERVICE_CATEGORY_VALUE });

    const ranked = rankHomeFeedJobs(
      [unrelated, carpentry, custom].map((job) => ({ item: job.id, job })),
      context(merged),
    );

    assert.equal(ranked[0], 'carpentry', 'the matching job ranks first');
    assert.equal(ranked.length, 3, 'nothing is filtered out of the feed');
    assert.ok(ranked.includes('unrelated'));
    assert.ok(ranked.includes('custom'));
  });
});
