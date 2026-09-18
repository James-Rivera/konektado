/**
 * Search-first Add Skill behaviour, skill-list normalization, the deployment
 * skill cap, and product-scope exclusions on free-text skill entry.
 *
 * Every assertion calls the real `services/service-classification` helpers the
 * Work Profile, onboarding, and Create Service screens use.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { POPULAR_MVP_SERVICES } from '@/constants/service-taxonomy';
import {
  addSkillToList,
  countSkills,
  MAX_WORK_PROFILE_SKILLS,
  normalizeSkillList,
  searchSkillOptions,
  SKILL_FOCUS_REMINDER_THRESHOLD,
  type SkillListState,
} from '@/services/service-classification';

const top = (query: string) => searchSkillOptions(query)[0]?.service ?? null;
const empty: SkillListState = { skills: [], customSkills: [] };

describe('A. search-first skill resolution', () => {
  it('1-2. canonical text resolves, case-insensitively', () => {
    assert.equal(top('Carpentry'), 'Carpentry');
    assert.equal(top('carpentry'), 'Carpentry');
    assert.equal(top('CARPENTRY'), 'Carpentry');
  });

  it('3-4. karpintero and carpintero resolve to Carpentry', () => {
    assert.equal(top('karpintero'), 'Carpentry');
    assert.equal(top('carpintero'), 'Carpentry');
  });

  it('5-12. local terms and common phrasings resolve', () => {
    const expected: Record<string, string> = {
      panahi: 'Sewing',
      mananahi: 'Sewing',
      'birthday cake': 'Baking',
      cakes: 'Baking',
      cake: 'Baking',
      'lutong bahay': 'Home-cooked meals',
      masahe: 'Massage',
      gupit: 'Haircut',
      barbero: 'Haircut',
      pabili: 'Errands',
      'phone repair': 'Phone or computer repair',
      'computer repair': 'Phone or computer repair',
      'laptop repair': 'Phone or computer repair',
    };

    Object.entries(expected).forEach(([query, service]) => {
      assert.equal(top(query), service, `"${query}" should resolve to ${service}`);
    });
  });

  it('6b. a typo still reaches the right service through the prefix fallback', () => {
    assert.equal(top('carpentery'), 'Carpentry');
    assert.equal(top('bakin'), 'Baking');
  });

  it('13. punctuation, case, and spacing do not break matching', () => {
    assert.equal(top('  KARPINTERO  '), 'Carpentry');
    assert.equal(top('Lutong-bahay!'), 'Home-cooked meals');
    assert.equal(top('phone   repair...'), 'Phone or computer repair');
    assert.equal(top('Birthday  Cakes!!'), 'Baking');
  });

  it('14. results are never limited to one category', () => {
    // Each of these lives in a different canonical category; a category-scoped
    // search is what used to make them invisible.
    assert.equal(top('cleaning'), 'Cleaning');
    assert.equal(top('baking'), 'Baking');
    assert.equal(top('tutoring'), 'Tutoring');
    assert.equal(top('printer'), 'Printer setup');

    const services = searchSkillOptions('help', 8).map((result) => result.service);
    assert.ok(services.length > 1, 'a broad query should reach several services');
  });

  it('partial input finds services by prefix', () => {
    assert.equal(top('car'), 'Carpentry');
    assert.equal(top('sew'), 'Sewing');
    assert.equal(top('mani'), 'Manicure or pedicure');
  });

  it('15. genuinely unknown text returns nothing to auto-apply', () => {
    ['balloon decoration', 'zumba instructor', 'qwertyuiop'].forEach((query) => {
      assert.deepEqual(searchSkillOptions(query), [], `"${query}" must not match a service`);
    });
  });

  it('blank input returns nothing', () => {
    assert.deepEqual(searchSkillOptions(''), []);
    assert.deepEqual(searchSkillOptions('   '), []);
    assert.deepEqual(searchSkillOptions(null), []);
    assert.deepEqual(searchSkillOptions('Carpentry', 0), []);
  });

  it('respects the result limit and reports what matched', () => {
    assert.ok(searchSkillOptions('help', 3).length <= 3);
    assert.equal(searchSkillOptions('karpintero')[0].matchedOn, 'Karpintero');
  });

  it('the empty-state quick picks span every Home group', () => {
    assert.equal(POPULAR_MVP_SERVICES.length, 8);
    assert.equal(new Set(POPULAR_MVP_SERVICES).size, 8);
  });
});

describe('B. custom skills and de-duplication', () => {
  it('16. an unknown skill can be added', () => {
    const result = addSkillToList({ input: 'Balloon decoration', state: empty });

    assert.equal(result.status, 'added');
    if (result.status !== 'added') return;
    assert.equal(result.canonicalService, null);
    assert.deepEqual(result.state.customSkills, ['Balloon decoration']);
  });

  it('17. blank or whitespace-only input cannot be added', () => {
    assert.equal(addSkillToList({ input: '', state: empty }).status, 'empty');
    assert.equal(addSkillToList({ input: '   ', state: empty }).status, 'empty');
    assert.equal(addSkillToList({ input: null, state: empty }).status, 'empty');
  });

  it('18. normalized duplicate custom skills collapse', () => {
    const state: SkillListState = { skills: [], customSkills: ['Balloon decoration'] };

    ['balloon decoration', 'Balloon  decoration', 'Balloon decoration!', '  BALLOON DECORATION '].forEach(
      (variant) => {
        assert.equal(
          addSkillToList({ input: variant, state }).status,
          'duplicate',
          `"${variant}" should be seen as already added`,
        );
      },
    );
  });

  it('19. canonical and alias duplicates collapse', () => {
    const state: SkillListState = { skills: ['Carpentry'], customSkills: [] };

    ['karpintero', 'Carpintero', 'carpentry', 'CARPENTRY'].forEach((variant) => {
      assert.equal(addSkillToList({ input: variant, state }).status, 'duplicate');
    });
  });

  it('19b. typing an alias stores the canonical service, not the alias', () => {
    const result = addSkillToList({ input: 'karpintero', state: empty });

    assert.equal(result.status, 'added');
    if (result.status !== 'added') return;
    assert.deepEqual(result.state.skills, ['Carpentry']);
    assert.deepEqual(result.state.customSkills, []);
  });

  it('20. spelling variants never consume two slots', () => {
    const state: SkillListState = {
      skills: ['Carpentry', 'karpintero', 'Basic home repair', 'Minor home fix help'],
      customSkills: ['Balloon decoration', 'balloon  decoration!'],
    };

    assert.equal(countSkills(state), 3, 'Carpentry, Minor home fix help, Balloon decoration');
    assert.deepEqual(normalizeSkillList(state).skills, ['Carpentry', 'Minor home fix help']);
    assert.deepEqual(normalizeSkillList(state).customSkills, ['Balloon decoration']);
  });

  it('drops empty and sentinel values when normalizing', () => {
    const state: SkillListState = {
      skills: ['Carpentry', '', '   '],
      customSkills: ['Others / Specify', 'Other service'],
    };

    const normalized = normalizeSkillList(state);
    assert.deepEqual(normalized.skills, ['Carpentry']);
    assert.equal(normalized.customSkills.length, 2, 'sentinels are kept verbatim, not resolved');
  });
});

describe('C. product-scope exclusions on skill entry', () => {
  it('21-25. excluded trades cannot be added as skills', () => {
    ['Electrical wiring', 'Electrical repair', 'electrician', 'kuryente', 'Plumbing', 'plumber', 'tubero'].forEach(
      (input) => {
        const result = addSkillToList({ input, state: empty });
        assert.equal(result.status, 'blocked', `"${input}" must be blocked`);
      },
    );
  });

  it('26. a blocked phrase inside a longer sentence is still blocked', () => {
    const result = addSkillToList({
      input: 'home repair including electrical wiring',
      state: empty,
    });

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') return;
    assert.ok(result.matchedTerm, 'the resident is told what was not supported');
  });

  it('an excluded trade is never resolved into an allowed neighbour', () => {
    assert.notEqual(top('electrical wiring'), 'Carpentry');
    assert.notEqual(top('electrical wiring'), 'Minor home fix help');
    assert.notEqual(top('tubero'), 'Minor home fix help');
    assert.notEqual(top('plumbing'), 'Home assistance');
  });

  it('allowed trades are not caught by the scope check', () => {
    ['Carpentry', 'Painting', 'Minor home fix help', 'Balloon decoration', 'Baking'].forEach(
      (input) => {
        assert.notEqual(
          addSkillToList({ input, state: empty }).status,
          'blocked',
          `"${input}" should be allowed`,
        );
      },
    );
  });
});

describe('D. skill limit', () => {
  const fifteen: SkillListState = {
    skills: [
      'Cleaning',
      'Laundry help',
      'Errands',
      'Delivery help',
      'Home assistance',
      'Minor home fix help',
      'Yard or outdoor help',
      'Carpentry',
      'Painting',
      'Furniture repair or assembly',
      'Tutoring',
      'Encoding',
      'Canva layout',
      'Baking',
      'Sewing',
    ],
    customSkills: [],
  };

  it('30. fifteen skills are allowed', () => {
    assert.equal(countSkills(fifteen), MAX_WORK_PROFILE_SKILLS);

    let state: SkillListState = { skills: [], customSkills: [] };
    fifteen.skills.forEach((skill) => {
      const result = addSkillToList({ input: skill, state });
      assert.equal(result.status, 'added', `${skill} should be addable`);
      if (result.status === 'added') state = result.state;
    });
    assert.equal(countSkills(state), 15);
  });

  it('31. a sixteenth unique skill is rejected without touching the list', () => {
    const result = addSkillToList({ input: 'Massage', state: fifteen });

    assert.equal(result.status, 'limit');
    if (result.status !== 'limit') return;
    assert.equal(result.limit, MAX_WORK_PROFILE_SKILLS);
    assert.equal(fifteen.skills.length, 15, 'nothing is removed automatically');
  });

  it('31b. an unknown custom skill is also capped', () => {
    assert.equal(addSkillToList({ input: 'Balloon decoration', state: fifteen }).status, 'limit');
  });

  it('32. a duplicate at the limit reports duplicate, not the cap', () => {
    assert.equal(addSkillToList({ input: 'Carpentry', state: fifteen }).status, 'duplicate');
  });

  it('33. an alias duplicate at the limit reports duplicate, not the cap', () => {
    assert.equal(addSkillToList({ input: 'karpintero', state: fifteen }).status, 'duplicate');
    assert.equal(addSkillToList({ input: 'panahi', state: fifteen }).status, 'duplicate');
  });

  it('33b. a blocked term at the limit reports blocked, not the cap', () => {
    assert.equal(addSkillToList({ input: 'electrician', state: fifteen }).status, 'blocked');
  });

  it('34. the focus reminder threshold sits below the hard cap and blocks nothing', () => {
    assert.ok(SKILL_FOCUS_REMINDER_THRESHOLD < MAX_WORK_PROFILE_SKILLS);

    const nine: SkillListState = { skills: fifteen.skills.slice(0, 9), customSkills: [] };
    assert.equal(countSkills(nine), 9);
    assert.equal(addSkillToList({ input: 'Massage', state: nine }).status, 'added');
  });
});
