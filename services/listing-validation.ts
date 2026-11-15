import { getJobScheduleError } from '@/services/job-schedule';
import { getCategoryForMvpService, getStoredMvpServiceOption, OTHER_SERVICE_CATEGORY_VALUE } from '@/constants/service-taxonomy';
import { checkBlockedServiceText, MAX_CUSTOM_SERVICE_LENGTH } from '@/services/service-classification';
import { getRangeError } from '@/services/pricing';
import type { CreateJobInput, CreateServiceInput } from '@/types/marketplace.types';

const units = ['per_job', 'per_service', 'hourly', 'daily', 'weekly', 'per_project', 'per_visit', 'per_load', 'per_order', 'per_meal', 'per_session'];
function validateContent(input: { title: string; description?: string | null; locationText?: string | null; barangay?: string | null; rateType?: string }, maxTitle: number) {
  if (!input.title.trim() || input.title.trim().length > maxTitle) return `Enter a title of up to ${maxTitle} characters.`;
  if (!input.description?.trim() || input.description.trim().length > 5000) return 'Add a description of up to 5,000 characters.';
  if (!(input.locationText?.trim() || input.barangay?.trim())) return 'Choose a service area.';
  if (input.rateType && !units.includes(input.rateType)) return 'Choose a supported price unit.';
  return null;
}
function validateAmounts(min?: number | null, max?: number | null) {
  const error = getRangeError(min, max);
  if (error) return error;
  if ([min!, max!].some(value => Math.abs(value * 100 - Math.round(value * 100)) > 0.000001)) return 'Use at most two decimal places.';
  return null;
}
export function validateJobPayload(input: CreateJobInput) {
  const basic = validateContent(input, 120) || validateAmounts(input.budgetMin, input.budgetMax);
  if (basic) return basic;
  const service = getStoredMvpServiceOption(input.serviceNeeded);
  if (!service || getCategoryForMvpService(service) !== input.category) return 'Choose a matching category and service.';
  if ((input.workersNeeded ?? 1) !== 1) return 'Each job supports one hired provider. Choose one worker before continuing.';
  const scheduleError = getJobScheduleError(input.schedule);
  if (scheduleError) return scheduleError;
  return null;
}
export function validateServicePayload(input: CreateServiceInput) {
  const basic = validateContent(input, 80) || validateAmounts(input.rateMin, input.rateMax);
  if (basic) return basic;
  if (input.category !== OTHER_SERVICE_CATEGORY_VALUE && !getStoredMvpServiceOption(input.category)) return 'Choose a supported service.';
  if (input.category === OTHER_SERVICE_CATEGORY_VALUE && !input.customCategory?.trim()) return 'Describe the service you offer.';
  if ((input.customCategory?.trim().length ?? 0) > MAX_CUSTOM_SERVICE_LENGTH) return 'Use up to 80 characters for your service name.';
  if (checkBlockedServiceText(input.customCategory ?? '').blocked) return 'Konektado does not support this type of service yet.';
  return null;
}
