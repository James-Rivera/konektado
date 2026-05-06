import {
  getServicesForMvpCategory,
  getTagsForMvpCategory,
  isMvpServiceCategory,
  MVP_CATEGORY_CONTEXT_TAGS,
  MVP_SERVICE_CATEGORIES,
  MVP_SERVICES_BY_CATEGORY,
  type MvpServiceCategory,
} from '@/constants/service-taxonomy';

export const JOB_CATEGORIES = MVP_SERVICE_CATEGORIES;

export type JobCategory = MvpServiceCategory;

export const POPULAR_JOB_CATEGORIES: JobCategory[] = [...MVP_SERVICE_CATEGORIES];

export const JOB_SERVICES_BY_CATEGORY = MVP_SERVICES_BY_CATEGORY;

export const JOB_CONTEXT_TAGS_BY_CATEGORY = MVP_CATEGORY_CONTEXT_TAGS;

export function isJobCategory(value: string | null | undefined): value is JobCategory {
  return isMvpServiceCategory(value);
}

export function getServicesForCategory(category: string | null | undefined) {
  return getServicesForMvpCategory(category);
}

export function getContextTagsForCategory(category: string | null | undefined) {
  return getTagsForMvpCategory(category);
}
