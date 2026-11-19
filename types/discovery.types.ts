import type { DiscoveryGroupKey, MvpServiceCategory, MvpServiceOption, SearchWorkType } from '@/constants/service-taxonomy';
import type { ExperienceLevel, RateType } from '@/types/marketplace.types';

export type ProviderReputationSort = 'highest_rated' | 'most_completed';

export type SearchDiscoveryFilters = {
  category: 'all' | MvpServiceCategory;
  workType: SearchWorkType;
  serviceGroup: 'all' | DiscoveryGroupKey;
  service: 'all' | MvpServiceOption;
  locationScope: 'same_barangay' | 'nearby';
  rateType?: RateType | 'any';
  rateMin: number | null;
  rateMax: number | null;
  experienceLevel: 'all' | ExperienceLevel;
  certification: 'any' | 'required_or_available';
  verifiedOnly: boolean;
  sort: 'relevant' | 'newest' | 'nearby' | ProviderReputationSort;
};
