/**
 * Search and discovery behaviour for the expanded taxonomy.
 *
 * These exercise the same taxonomy helpers the Search screen uses for its
 * group/service filtering, plus a small stand-in for the text predicate that
 * `searchServices` builds, so the one-primary-service rule is covered.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDiscoveryGroupForService,
  getDiscoveryGroupsForWorkType,
  getOrderedDiscoveryGroupsForMode,
  getServicesForDiscoveryGroup,
  getServiceSearchValues,
  HOME_DISCOVERY_GROUPS,
  MORE_SERVICES_GROUP,
  OTHER_SERVICE_CATEGORY_VALUE,
  SEARCH_DISCOVERY_GROUPS,
  type DiscoveryGroupKey,
} from '@/constants/service-taxonomy';
import { normalizeServiceText } from '@/services/service-classification';

type Listing = {
  category: string;
  customCategory?: string | null;
  title: string;
  description: string;
  tags: string[];
};

/** Mirrors the `matchesGroup` predicate used by the Search screen. */
function matchesGroup(listing: Listing, group: DiscoveryGroupKey | 'all') {
  if (group === 'all') return true;
  return getDiscoveryGroupForService(listing.category) === group;
}

/** Mirrors the structured canonical-service filter (`category IN (...)`). */
function matchesServiceFilter(listing: Listing, service: string) {
  return getServiceSearchValues(service).some(
    (value) => normalizeServiceText(value) === normalizeServiceText(listing.category),
  );
}

/** Mirrors the free-text `.or(...)` predicate in `searchServices`. */
function matchesText(listing: Listing, text: string) {
  const needle = normalizeServiceText(text);
  if (!needle) return true;

  return [
    listing.title,
    listing.description,
    listing.category,
    listing.customCategory ?? '',
    ...listing.tags,
  ].some((field) => normalizeServiceText(field).includes(needle));
}

const birthdayCakes: Listing = {
  category: 'Baking',
  customCategory: 'Birthday cakes',
  title: 'Custom birthday cakes for any occasion',
  description: 'Made to order cakes and cupcakes.',
  tags: ['Cakes', 'Advance order'],
};

const balloonDecoration: Listing = {
  category: OTHER_SERVICE_CATEGORY_VALUE,
  customCategory: 'Balloon decoration',
  title: 'Balloon decoration for parties',
  description: 'Balloon arches and centerpieces.',
  tags: [],
};

/** One primary service (Haircut), with Makeup only as a bundled extra. */
const haircutAndMakeup: Listing = {
  category: 'Haircut',
  customCategory: null,
  title: 'Haircut and makeup package',
  description: 'Home service haircut, with makeup available as an add-on.',
  tags: ['Home service', 'Makeup'],
};

