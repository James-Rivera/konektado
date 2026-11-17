import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCategoryForMvpService, getServicesForDiscoveryGroupAndWorkType } from '@/constants/service-taxonomy';
import { createDiscoverySession, discoveryReducer, getDiscoveryServices } from '@/utils/discovery-session';

describe('linked Home and Search discovery session', () => {
  it('keeps query, filters and explicit intent through both mode changes and Back', () => {
    let state = createDiscoverySession('jobs');
    state = discoveryReducer(state, { type: 'query', value: 'cleaning' });
    state = discoveryReducer(state, { type: 'homeFilters', value: { ...state.homeFilters, workType: 'physical', category: 'Home & Local Help', locationPreference: 'same_barangay', sort: 'newest' } });
    state = discoveryReducer(state, { type: 'filters', value: current => ({ ...current, rateMin: 300, rateMax: 900, rateType: 'per_job', certification: 'required_or_available' }) });
    const before = state.filters;
    state = discoveryReducer(state, { type: 'mode', value: 'workers' });
    assert.equal(state.homeFilters.feedType, 'services');
    assert.equal(state.query, 'cleaning');
    assert.equal(state.filters, before);
    state = discoveryReducer(state, { type: 'mode', value: 'jobs' });
    assert.equal(state.homeFilters.feedType, 'jobs');
    assert.equal(state.filters, before);
    assert.equal(state.homeFilters.locationPreference, 'same_barangay');
  });

  it('Search common filters update Home while advanced filters remain in Search', () => {
    let state = createDiscoverySession('workers');
    state = discoveryReducer(state, { type: 'filters', value: current => ({ ...current, workType: 'digital', locationScope: 'same_barangay', sort: 'nearby', rateMin: 500 }) });
    assert.equal(state.homeFilters.workType, 'digital');
    assert.equal(state.homeFilters.locationPreference, 'same_barangay');
    assert.equal(state.homeFilters.sort, 'nearby');
    state = discoveryReducer(state, { type: 'homeFilters', value: current => ({ ...current, sort: 'newest' }) });
    assert.equal(state.filters.sort, 'newest');
    assert.equal(state.filters.rateMin, 500);
  });

  it('preserves every service in a broad Home category instead of mapping it to one group', () => {
    const state = createDiscoverySession('jobs');
    const next = discoveryReducer(state, { type: 'homeFilters', value: { ...state.homeFilters, category: 'Home & Local Help' } });
    const expected = getServicesForDiscoveryGroupAndWorkType('all', 'either').filter(service => getCategoryForMvpService(service) === 'Home & Local Help');
    assert.deepEqual(getDiscoveryServices(next.filters), expected);
    assert.ok(expected.includes('Carpentry'));
    assert.ok(expected.includes('Cleaning'));
  });

  it('changing the Home category clears a contradictory old specific service', () => {
    let state = createDiscoverySession('jobs');
    state = discoveryReducer(state, { type: 'filters', value: current => ({ ...current, service: 'Cleaning', serviceGroup: 'Home & Errands' }) });
    state = discoveryReducer(state, { type: 'homeFilters', value: current => ({ ...current, category: 'Learning & Digital Help' }) });
    assert.equal(state.filters.service, 'all');
    assert.equal(state.filters.serviceGroup, 'all');
    assert.ok(!getDiscoveryServices(state.filters).includes('Cleaning'));
  });

  it('an account/session reset discards the previous account query and filters', () => {
    const nextAccount = createDiscoverySession('workers');
    assert.equal(nextAccount.query, '');
    assert.equal(nextAccount.filters.rateMin, null);
    assert.equal(nextAccount.homeFilters.feedType, 'services');
  });

  it('changing work type clears an incompatible Search group while preserving the query and rates', () => {
    let state = createDiscoverySession('jobs');
    state = discoveryReducer(state, { type: 'query', value: 'help' });
    state = discoveryReducer(state, { type: 'filters', value: current => ({ ...current, serviceGroup: 'Home & Errands', rateMin: 200 }) });
    state = discoveryReducer(state, { type: 'homeFilters', value: current => ({ ...current, workType: 'digital' }) });
    assert.equal(state.filters.serviceGroup, 'all');
    assert.ok(getDiscoveryServices(state.filters).length > 0);
    assert.equal(state.filters.rateMin, 200);
    assert.equal(state.query, 'help');
  });
});
