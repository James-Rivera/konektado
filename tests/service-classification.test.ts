/**
 * Deterministic listing-classification behaviour.
 *
 * Every assertion calls the real `services/service-classification` module that
 * the Create Service screen uses; the algorithm is never re-implemented here.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OTHER_SERVICE_CATEGORY_VALUE } from '@/constants/service-taxonomy';
import {
  buildListingClassification,
  checkBlockedServiceText,
  getCanonicalWorkProfileSkills,
  isUnknownCustomListing,
  normalizeServiceText,
  resolveInitialClassification,
  shouldSuggestAddingToWorkProfile,
  suggestServicesForText,
} from '@/services/service-classification';

const topSuggestion = (text: string) => suggestServicesForText(text)[0]?.service ?? null;

describe('classification source priority', () => {
  it('A. zero Work Profile skills produces no silent classification', () => {
    const result = resolveInitialClassification({ workProfileSkills: [] });

    assert.equal(result.canonicalService, null);
    assert.equal(result.needsChooser, false);
    assert.equal(result.source, null);
  });

  it('B. exactly one skill initialises the classification from it', () => {
    const result = resolveInitialClassification({ workProfileSkills: ['Baking'] });

    assert.equal(result.canonicalService, 'Baking');
    assert.equal(result.source, 'single-skill');
    assert.equal(result.needsChooser, false);
  });

  it('C. multiple skills never silently pick skills[0]', () => {
    const result = resolveInitialClassification({
      workProfileSkills: ['Baking', 'Sewing', 'Makeup'],
    });

    assert.equal(result.canonicalService, null, 'must not guess a primary service');
    assert.equal(result.needsChooser, true);
  });

  it('D. an explicit Work Profile origin wins over the skill list', () => {
    const result = resolveInitialClassification({
      originSkill: 'Sewing',
      workProfileSkills: ['Baking', 'Sewing', 'Makeup'],
    });

    assert.equal(result.canonicalService, 'Sewing');
    assert.equal(result.source, 'profile-origin');
    assert.equal(result.needsChooser, false);
  });

  it('E. editing an existing listing keeps the stored classification', () => {
    const result = resolveInitialClassification({
      storedCategory: 'Haircut',
      originSkill: 'Baking',
      workProfileSkills: ['Baking'],
    });

    assert.equal(result.canonicalService, 'Haircut');
    assert.equal(result.source, 'existing');
  });

  it('F. resuming a draft keeps the stored classification', () => {
    const result = resolveInitialClassification({
      storedCategory: 'Party food trays',
      workProfileSkills: ['Baking', 'Sewing'],
    });

    assert.equal(result.canonicalService, 'Party food trays');
    assert.equal(result.source, 'existing');
    assert.equal(result.needsChooser, false);
  });

  it('F2. an unknown custom listing survives editing without re-inference', () => {
    const result = resolveInitialClassification({
      storedCategory: OTHER_SERVICE_CATEGORY_VALUE,
      workProfileSkills: ['Baking', 'Sewing'],
    });

    assert.equal(result.source, 'existing');
    assert.equal(result.canonicalService, null);
    assert.equal(result.needsChooser, false, 'must not force a chooser over a custom listing');
  });

  it('resolves legacy stored values through aliases', () => {
    const result = resolveInitialClassification({
      storedCategory: 'Basic home repair',
      workProfileSkills: [],
    });

    assert.equal(result.canonicalService, 'Minor home fix help');
    assert.equal(result.source, 'existing');
  });
});

describe('text and alias matching', () => {
  it('G. exact canonical text resolves', () => {
    assert.equal(topSuggestion('Baking'), 'Baking');
    assert.equal(topSuggestion('Phone or computer repair'), 'Phone or computer repair');
  });

  it('H. existing legacy aliases resolve', () => {
    assert.equal(topSuggestion('Basic home repair'), 'Minor home fix help');
    assert.equal(topSuggestion('Data entry'), 'Encoding');
    assert.equal(topSuggestion('Wifi setup'), 'WiFi/router help');
  });

  it('I. local-language aliases resolve', () => {
    const expected: Record<string, string> = {
      panahi: 'Sewing',
      mananahi: 'Sewing',
      patahi: 'Sewing',
      karpintero: 'Carpentry',
      'lutong bahay': 'Home-cooked meals',
      pabili: 'Errands',
      gupit: 'Haircut',
      barbero: 'Haircut',
      masahe: 'Massage',
      'phone repair': 'Phone or computer repair',
      'laptop repair': 'Phone or computer repair',
      'birthday cake': 'Baking',
      tailoring: 'Sewing',
      bilao: 'Party food trays',
    };

    Object.entries(expected).forEach(([input, service]) => {
      assert.equal(topSuggestion(input), service, `"${input}" should suggest ${service}`);
    });
  });

  it('J. normalization handles case, punctuation and spacing', () => {
    assert.equal(normalizeServiceText('  Birthday   CAKES!! '), 'birthday cakes');
    assert.equal(topSuggestion('  KARPINTERO  '), 'Carpentry');
    assert.equal(topSuggestion('Lutong-bahay!'), 'Home-cooked meals');
    assert.equal(topSuggestion('phone   repair...'), 'Phone or computer repair');
  });

  it('J2. matches inside a natural sentence', () => {
    assert.equal(topSuggestion('marunong ako manahi ng damit'), null);
    assert.equal(topSuggestion('gumagawa ako ng birthday cake'), 'Baking');
    assert.equal(topSuggestion('nag-aayos ako ng cellphone repair'), 'Phone or computer repair');
  });

  it('K. unrelated text does not become an unrelated canonical service', () => {
    ['balloon decoration', 'zumba instructor', 'qwertyuiop', 'pet grooming'].forEach((text) => {
      assert.equal(topSuggestion(text), null, `"${text}" should not match a canonical service`);
    });
  });

  it('never suggests for blank or whitespace-only text', () => {
    assert.deepEqual(suggestServicesForText(''), []);
    assert.deepEqual(suggestServicesForText('   '), []);
    assert.deepEqual(suggestServicesForText(null), []);
    assert.deepEqual(suggestServicesForText(undefined), []);
  });

  it('returns at most the requested number of suggestions', () => {
    assert.ok(suggestServicesForText('home help cleaning laundry', 3).length <= 3);
    assert.deepEqual(suggestServicesForText('Baking', 0), []);
  });

  it('tolerates extremely long input', () => {
    const longText = `${'na '.repeat(400)}karpintero${' po'.repeat(400)}`;
    assert.equal(topSuggestion(longText), 'Carpentry');
  });
});

describe('custom specialty vs unknown service', () => {
  it('L. a confirmed specialty stores the canonical service and keeps the wording', () => {
    assert.equal(topSuggestion('Birthday cakes'), 'Baking');

    const record = buildListingClassification({
      canonicalService: 'Baking',
      customWording: 'Birthday cakes',
    });

    assert.equal(record.category, 'Baking');
    assert.equal(record.customCategory, 'Birthday cakes');
    assert.equal(record.reviewStatus, 'none', 'a specialty is not pending moderation');
    assert.equal(isUnknownCustomListing(record.category), false);
  });

  it('drops wording that merely repeats the canonical label', () => {
    const record = buildListingClassification({
      canonicalService: 'Baking',
      customWording: ' baking ',
    });

    assert.equal(record.customCategory, null);
  });

  it('M. a genuinely unknown service stays custom', () => {
    const record = buildListingClassification({
      canonicalService: null,
      customWording: 'Balloon decoration',
    });

    assert.equal(record.category, OTHER_SERVICE_CATEGORY_VALUE);
    assert.equal(record.customCategory, 'Balloon decoration');
    assert.equal(record.reviewStatus, 'pending');
    assert.equal(isUnknownCustomListing(record.category), true);
  });

  it('resolves a legacy alias rather than treating it as unknown', () => {
    const record = buildListingClassification({ canonicalService: 'Basic home repair' });
    assert.equal(record.category, 'Minor home fix help');
    assert.equal(record.reviewStatus, 'none');
  });

  it('handles blank and whitespace-only custom wording without a phantom pending row', () => {
    [null, '', '   '].forEach((wording) => {
      const record = buildListingClassification({ canonicalService: null, customWording: wording });
      assert.equal(record.category, OTHER_SERVICE_CATEGORY_VALUE);
      assert.equal(record.customCategory, null);
      assert.equal(record.reviewStatus, 'none');
    });
  });

  it('keeps punctuation in the resident wording it stores', () => {
    const record = buildListingClassification({
      canonicalService: null,
      customWording: "Balloon & party set-up (events)",
    });

    assert.equal(record.customCategory, 'Balloon & party set-up (events)');
  });
});

describe('blocked product scope', () => {
  it('Q. electrical work is rejected', () => {
    assert.equal(checkBlockedServiceText('Electrical wiring').blocked, true);
    assert.equal(checkBlockedServiceText('electrician').blocked, true);
    assert.equal(checkBlockedServiceText('kuryente').blocked, true);
  });

  it('R. plumbing is rejected', () => {
    assert.equal(checkBlockedServiceText('tubero').blocked, true);
    assert.equal(checkBlockedServiceText('Plumbing').blocked, true);
    assert.equal(checkBlockedServiceText('plumber').blocked, true);
  });

  it('S. broad repair wording never absorbs excluded work', () => {
    // A blocked phrase embedded in a longer, friendly-sounding sentence.
    const check = checkBlockedServiceText('home repair including electrical wiring and outlets');
    assert.equal(check.blocked, true);
    assert.ok(check.matchedTerm);

    // ...and the deterministic matcher must not quietly route it to carpentry.
    assert.notEqual(topSuggestion('electrical wiring'), 'Carpentry');
    assert.notEqual(topSuggestion('tubero'), 'Minor home fix help');
  });

  it('does not block legitimate services', () => {
    ['Carpentry', 'Minor home fix help', 'Balloon decoration', 'Painting', 'Baking'].forEach(
      (text) => {
        assert.equal(checkBlockedServiceText(text).blocked, false, `${text} should be allowed`);
      },
    );
  });

  it('reports the matched term instead of silently dropping input', () => {
    const check = checkBlockedServiceText('need a plumber today');
    assert.equal(check.blocked, true);
    assert.equal(typeof check.matchedTerm, 'string');
  });

  it('ignores blank input', () => {
    assert.equal(checkBlockedServiceText('').blocked, false);
    assert.equal(checkBlockedServiceText('   ').blocked, false);
    assert.equal(checkBlockedServiceText(null).blocked, false);
  });
});

describe('Work Profile skills normalisation', () => {
  it('deduplicates repeated skills', () => {
    assert.deepEqual(getCanonicalWorkProfileSkills(['Baking', 'Baking', 'baking']), ['Baking']);
  });

  it('merges a legacy alias with its canonical value', () => {
    assert.deepEqual(
      getCanonicalWorkProfileSkills(['Basic home repair', 'Minor home fix help']),
      ['Minor home fix help'],
    );
  });

  it('drops unknown, sentinel and empty values', () => {
    assert.deepEqual(
      getCanonicalWorkProfileSkills([
        'Balloon decoration',
        OTHER_SERVICE_CATEGORY_VALUE,
        'Others / Specify',
        '',
        null,
        undefined,
        'Sewing',
      ]),
      ['Sewing'],
    );
  });

  it('a profile of only unknown skills still needs no silent classification', () => {
    const result = resolveInitialClassification({
      workProfileSkills: ['Balloon decoration', 'Pet grooming'],
    });

    assert.equal(result.canonicalService, null);
    assert.equal(result.needsChooser, false);
  });
});

describe('post-publish Work Profile suggestion', () => {
  it('Y. publishing a service already on the profile offers nothing', () => {
    assert.equal(
      shouldSuggestAddingToWorkProfile({
        publishedCategory: 'Baking',
        workProfileSkills: ['Baking', 'Sewing'],
      }),
      null,
    );
  });

  it('Y2. an alias already on the profile counts as covered', () => {
    assert.equal(
      shouldSuggestAddingToWorkProfile({
        publishedCategory: 'Minor home fix help',
        workProfileSkills: ['Basic home repair'],
      }),
      null,
    );
  });

  it('Z. publishing a service not on the profile offers it', () => {
    assert.equal(
      shouldSuggestAddingToWorkProfile({
        publishedCategory: 'Phone or computer repair',
        workProfileSkills: ['Baking'],
      }),
      'Phone or computer repair',
    );
  });

  it('never offers the unknown-service sentinel', () => {
    assert.equal(
      shouldSuggestAddingToWorkProfile({
        publishedCategory: OTHER_SERVICE_CATEGORY_VALUE,
        workProfileSkills: [],
      }),
      null,
    );
    assert.equal(
      shouldSuggestAddingToWorkProfile({ publishedCategory: null, workProfileSkills: [] }),
      null,
    );
  });
});

describe('snapshot semantics', () => {
  const published = buildListingClassification({
    canonicalService: 'Baking',
    customWording: 'Birthday cakes',
  });

  it('V. classification is unchanged when Work Profile skills later change', () => {
    const afterProfileChange = resolveInitialClassification({
      storedCategory: published.category,
      workProfileSkills: ['Sewing', 'Makeup'],
    });

    assert.equal(afterProfileChange.canonicalService, 'Baking');
    assert.equal(afterProfileChange.source, 'existing');
  });

  it('W. removing the originating skill does not unclassify the listing', () => {
    const afterRemoval = resolveInitialClassification({
      storedCategory: published.category,
      workProfileSkills: [],
    });

    assert.equal(afterRemoval.canonicalService, 'Baking');
    assert.equal(afterRemoval.needsChooser, false);
  });

  it('X. adding skills later does not rewrite old listings', () => {
    const afterAddition = resolveInitialClassification({
      storedCategory: published.category,
      workProfileSkills: ['Baking', 'Sewing', 'Massage', 'Carpentry'],
    });

    assert.equal(afterAddition.canonicalService, 'Baking');
    assert.equal(afterAddition.needsChooser, false);
  });

  it('an explicit listing edit can still change the classification', () => {
    const edited = buildListingClassification({ canonicalService: 'Sewing' });
    assert.equal(edited.category, 'Sewing');
  });
});
