import {
  getTagsForMvpService,
  isMvpServiceOption,
  MVP_SERVICE_OPTIONS,
  MVP_SERVICE_TAGS,
  POPULAR_MVP_SERVICES,
  type MvpServiceOption,
} from '@/constants/service-taxonomy';

export const SERVICE_POST_OPTIONS = MVP_SERVICE_OPTIONS;

export type ServicePostOption = MvpServiceOption;

export const POPULAR_SERVICE_POST_OPTIONS: ServicePostOption[] = [...POPULAR_MVP_SERVICES];

export const SERVICE_TAGS_BY_CATEGORY = MVP_SERVICE_TAGS;

export function isServicePostOption(value: string | null | undefined): value is ServicePostOption {
  return isMvpServiceOption(value);
}

export function getServiceTagsForCategory(category: string | null | undefined) {
  return getTagsForMvpService(category);
}
