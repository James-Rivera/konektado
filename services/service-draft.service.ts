import type { ServiceResult } from '@/services/auth.service';
import {
  deleteOwnDraftRow,
  getOwnDraftRow,
  listOwnDraftRows,
  saveOwnDraftRow,
} from '@/services/marketplace-draft.repository';
import {
  compactText,
  normalizeExperienceLevel,
  normalizeRateType,
} from '@/services/marketplace.helpers';
import type { ServiceDraftSummary, UpsertServiceDraftInput } from '@/types/marketplace.types';

const SERVICE_DRAFT_COLUMNS =
  'id, user_id, category, custom_category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, rate_min, rate_max, rate_type, rate_negotiable, experience_level, certification_available, certification_note, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, created_at, updated_at';

type ServiceDraftRow = {
  id: string;
  user_id: string;
  category: string | null;
  custom_category: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  photo_urls: string[] | null;
  years_experience: number | null;
  availability_text: string | null;
  rate_text: string | null;
  rate_min: number | null;
  rate_max: number | null;
  rate_type: string | null;
  rate_negotiable: boolean | null;
  experience_level: string | null;
  certification_available: boolean | null;
  certification_note: string | null;
  barangay: string | null;
  location_text: string | null;
  allow_messages: boolean | null;
  auto_reply_enabled: boolean | null;
  auto_pause_enabled: boolean | null;
  created_at: string;
  updated_at: string;
};

function mapDraft(row: ServiceDraftRow): ServiceDraftSummary {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    customCategory: row.custom_category,
    title: row.title,
    description: row.description,
    tags: row.tags ?? [],
    photoUrls: row.photo_urls ?? [],
    yearsExperience: row.years_experience,
    availabilityText: row.availability_text,
    rateText: row.rate_text,
    rateMin: row.rate_min,
    rateMax: row.rate_max,
    rateType: normalizeRateType(row.rate_type),
    rateNegotiable: row.rate_negotiable ?? false,
    experienceLevel: normalizeExperienceLevel(row.experience_level),
    certificationAvailable: row.certification_available ?? false,
    certificationNote: row.certification_note,
    barangay: row.barangay,
    locationText: row.location_text,
    allowMessages: row.allow_messages ?? true,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    autoPauseEnabled: row.auto_pause_enabled ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeDraftPayload(input: UpsertServiceDraftInput) {
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);
  const photoUrls = Array.from(new Set((input.photoUrls ?? []).map(compactText).filter(Boolean)));

  return {
    category: compactText(input.category) || null,
    custom_category: compactText(input.customCategory) || null,
    title: compactText(input.title) || null,
    description: compactText(input.description) || null,
    tags,
    photo_urls: photoUrls,
    years_experience: input.yearsExperience ?? null,
    availability_text: compactText(input.availabilityText) || null,
    rate_text: compactText(input.rateText) || null,
    rate_min: input.rateMin ?? null,
    rate_max: input.rateMax ?? null,
    rate_type: normalizeRateType(input.rateType),
    rate_negotiable: input.rateNegotiable ?? false,
    experience_level: normalizeExperienceLevel(input.experienceLevel),
    certification_available: input.certificationAvailable ?? false,
    certification_note: compactText(input.certificationNote) || null,
    barangay: compactText(input.barangay) || 'Barangay San Pedro',
    location_text: compactText(input.locationText) || null,
    allow_messages: input.allowMessages ?? true,
    auto_reply_enabled: input.autoReplyEnabled ?? false,
    auto_pause_enabled: input.autoPauseEnabled ?? false,
  };
}

export async function listMyServiceDrafts(): Promise<ServiceResult<ServiceDraftSummary[]>> {
  const result = await listOwnDraftRows<ServiceDraftRow>('service_drafts', SERVICE_DRAFT_COLUMNS);
  if (result.error || !result.data) return { data: null, error: result.error };
  return { data: result.data.map(mapDraft), error: null };
}

export async function getServiceDraft(
  draftId: string,
): Promise<ServiceResult<ServiceDraftSummary>> {
  const result = await getOwnDraftRow<ServiceDraftRow>(
    'service_drafts',
    SERVICE_DRAFT_COLUMNS,
    draftId,
  );
  if (result.error || !result.data) return { data: null, error: result.error };
  return { data: mapDraft(result.data), error: null };
}

export async function saveServiceDraft({
  draftId,
  input,
}: {
  draftId?: string | null;
  input: UpsertServiceDraftInput;
}): Promise<ServiceResult<ServiceDraftSummary>> {
  const result = await saveOwnDraftRow<ServiceDraftRow>({
    table: 'service_drafts',
    columns: SERVICE_DRAFT_COLUMNS,
    draftId,
    payload: normalizeDraftPayload(input),
  });
  if (result.error || !result.data) return { data: null, error: result.error };
  return { data: mapDraft(result.data), error: null };
}

export async function deleteServiceDraft(draftId: string): Promise<ServiceResult<void>> {
  const result = await deleteOwnDraftRow('service_drafts', draftId);
  if (result.error) return { data: null, error: result.error };
  return { data: undefined, error: null };
}
