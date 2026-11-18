import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MVP_SERVICE_OPTIONS } from '@/constants/service-taxonomy';
import { getOnboardingSelectionError, normalizeOnboardingServices } from '@/services/onboarding-selection';
import { runtimeService } from './helpers/runtime-service';

describe('onboarding service selection', () => {
  it('does not count the legacy Other sentinel as a real selection', () => {
    assert.match(getOnboardingSelectionError({ intent: 'client', services: [], customServices: ['Others / Specify'], deliveryMode: null })!, /Choose at least one/);
  });
  it('rejects a retained online-only service for on-site work and names it', () => {
    const result = getOnboardingSelectionError({ intent: 'provider', services: ['Canva layout'], customServices: [], deliveryMode: 'on_site' });
    assert.match(result!, /Canva layout/);
    assert.match(result!, /On-site/);
  });
  it('requires an explicit provider mode, while a client needs no temporary mode', () => {
    assert.match(getOnboardingSelectionError({ intent: 'provider', services: ['Cleaning'], customServices: [], deliveryMode: null })!, /Choose On-site/);
    assert.equal(getOnboardingSelectionError({ intent: 'client', services: ['Cleaning'], customServices: [], deliveryMode: null }), null);
  });
  it('Both allows either type without requiring one of each', () => {
    for (const services of [['Cleaning'], ['Canva layout'], ['Cleaning', 'Canva layout']]) {
      assert.equal(getOnboardingSelectionError({ intent: 'provider', services, customServices: [], deliveryMode: 'both' }), null);
    }
  });
  it('normalizes aliases and duplicates, but keeps genuine custom wording', () => {
    const selection = normalizeOnboardingServices(['Carpentry'], ['karpintero', 'Pet sitting', 'pet sitting']);
    assert.equal(selection.services.join(','), 'Carpentry');
    assert.equal(selection.customServices.join(','), 'Pet sitting');
  });
  it('checks normalized typed aliases for delivery conflicts', () => {
    assert.match(getOnboardingSelectionError({ intent: 'provider', services: [], customServices: ['Typing'], deliveryMode: 'on_site' })!, /Encoding/);
  });
  it('accepts custom-only choices without assigning an inferred category or mode', () => {
    assert.equal(getOnboardingSelectionError({ intent: 'provider', services: [], customServices: ['Pet sitting'], deliveryMode: 'on_site' }), null);
  });
  it('does not silently introduce a cap or truncate existing selections', () => {
    const selection = normalizeOnboardingServices([...MVP_SERVICE_OPTIONS], ['Pet sitting']);
    assert.equal(selection.services.length, MVP_SERVICE_OPTIONS.length);
    assert.equal(selection.customServices.length, 1);
  });
  it('rejects unsupported work and empty choices for either role', () => {
    for (const intent of ['provider', 'client'] as const) {
      assert.match(getOnboardingSelectionError({ intent, services: [], customServices: ['licensed electrical work'], deliveryMode: 'both' })!, /doesn’t support/);
      assert.match(getOnboardingSelectionError({ intent, services: [], customServices: [], deliveryMode: 'both' })!, /Choose at least one/);
    }
  });
  it('save boundary rejects invalid selections before role or database writes', async () => {
    let writes = 0;
    const service = runtimeService<any>('@/services/onboarding.service', {
      '@/utils/supabase': { supabase: { from: () => { writes++; throw Error('Unexpected database write'); } } },
      '@/utils/save-role': { saveUserRole: async () => { writes++; throw Error('Unexpected role write'); } },
      '@/services/session.service': {},
    });
    for (const invalid of [
      { offeredServices: ['Canva layout'], customOfferedServices: [], message: /Canva layout/ },
      { offeredServices: [], customOfferedServices: ['Others / Specify'], message: /Choose at least one/ },
      { offeredServices: [], customOfferedServices: ['licensed electrical work'], message: /doesn’t support/ },
    ]) {
      const result = await service.saveOnboardingProfile({
        draft: { ...service.emptyOnboardingDraft, offeredDeliveryMode: 'on_site', ...invalid },
        intent: 'provider', userId: 'fixture', email: null,
      });
      assert.match(result.error, invalid.message);
    }
    assert.equal(writes, 0);
  });
});