describe('search and discovery filters', () => {
  it('1. the canonical service filter matches the primary service', () => {
    assert.equal(matchesServiceFilter(birthdayCakes, 'Baking'), true);
    assert.equal(matchesServiceFilter(birthdayCakes, 'Sewing'), false);
  });

  it('2. the discovery-group filter works for new taxonomy services', () => {
    assert.equal(matchesGroup(birthdayCakes, 'Food & Baking'), true);
    assert.equal(matchesGroup(birthdayCakes, 'Home & Errands'), false);
    assert.equal(matchesGroup(haircutAndMakeup, 'Beauty & Personal Care'), true);
  });

  it('3. custom_category participates in free-text search', () => {
    assert.equal(matchesText(balloonDecoration, 'balloon'), true);
    assert.equal(matchesText(birthdayCakes, 'birthday cakes'), true);
  });

  it('4. tags and specialties participate in free-text search', () => {
    assert.equal(matchesText(haircutAndMakeup, 'makeup'), true);
    assert.equal(matchesText(birthdayCakes, 'advance order'), true);
  });

  it('5. More services finds genuinely custom listings', () => {
    assert.equal(matchesGroup(balloonDecoration, MORE_SERVICES_GROUP), true);
    assert.equal(getDiscoveryGroupForService(balloonDecoration.category), MORE_SERVICES_GROUP);
  });

  it('6/7. Home renders exactly the eight primary groups, without More services', () => {
    assert.equal(HOME_DISCOVERY_GROUPS.length, 8);
    assert.equal((HOME_DISCOVERY_GROUPS as readonly string[]).includes(MORE_SERVICES_GROUP), false);

    const ordered = getOrderedDiscoveryGroupsForMode({
      groups: HOME_DISCOVERY_GROUPS,
      mode: 'workers',
      preferences: null,
    });

    assert.equal(ordered.length, 8);
    assert.deepEqual([...ordered].sort(), [...HOME_DISCOVERY_GROUPS].sort());
  });

  it('7b. personalization reorders Home groups without removing any', () => {
    const ordered = getOrderedDiscoveryGroupsForMode({
      groups: HOME_DISCOVERY_GROUPS,
      mode: 'workers',
      preferences: {
        customNeededServices: [],
        customOfferedServices: [],
        intent: 'client',
        neededServices: ['Massage'],
        offeredDeliveryMode: null,
        offeredServices: [],
        onboardingCompletedAt: null,
      },
    });

    assert.equal(ordered[0], 'Beauty & Personal Care', 'preferred group ranks first');
    assert.equal(ordered.length, 8, 'personalization changes ranking, not access');
  });

  it('8. every new taxonomy service sits in its expected group', () => {
    assert.equal(getDiscoveryGroupForService('Carpentry'), 'Home Repair & Carpentry');
    assert.equal(getDiscoveryGroupForService('Massage'), 'Beauty & Personal Care');
    assert.equal(getDiscoveryGroupForService('Party food trays'), 'Food & Baking');
    assert.equal(
      getDiscoveryGroupForService('Phone or computer repair'),
      'Computer & Phone Help',
    );
  });

  it('9. legacy aliases resolve in Search', () => {
    const legacyListing: Listing = { ...birthdayCakes, category: 'Basic home repair' };

    assert.equal(matchesServiceFilter(legacyListing, 'Minor home fix help'), true);
    assert.equal(matchesGroup(legacyListing, 'Home Repair & Carpentry'), true);
    assert.ok(getServiceSearchValues('Minor home fix help').includes('Basic home repair'));
  });

  it('10. an unrelated group filter does not return Other-service listings', () => {
    HOME_DISCOVERY_GROUPS.forEach((group) => {
      assert.equal(
        matchesGroup(balloonDecoration, group),
        false,
        `custom listing must not appear under ${group}`,
      );
    });
  });

  it('More services stays reachable under every work-type filter', () => {
    (['physical', 'digital', 'either'] as const).forEach((workType) => {
      const groups = getDiscoveryGroupsForWorkType(workType);
      assert.ok(
        groups.includes(MORE_SERVICES_GROUP),
        `More services should survive the ${workType} filter`,
      );
    });
  });

  it('More services exposes no canonical services of its own', () => {
    assert.deepEqual(getServicesForDiscoveryGroup(MORE_SERVICES_GROUP), []);
    assert.equal(SEARCH_DISCOVERY_GROUPS.length, 9);
  });
});

describe('one primary service per listing', () => {
  it('T. a bundled extra appears under the primary service filter', () => {
    assert.equal(matchesServiceFilter(haircutAndMakeup, 'Haircut'), true);
    assert.equal(matchesGroup(haircutAndMakeup, 'Beauty & Personal Care'), true);
  });

  it('T2. a bundled extra is findable by free text', () => {
    assert.equal(matchesText(haircutAndMakeup, 'makeup'), true);
  });

  it('T3. a bundled extra does NOT make it a Makeup-primary listing', () => {
    assert.equal(
      matchesServiceFilter(haircutAndMakeup, 'Makeup'),
      false,
      'Makeup is an extra in the title/tags, not the primary classification',
    );
    assert.equal(getDiscoveryGroupForService(haircutAndMakeup.category), 'Beauty & Personal Care');
  });

  it('U. multiple extras never create multiple primary classifications', () => {
    const bundled: Listing = {
      category: 'Cleaning',
      customCategory: null,
      title: 'Cleaning, laundry and errands package',
      description: 'General help including laundry and errands.',
      tags: ['Laundry help', 'Errands'],
    };

    assert.equal(getDiscoveryGroupForService(bundled.category), 'Home & Errands');
    assert.equal(matchesServiceFilter(bundled, 'Cleaning'), true);
    assert.equal(matchesServiceFilter(bundled, 'Laundry help'), false);
    assert.equal(matchesServiceFilter(bundled, 'Errands'), false);
    assert.equal(matchesText(bundled, 'laundry'), true);
  });
});
