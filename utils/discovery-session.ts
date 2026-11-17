import type { SearchMode } from '@/constants/search-demo-data';
import { doesServiceMatchWorkType, getCategoryForMvpService, getServicesForDiscoveryGroupAndWorkType } from '@/constants/service-taxonomy';
import { DEFAULT_HOME_FEED_FILTERS, type HomeFeedFilters } from '@/services/home-feed.service';
import type { SearchDiscoveryFilters } from '@/types/discovery.types';

export type DiscoverySession = {
  mode: SearchMode;
  query: string;
  filters: SearchDiscoveryFilters;
  homeFilters: HomeFeedFilters;
};
type Update<T> = T | ((current: T) => T);
export type DiscoveryAction =
  | { type: 'mode'; value: SearchMode }
  | { type: 'query'; value: Update<string> }
  | { type: 'filters'; value: Update<SearchDiscoveryFilters> }
  | { type: 'homeFilters'; value: Update<HomeFeedFilters> };

export function buildDefaultDiscoveryFilters(): SearchDiscoveryFilters {
  return {
    category: 'all',
    workType: 'either',
    serviceGroup: 'all',
    service: 'all',
    locationScope: 'nearby',
    rateType: 'any',
    rateMin: null,
    rateMax: null,
    experienceLevel: 'all',
    certification: 'any',
    verifiedOnly: false,
    sort: 'relevant',
  };
}

export function createDiscoverySession(mode: SearchMode): DiscoverySession {
  return {
    mode,
    query: '',
    filters: buildDefaultDiscoveryFilters(),
    homeFilters: { ...DEFAULT_HOME_FEED_FILTERS, feedType: mode === 'jobs' ? 'jobs' : 'services' },
  };
}

export function getDiscoveryServices(filters: SearchDiscoveryFilters) {
  const services = filters.service === 'all'
    ? getServicesForDiscoveryGroupAndWorkType(filters.serviceGroup, filters.workType)
    : doesServiceMatchWorkType(filters.service, filters.workType) ? [filters.service] : [];
  return services.filter(service => filters.category === 'all' || getCategoryForMvpService(service) === filters.category);
}

function resolve<T>(update: Update<T>, current: T): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update;
}

export function discoveryReducer(state: DiscoverySession, action: DiscoveryAction): DiscoverySession {
  if (action.type === 'query') return { ...state, query: resolve(action.value, state.query) };
  if (action.type === 'mode') {
    return {
      ...state,
      mode: action.value,
      homeFilters: { ...state.homeFilters, feedType: action.value === 'jobs' ? 'jobs' : 'services' },
    };
  }
  if (action.type === 'filters') {
    const filters = resolve(action.value, state.filters);
    return {
      ...state,
      filters,
      homeFilters: {
        ...state.homeFilters,
        category: filters.category,
        workType: filters.workType,
        // Both broad scopes avoid an exact barangay predicate. Retain Home's
        // explicit Any location choice on an unchanged Search round trip.
        locationPreference: filters.locationScope === 'same_barangay'
          ? 'same_barangay'
          : state.homeFilters.locationPreference === 'any' ? 'any' : 'nearby',
        sort: filters.sort === 'relevant' ? 'recommended' : filters.sort,
      },
    };
  }
  const homeFilters = resolve(action.value, state.homeFilters);
  const mode = homeFilters.feedType === 'all' ? state.mode : homeFilters.feedType === 'jobs' ? 'jobs' : 'workers';
  const categoryChanged = homeFilters.category !== state.homeFilters.category;
  const filters: SearchDiscoveryFilters = {
    ...state.filters,
    category: homeFilters.category,
    workType: homeFilters.workType,
    locationScope: homeFilters.locationPreference === 'same_barangay' ? 'same_barangay' : 'nearby',
    sort: homeFilters.sort === 'recommended' ? 'relevant' : homeFilters.sort,
  };
  // A newly selected broad category must not silently intersect an old service.
  if (categoryChanged || !getDiscoveryServices(filters).length) {
    filters.serviceGroup = 'all';
    filters.service = 'all';
  }
  return {
    ...state,
    mode,
    filters,
    homeFilters: { ...homeFilters, feedType: mode === 'jobs' ? 'jobs' : 'services' },
  };
}
