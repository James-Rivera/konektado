/**
 * Home "For you" personalization with the expanded taxonomy.
 *
 * Personalization must change RANKING, not access, and a listing stored under
 * a legacy alias must not be penalised against the canonical preference it
 * belongs to.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { rankHomeFeedJobs, type HomeFeedRankingContext } from '@/services/home-feed.service';
import type { JobSummary } from '@/types/marketplace.types';
import type { UserPreferences } from '@/types/onboarding.types';

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

function buildPreferences(offeredServices: string[]): UserPreferences {
  return {
    customNeededServices: [],
    customOfferedServices: [],
    intent: 'provider',
    neededServices: [],
    offeredDeliveryMode: null,
    offeredServices,
    onboardingCompletedAt: '2026-09-01T00:00:00.000Z',
  };
}

const context = (preferences: UserPreferences | null): HomeFeedRankingContext => ({
  activeRole: 'provider',
  city: 'Sto. Tomas',
  preferences,
  userBarangay: 'Barangay San Pedro',
});

function rankIds(jobs: JobSummary[], preferences: UserPreferences | null) {
  return rankHomeFeedJobs(
    jobs.map((job) => ({ item: job.id, job })),
    context(preferences),
  );
}

describe('Home personalization with new taxonomy services', () => {
  it('ranks a matching new-taxonomy service first', () => {
    const baking = buildJob({
      id: 'baking',
      category: 'Food & Personal Services',
      serviceNeeded: 'Baking',
      title: 'Need a birthday cake',
    });
    const cleaning = buildJob({
      id: 'cleaning',
      category: 'Home & Local Help',
      serviceNeeded: 'Cleaning',
      title: 'House cleaning help',
    });

    assert.deepEqual(rankIds([cleaning, baking], buildPreferences(['Baking'])), [
      'baking',
      'cleaning',
    ]);
  });

  it('ranks Carpentry and Massage preferences against the new services', () => {
    const carpentry = buildJob({ id: 'carpentry', serviceNeeded: 'Carpentry', title: 'Fix cabinet' });
    const massage = buildJob({ id: 'massage', serviceNeeded: 'Massage', title: 'Home massage' });

    assert.equal(rankIds([massage, carpentry], buildPreferences(['Carpentry']))[0], 'carpentry');
    assert.equal(rankIds([carpentry, massage], buildPreferences(['Massage']))[0], 'massage');
  });

  it('gives a legacy-alias listing the same rank as its canonical preference', () => {
    const legacyRepair = buildJob({
      id: 'legacy-repair',
      serviceNeeded: 'Basic home repair',
      title: 'Fix a loose hinge',
    });
    const unrelated = buildJob({
      id: 'unrelated',
      serviceNeeded: 'Encoding',
      title: 'Type a document',
    });

    // Before the alias fix, `Basic home repair` scored zero here.
    assert.deepEqual(rankIds([unrelated, legacyRepair], buildPreferences(['Minor home fix help'])), [
      'legacy-repair',
      'unrelated',
    ]);
  });

  it('changes ranking without removing access', () => {
    const baking = buildJob({ id: 'baking', serviceNeeded: 'Baking' });
    const sewing = buildJob({ id: 'sewing', serviceNeeded: 'Sewing' });
    const unknown = buildJob({ id: 'unknown', serviceNeeded: 'Other service' });

    const ranked = rankIds([baking, sewing, unknown], buildPreferences(['Sewing']));

    assert.equal(ranked[0], 'sewing');
    assert.equal(ranked.length, 3, 'every job stays in the feed regardless of preferences');
    assert.ok(ranked.includes('unknown'), 'custom listings are never filtered out by preferences');
  });

  it('still ranks when the resident has no preferences at all', () => {
    const baking = buildJob({ id: 'baking', serviceNeeded: 'Baking' });
    const sewing = buildJob({ id: 'sewing', serviceNeeded: 'Sewing' });

    assert.equal(rankIds([baking, sewing], null).length, 2);
  });
});
