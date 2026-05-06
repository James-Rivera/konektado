import {
  getServicesForMvpCategory,
  getTagsForMvpService,
  isMvpServiceOption,
  isMvpServiceCategory,
  MVP_SERVICE_CATEGORIES,
  MVP_SERVICE_OPTIONS,
  MVP_SERVICES_BY_CATEGORY,
  MVP_SERVICE_TAGS,
  POPULAR_MVP_SERVICES,
  type MvpServiceCategory,
  type MvpServiceOption,
} from '@/constants/service-taxonomy';

export const SERVICE_POST_OPTIONS = MVP_SERVICE_OPTIONS;
export const SERVICE_POST_CATEGORIES = MVP_SERVICE_CATEGORIES;
export const SERVICE_POST_OPTIONS_BY_CATEGORY = MVP_SERVICES_BY_CATEGORY;

export type ServicePostOption = MvpServiceOption;
export type ServicePostCategory = MvpServiceCategory;

export const POPULAR_SERVICE_POST_OPTIONS: ServicePostOption[] = [...POPULAR_MVP_SERVICES];

export const SERVICE_TAGS_BY_CATEGORY = MVP_SERVICE_TAGS;

export function isServicePostOption(value: string | null | undefined): value is ServicePostOption {
  return isMvpServiceOption(value);
}

export function isServicePostCategory(
  value: string | null | undefined,
): value is ServicePostCategory {
  return isMvpServiceCategory(value);
}

export function getServicePostOptionsForCategory(category: string | null | undefined) {
  return getServicesForMvpCategory(category);
}

export function getServiceTagsForCategory(category: string | null | undefined) {
  return getTagsForMvpService(category);
}
