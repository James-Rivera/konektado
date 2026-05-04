import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  getCurrentUserId,
  loadPublicProfiles,
  mapService,
  requireVerifiedUser,
  type ServiceRow,
} from '@/services/marketplace.helpers';
import type {
  CreateServiceInput,
  ProviderService,
  ServiceSearchResult,
} from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

const SERVICE_COLUMNS =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, barangay, location_text, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, created_at, updated_at';

export async function createService(
  input: CreateServiceInput,
): Promise<ServiceResult<ProviderService>> {
  const user = await requireVerifiedUser();
  if (user.error) return user;

  const category = compactText(input.category);
  const title = compactText(input.title);
  const tags = Array.from(new Set((input.tags ?? []).map(compactText).filter(Boolean))).slice(0, 4);

  if (!category || !title) {
    return { data: null, error: 'Enter a service category and title.' };
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      provider_id: user.data,
      category,
      title,
      description: compactText(input.description) || null,
      tags,
      photo_urls: input.photoUrls ?? [],
      years_experience: input.yearsExperience ?? null,
      availability_text: compactText(input.availabilityText) || null,
      rate_text: compactText(input.rateText) || null,
      barangay: compactText(input.barangay) || null,
      location_text: compactText(input.locationText) || compactText(input.barangay) || null,
      allow_messages: input.allowMessages ?? true,
      auto_reply_enabled: input.autoReplyEnabled ?? false,
      auto_pause_enabled: input.autoPauseEnabled ?? false,
      is_active: true,
    })
    .select(SERVICE_COLUMNS)
    .single<ServiceRow>();

  if (error) {
    return {
      data: null,
      error: error.message.toLowerCase().includes('row-level security')
        ? 'Complete barangay verification before creating services.'
        : error.message,
    };
  }

  return { data: mapService(data), error: null };
}

export async function listMyServices(): Promise<ServiceResult<ProviderService[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;

  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('provider_id', user.data)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: ((data as ServiceRow[] | null) ?? []).map(mapService), error: null };
}

export async function searchServices(filters: { text?: string } = {}): Promise<
  ServiceResult<ServiceSearchResult[]>
> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const text = compactText(filters.text).toLowerCase();
  const rows = ((data as ServiceRow[] | null) ?? []).filter((row) => {
    if (!text) return true;
    return [row.title, row.description, row.category, row.availability_text, row.rate_text, ...(row.tags ?? [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  });
  const profiles = await loadPublicProfiles(rows.map((row) => row.provider_id));

  return {
    data: rows.map((row) => ({
      ...mapService(row),
      provider: profiles.get(row.provider_id) ?? null,
      averageRating: null,
      reviewCount: 0,
    })),
    error: null,
  };
}
