import type { ProviderReputationSort, SearchDiscoveryFilters } from '@/types/discovery.types';
import type { ServiceSearchResult } from '@/types/marketplace.types';

export function isProviderReputationSort(sort: SearchDiscoveryFilters['sort']): sort is ProviderReputationSort {
  return sort === 'highest_rated' || sort === 'most_completed';
}

export function sortByProviderReputation(services: ServiceSearchResult[], sort: ProviderReputationSort) {
  return [...services].sort((left, right) => {
    const completed = right.completedJobsCount - left.completedJobsCount;
    const rating = (right.averageRating ?? -1) - (left.averageRating ?? -1);
    const reviews = right.reviewCount - left.reviewCount;
    return (sort === 'most_completed' ? completed || rating || reviews : rating || reviews || completed)
      || right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
  });
}
