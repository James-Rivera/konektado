/**
 * Deterministic service-listing classification.
 *
 * Konektado needs usable classification on every listing, but residents must
 * not be forced to understand or repeatedly re-pick taxonomy structure. The
 * Work Profile already records what a resident can do, so it is the primary
 * source; typed text is only ever resolved deterministically, and inference
 * may SUGGEST but never silently assign.
 *
 * There is deliberately no AI, no remote classifier, and no network call in
 * this module: listing creation has to work on a low-end device with poor
 * connectivity, and a misclassification must always be explainable to the
 * resident who is looking at it.
 */
import {
  BLOCKED_SERVICE_TERMS,
  getStoredMvpServiceOption,
  isMvpServiceOption,
  isOtherServiceCategoryValue,
  LEGACY_MVP_SERVICE_ALIASES,
  MVP_SERVICE_OPTIONS,
  MVP_SERVICE_TAGS,
  OTHER_SERVICE_CATEGORY_VALUE,
  type MvpServiceOption,
} from '@/constants/service-taxonomy';

/** Where a listing's classification came from. Surfaced as provenance copy. */
export type ClassificationSource =
  | 'existing'
  | 'profile-origin'
  | 'single-skill'
  | 'chooser'
  | 'suggestion'
  | 'custom';

export type SuggestionConfidence = 'exact' | 'alias' | 'keyword';

export type ServiceSuggestion = {
  service: MvpServiceOption;
  confidence: SuggestionConfidence;
  /** The taxonomy text that matched, for explainable "why" copy. */
  matchedOn: string;
};

export type ResolvedClassification = {
  /** Null means the resident still has to choose or type something. */
  canonicalService: MvpServiceOption | null;
  source: ClassificationSource | null;
  /** True when the chooser must be shown before the listing editor. */
  needsChooser: boolean;
};

/** What actually gets written to `services` / `service_drafts`. */
export type ListingClassificationRecord = {
  category: string;
  customCategory: string | null;
  reviewStatus: 'none' | 'pending';
};

export type BlockedServiceCheck = {
  blocked: boolean;
  matchedTerm: string | null;
};

/** Longest custom-service text we will consider. Guards pathological input. */
export const MAX_CUSTOM_SERVICE_LENGTH = 80;

/**
 * Lowercase, strip punctuation, collapse whitespace. Shared by every lookup so
 * "Birthday Cakes!", "birthday  cakes" and "BIRTHDAY CAKES" behave the same.
 */
export function normalizeServiceText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Product-scope guard for the custom-service escape hatch.
 *
 * Matches on whole normalized words so "electrical wiring" is blocked while an
 * unrelated word that merely contains a blocked substring is not. Blocked text
 * is reported back to the caller so the UI can say which part was the problem
 * instead of silently dropping the submission.
 */
export function checkBlockedServiceText(value: string | null | undefined): BlockedServiceCheck {
  const normalized = normalizeServiceText(value);
  if (!normalized) return { blocked: false, matchedTerm: null };

  const paddedHaystack = ` ${normalized} `;

  for (const term of BLOCKED_SERVICE_TERMS) {
    const normalizedTerm = normalizeServiceText(term);
    if (!normalizedTerm) continue;

    if (paddedHaystack.includes(` ${normalizedTerm} `)) {
      return { blocked: true, matchedTerm: term };
    }
  }

  return { blocked: false, matchedTerm: null };
}

type SuggestionCandidate = ServiceSuggestion & { rank: number };

/**
 * Deterministic suggestions for free text the resident typed.
 *
 * Tiers, best first:
 *   exact   - the text IS a canonical service or a known alias
 *   alias   - a canonical service or alias appears as a phrase in the text
 *   keyword - a suggested service tag appears as a phrase in the text
 *
 * Never returns a match for text that shares no whole word with the taxonomy,
 * so unrelated input stays unclassified rather than being forced into the
 * nearest-looking category.
 */
export function suggestServicesForText(
  value: string | null | undefined,
  limit = 3,
): ServiceSuggestion[] {
  const normalized = normalizeServiceText(value);
  if (!normalized || limit <= 0) return [];

  // An exact canonical/alias hit is authoritative; skip the weaker tiers.
  const exactMatch = getStoredMvpServiceOption(value);
  if (exactMatch) {
    return [{ service: exactMatch, confidence: 'exact', matchedOn: exactMatch }];
  }

  const paddedHaystack = ` ${normalized} `;
  const bestByService = new Map<MvpServiceOption, SuggestionCandidate>();

  const consider = (
    service: MvpServiceOption,
    phrase: string,
    confidence: SuggestionConfidence,
    rank: number,
  ) => {
    const normalizedPhrase = normalizeServiceText(phrase);
    if (!normalizedPhrase) return;
    if (!paddedHaystack.includes(` ${normalizedPhrase} `)) return;

    const existing = bestByService.get(service);
    // Prefer the stronger tier, then the longer (more specific) phrase.
    if (
      existing &&
      (existing.rank < rank ||
        (existing.rank === rank &&
          normalizeServiceText(existing.matchedOn).length >= normalizedPhrase.length))
    ) {
      return;
    }

    bestByService.set(service, { service, confidence, matchedOn: phrase, rank });
  };

  MVP_SERVICE_OPTIONS.forEach((service) => consider(service, service, 'alias', 1));

  Object.entries(LEGACY_MVP_SERVICE_ALIASES).forEach(([alias, service]) => {
    consider(service, alias, 'alias', 1);
  });

  MVP_SERVICE_OPTIONS.forEach((service) => {
    MVP_SERVICE_TAGS[service].forEach((tag) => consider(service, tag, 'keyword', 2));
  });

  return [...bestByService.values()]
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;

      const lengthDiff =
        normalizeServiceText(right.matchedOn).length - normalizeServiceText(left.matchedOn).length;
      if (lengthDiff !== 0) return lengthDiff;

      return left.service.localeCompare(right.service);
    })
    .slice(0, Math.max(0, limit))
    .map(({ service, confidence, matchedOn }) => ({ service, confidence, matchedOn }));
}

