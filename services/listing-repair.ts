import { getJobScheduleError } from '@/services/job-schedule';
import { getRangeError } from '@/services/pricing';
import { getCategoryForMvpService, getStoredMvpServiceOption, OTHER_SERVICE_CATEGORY_VALUE } from '@/constants/service-taxonomy';
import type { JobDraftSummary, ServiceDraftSummary } from '@/types/marketplace.types';

export type ListingIssue = { field:string; message:string };
export function getJobRepairIssues(row: Partial<JobDraftSummary>): ListingIssue[] {
  const issues: ListingIssue[] = [];
  if (!row.title?.trim() || row.title.trim().length > 120) issues.push({ field:'title',message:'Add a job title of up to 120 characters.' });
  if (!row.description?.trim() || row.description.trim().length > 5000) issues.push({ field:'description',message:'Add a description of up to 5,000 characters.' });
  if (!row.category) issues.push({ field:'category',message:'Choose a category.' });
  if (!getStoredMvpServiceOption(row.serviceNeeded) || getCategoryForMvpService(getStoredMvpServiceOption(row.serviceNeeded)) !== row.category) issues.push({ field:'serviceNeeded',message:'Choose a service matching the category.' });
  if (!row.locationText?.trim() && !row.barangay?.trim()) issues.push({ field:'locationText',message:'Choose a barangay.' });
  const price = getRangeError(row.budgetMin,row.budgetMax);
  if (price) issues.push({ field:'budgetMin',message:price });
  if ((row.workersNeeded ?? 1) !== 1) issues.push({ field:'workersNeeded',message:'Choose one provider for this job.' });
  const schedule = getJobScheduleError(row.schedule);
  if (schedule) issues.push({ field:'scheduleText',message:schedule });
  return issues;
}
export function getServiceRepairIssues(row: Partial<ServiceDraftSummary>): ListingIssue[] {
  const issues: ListingIssue[] = [];
  if (!row.title?.trim() || row.title.trim().length > 80) issues.push({ field:'title',message:'Add a service title of up to 80 characters.' });
  if (!row.description?.trim() || row.description.trim().length > 5000) issues.push({ field:'description',message:'Add a description of up to 5,000 characters.' });
  if (!getStoredMvpServiceOption(row.category) && row.category !== OTHER_SERVICE_CATEGORY_VALUE) issues.push({ field:'category',message:'Choose a supported service.' });
  if (row.category === OTHER_SERVICE_CATEGORY_VALUE && !row.customCategory?.trim()) issues.push({ field:'customCategory',message:'Describe the service you offer.' });
  if (!row.locationText?.trim() && !row.barangay?.trim()) issues.push({ field:'locationText',message:'Choose a barangay.' });
  const price = getRangeError(row.rateMin,row.rateMax);
  if (price) issues.push({ field:'rateMin',message:price });
  return issues;
}
