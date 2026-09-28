/**
 * Taxonomy integrity.
 *
 * These tests run against the real exported taxonomy, not a copy, so a service
 * added without its metadata fails here even in the cases TypeScript cannot
 * catch on its own.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCategoryForMvpService,
  getDiscoveryGroupForService,
  getServicesForDiscoveryGroup,
  getStoredMvpServiceOption,
  getTagsForMvpService,
  getWorkTypeForMvpService,
  HOME_DISCOVERY_GROUPS,
  isMvpServiceOption,
  LEGACY_MVP_SERVICE_ALIASES,
  MORE_SERVICES_GROUP,
  MVP_SERVICE_CATEGORIES,
  MVP_SERVICE_OPTIONS,
  MVP_SERVICES_BY_CATEGORY,
  OTHER_SERVICE_CATEGORY_VALUE,
  OTHER_SERVICE_OPTION,
  SEARCH_DISCOVERY_GROUPS,
  SEARCH_DISCOVERY_SERVICES_BY_GROUP,
  type MvpServiceOption,
} from '@/constants/service-taxonomy';

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

describe('taxonomy integrity', () => {
  it('exposes the expected canonical shape', () => {
    assert.equal(MVP_SERVICE_CATEGORIES.length, 4);
    assert.equal(MVP_SERVICE_OPTIONS.length, 34);
    assert.equal(new Set(MVP_SERVICE_OPTIONS).size, 34, 'canonical services must be unique');
  });

  it('1. every canonical service belongs to exactly one canonical category', () => {
    MVP_SERVICE_OPTIONS.forEach((service) => {
      const owners = MVP_SERVICE_CATEGORIES.filter((category) =>
        (MVP_SERVICES_BY_CATEGORY[category] as readonly string[]).includes(service),
      );

      assert.equal(owners.length, 1, `${service} must have exactly one category, got ${owners.length}`);
      assert.equal(getCategoryForMvpService(service), owners[0]);
    });
  });

  it('2. every canonical service belongs to exactly one primary discovery group', () => {
    MVP_SERVICE_OPTIONS.forEach((service) => {
      const owners = SEARCH_DISCOVERY_GROUPS.filter((group) =>
        (SEARCH_DISCOVERY_SERVICES_BY_GROUP[group] as readonly string[]).includes(service),
      );

      assert.equal(owners.length, 1, `${service} must have exactly one discovery group`);
      assert.equal(getDiscoveryGroupForService(service), owners[0]);
    });
  });

  it('3. every canonical service has a work-type mapping', () => {
    MVP_SERVICE_OPTIONS.forEach((service) => {
      const workType = getWorkTypeForMvpService(service);
      assert.ok(
        workType === 'physical' || workType === 'digital' || workType === 'either',
        `${service} has no usable work type (got ${String(workType)})`,
      );
    });
  });

  it('4. every canonical service has non-empty service tags', () => {
    MVP_SERVICE_OPTIONS.forEach((service) => {
      const tags = getTagsForMvpService(service);
      assert.ok(tags.length > 0, `${service} has no suggested tags`);
    });
  });

  it('5. every alias resolves to an existing canonical service', () => {
    Object.entries(LEGACY_MVP_SERVICE_ALIASES).forEach(([alias, service]) => {
      assert.ok(
        isMvpServiceOption(service),
        `alias "${alias}" points at "${service}", which is not a canonical service`,
      );
      assert.equal(getStoredMvpServiceOption(alias), service);
    });
  });

  it('6. no two normalized aliases map to conflicting canonical services', () => {
    const byNormalized = new Map<string, { alias: string; service: MvpServiceOption }>();

    Object.entries(LEGACY_MVP_SERVICE_ALIASES).forEach(([alias, service]) => {
      const key = normalize(alias);
      const existing = byNormalized.get(key);

      assert.ok(
        !existing || existing.service === service,
        `aliases "${existing?.alias}" and "${alias}" normalize alike but map to ` +
          `"${existing?.service}" and "${service}"`,
      );

      byNormalized.set(key, { alias, service });
    });
  });

  it('6b. no alias normalizes onto a different canonical service label', () => {
    const canonicalByNormalized = new Map(
      MVP_SERVICE_OPTIONS.map((service) => [normalize(service), service]),
    );

    Object.entries(LEGACY_MVP_SERVICE_ALIASES).forEach(([alias, service]) => {
      const canonicalCollision = canonicalByNormalized.get(normalize(alias));

      assert.ok(
        !canonicalCollision || canonicalCollision === service,
        `alias "${alias}" shadows canonical "${canonicalCollision}" but maps to "${service}"`,
      );
    });
  });

  it('7. the Other sentinels are not canonical services', () => {
    assert.equal(isMvpServiceOption(OTHER_SERVICE_OPTION), false);
    assert.equal(isMvpServiceOption(OTHER_SERVICE_CATEGORY_VALUE), false);
    assert.equal(MVP_SERVICE_OPTIONS.includes(OTHER_SERVICE_OPTION as never), false);
    assert.equal(MVP_SERVICE_OPTIONS.includes(OTHER_SERVICE_CATEGORY_VALUE as never), false);
    assert.equal(getStoredMvpServiceOption(OTHER_SERVICE_CATEGORY_VALUE), null);
  });

  it('8. Home has exactly eight primary discovery groups', () => {
    assert.equal(HOME_DISCOVERY_GROUPS.length, 8);
    assert.equal(new Set(HOME_DISCOVERY_GROUPS).size, 8);
  });

  it('9. More services is not one of the eight Home groups', () => {
    assert.equal(
      (HOME_DISCOVERY_GROUPS as readonly string[]).includes(MORE_SERVICES_GROUP),
      false,
      'More services must stay a Search/See-all fallback, never a ninth Home tile',
    );
  });

  it('10. Search knows about More services', () => {
    assert.ok((SEARCH_DISCOVERY_GROUPS as readonly string[]).includes(MORE_SERVICES_GROUP));
    assert.equal(SEARCH_DISCOVERY_GROUPS.length, HOME_DISCOVERY_GROUPS.length + 1);
    assert.deepEqual(getServicesForDiscoveryGroup(MORE_SERVICES_GROUP), []);
    assert.equal(getDiscoveryGroupForService(OTHER_SERVICE_CATEGORY_VALUE), MORE_SERVICES_GROUP);
  });

  it('12. no canonical service disappears from onboarding or Search surfaces', () => {
    const groupedServices = SEARCH_DISCOVERY_GROUPS.flatMap((group) => [
      ...SEARCH_DISCOVERY_SERVICES_BY_GROUP[group],
    ]);
    const categorisedServices = MVP_SERVICE_CATEGORIES.flatMap((category) => [
      ...MVP_SERVICES_BY_CATEGORY[category],
    ]);

    assert.deepEqual(
      [...groupedServices].sort(),
      [...MVP_SERVICE_OPTIONS].sort(),
      'Search discovery groups must cover exactly the canonical services',
    );
    assert.deepEqual(
      [...categorisedServices].sort(),
      [...MVP_SERVICE_OPTIONS].sort(),
      'onboarding categories must cover exactly the canonical services',
    );
  });

  it('12b. the approved expansion services are present and grouped correctly', () => {
    const expected: Record<string, string> = {
      Carpentry: 'Home Repair & Carpentry',
      Painting: 'Home Repair & Carpentry',
      'Furniture repair or assembly': 'Home Repair & Carpentry',
      'Minor home fix help': 'Home Repair & Carpentry',
      Baking: 'Food & Baking',
      'Home-cooked meals': 'Food & Baking',
      'Party food trays': 'Food & Baking',
      Sewing: 'Sewing & Tailoring',
      'Clothing alteration or repair': 'Sewing & Tailoring',
      'Manicure or pedicure': 'Beauty & Personal Care',
      Haircut: 'Beauty & Personal Care',
      Makeup: 'Beauty & Personal Care',
      Massage: 'Beauty & Personal Care',
      'Phone or computer repair': 'Computer & Phone Help',
    };

    Object.entries(expected).forEach(([service, group]) => {
      assert.ok(isMvpServiceOption(service), `${service} should be canonical`);
      assert.equal(getDiscoveryGroupForService(service), group);
    });
  });

  it('12c. excluded trades are not canonical services', () => {
    ['Electrical work', 'Electrician', 'Plumbing', 'Plumber', 'Construction'].forEach((value) => {
      assert.equal(isMvpServiceOption(value), false, `${value} must not be canonical`);
      assert.equal(getStoredMvpServiceOption(value), null, `${value} must not resolve via aliases`);
    });
  });
});
