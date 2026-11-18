import {
  doesServiceMatchOfferedDeliveryMode,
  isOfferedDeliveryMode,
  splitOfficialAndCustomServices,
  type OfferedDeliveryMode,
} from '@/constants/service-taxonomy';
import { checkBlockedServiceText, normalizeSkillList } from '@/services/service-classification';
import type { OnboardingIntent } from '@/types/onboarding.types';

export function normalizeOnboardingServices(services: string[], customServices: string[]) {
  const split = splitOfficialAndCustomServices([...services, ...customServices]);
  const normalized = normalizeSkillList({ skills: split.official, customSkills: split.custom });
  return { services: normalized.skills, customServices: normalized.customSkills };
}

export function getIncompatibleOnboardingServices(services: string[], mode: OfferedDeliveryMode | null) {
  if (!mode) return [];
  return services.filter((service) => !doesServiceMatchOfferedDeliveryMode(service, mode));
}

/** Validate the final normalized selection at navigation and before any save. */
export function getOnboardingSelectionError({
  intent,
  services,
  customServices,
  deliveryMode,
}: {
  intent: OnboardingIntent;
  services: string[];
  customServices: string[];
  deliveryMode: OfferedDeliveryMode | null;
}): string | null {
  const normalized = normalizeOnboardingServices(services, customServices);
  if (!normalized.services.length && !normalized.customServices.length) {
    return intent === 'provider' ? 'Choose at least one service you can offer.' : 'Choose at least one type of help you may need.';
  }
  const blocked = [...services, ...customServices].find((service) => checkBlockedServiceText(service).blocked);
  if (blocked) return `Konektado doesn’t support “${blocked.trim()}” yet. Remove it to continue.`;
  if (intent === 'client') return null;
  if (!isOfferedDeliveryMode(deliveryMode)) return 'Choose On-site, Online, or Both to continue.';
  const incompatible = getIncompatibleOnboardingServices(normalized.services, deliveryMode);
  if (incompatible.length) {
    return `${incompatible.join(', ')} ${incompatible.length === 1 ? 'does' : 'do'} not match ${deliveryMode === 'on_site' ? 'On-site' : 'Online'}. Change your work setup or remove the listed services.`;
  }
  return null;
}
