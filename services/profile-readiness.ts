import type { CoreProfileInput, HiringProfileInput, WorkProfileInput } from '@/types/profile.types';

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

/** Progress uses current edits; saved readiness and verification still gate actions. */
export function getProfileEditorProgress(mode: 'core' | 'work' | 'hiring', core: CoreProfileInput, work: WorkProfileInput, hiring: HiringProfileInput) {
  const items = mode === 'core' ? [
    { label: 'Add your name', complete: hasText(core.firstName) && hasText(core.lastName) },
    { label: 'Add your location', complete: hasText(core.barangay) && hasText(core.city) && hasText(core.street) },
    { label: 'Choose a contact preference', complete: hasText(core.preferredContactMethod) },
  ] : mode === 'work' ? [
    { label: 'Add an introduction', complete: hasText(work.bio) || hasText(work.headline) },
    { label: 'Choose services', complete: [...work.offeredServices, ...work.customOfferedServices].some(hasText) },
    { label: 'Choose a service area', complete: hasText(work.serviceArea) },
    { label: 'Choose availability', complete: hasText(work.availability) },
  ] : [
    { label: 'Add an introduction', complete: hasText(hiring.bio) || hasText(hiring.headline) },
    { label: 'Choose needed services', complete: [...hiring.neededServices, ...hiring.customNeededServices].some(hasText) },
    { label: 'Choose coordination', complete: hasText(hiring.coordinationStyle) },
    { label: 'Choose a schedule', complete: hasText(hiring.preferredSchedule) },
  ];
  return { completedSteps: items.filter(item => item.complete).length, totalSteps: items.length, missingItems: items.filter(item => !item.complete) };
}

export function isWorkProfileInputComplete(input: WorkProfileInput) {
  return Boolean(
    (hasText(input.bio) || hasText(input.headline)) &&
    [...input.offeredServices, ...input.customOfferedServices].some(hasText) &&
    hasText(input.serviceArea) && hasText(input.availability),
  );
}

export function isHiringProfileInputComplete(input: HiringProfileInput) {
  return Boolean(
    (hasText(input.bio) || hasText(input.headline)) &&
    [...input.neededServices, ...input.customNeededServices].some(hasText) &&
    hasText(input.coordinationStyle) && hasText(input.preferredSchedule),
  );
}

/** Explicitly saved selections are authoritative, including an intentionally empty list. */
export function resolveProfileSelections(confirmed: boolean, own: string[], onboarding: string[]) {
  return confirmed ? own : [...own, ...onboarding];
}