/**
 * Normalizes Work Profile skills into canonical services, resolving legacy
 * aliases and dropping duplicates and sentinels. Order is preserved so the
 * chooser shows the resident's skills the way their profile lists them.
 */
export function getCanonicalWorkProfileSkills(
  skills: (string | null | undefined)[],
): MvpServiceOption[] {
  const seen = new Set<MvpServiceOption>();

  skills.forEach((skill) => {
    const canonical = getStoredMvpServiceOption(skill);
    if (canonical) seen.add(canonical);
  });

  return [...seen];
}

/**
 * Decides the starting classification for a Create Service session.
 *
 * Priority:
 *   1. an existing listing/draft value  - editing never re-infers
 *   2. an explicit Work Profile origin  - "Create listing" from a skill
 *   3. a sole Work Profile skill        - preselected, labelled, changeable
 *   4. several skills                   - chooser; never `skills[0]`
 *   5. no usable skill                  - resident describes it in own words
 */
export function resolveInitialClassification({
  originSkill,
  storedCategory,
  workProfileSkills,
}: {
  originSkill?: string | null;
  storedCategory?: string | null;
  workProfileSkills: (string | null | undefined)[];
}): ResolvedClassification {
  const storedValue = storedCategory?.trim();

  if (storedValue) {
    // The `Other service` sentinel is a real stored classification: an
    // unknown custom listing must survive editing without being re-inferred.
    if (isOtherServiceCategoryValue(storedValue)) {
      return { canonicalService: null, source: 'existing', needsChooser: false };
    }

    const storedCanonical = getStoredMvpServiceOption(storedValue);
    if (storedCanonical) {
      return { canonicalService: storedCanonical, source: 'existing', needsChooser: false };
    }
  }

  const originCanonical = getStoredMvpServiceOption(originSkill);
  if (originCanonical) {
    return { canonicalService: originCanonical, source: 'profile-origin', needsChooser: false };
  }

  const canonicalSkills = getCanonicalWorkProfileSkills(workProfileSkills);

  if (canonicalSkills.length === 1) {
    return { canonicalService: canonicalSkills[0], source: 'single-skill', needsChooser: false };
  }

  if (canonicalSkills.length > 1) {
    // Deliberately no `canonicalSkills[0]` fallback: silently picking the
    // first skill is how multi-skilled residents got misclassified before.
    return { canonicalService: null, source: null, needsChooser: true };
  }

  return { canonicalService: null, source: null, needsChooser: false };
}

/**
 * Builds the values written to `services` / `service_drafts`.
 *
 * A more specific wording under a known service ("Birthday cakes" under
 * Baking) is a custom SPECIALTY, not a taxonomy problem: it keeps the
 * canonical service for filtering, preserves the resident's words for display
 * and search, and is never marked pending. Only a genuinely unknown service
 * uses the `Other service` sentinel and the pending editorial signal.
 */
export function buildListingClassification({
  canonicalService,
  customWording,
}: {
  canonicalService: string | null | undefined;
  customWording?: string | null;
}): ListingClassificationRecord {
  const wording = customWording?.trim() || null;
  const canonical = getStoredMvpServiceOption(canonicalService);

  if (canonical) {
    // Drop wording that just repeats the canonical label.
    const isRedundant = wording ? normalizeServiceText(wording) === normalizeServiceText(canonical) : true;

    return {
      category: canonical,
      customCategory: isRedundant ? null : wording,
      reviewStatus: 'none',
    };
  }

  return {
    category: OTHER_SERVICE_CATEGORY_VALUE,
    customCategory: wording,
    reviewStatus: wording ? 'pending' : 'none',
  };
}

/**
 * True when a listing's stored classification is a genuinely unknown service
 * rather than a canonical one. Used by discovery to route it to
 * `More services`.
 */
export function isUnknownCustomListing(category: string | null | undefined): boolean {
  const value = category?.trim();
  if (!value) return false;
  return isOtherServiceCategoryValue(value) || (!isMvpServiceOption(value) && !getStoredMvpServiceOption(value));
}

/**
 * Whether publishing this listing should offer to add the service to the
 * resident's Work Profile. Only canonical services are offered, and only when
 * the profile does not already cover them.
 */
export function shouldSuggestAddingToWorkProfile({
  publishedCategory,
  workProfileSkills,
}: {
  publishedCategory: string | null | undefined;
  workProfileSkills: (string | null | undefined)[];
}): MvpServiceOption | null {
  const canonical = getStoredMvpServiceOption(publishedCategory);
  if (!canonical) return null;

  const existing = getCanonicalWorkProfileSkills(workProfileSkills);
  return existing.includes(canonical) ? null : canonical;
}
