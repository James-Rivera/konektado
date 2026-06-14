import type { ServiceResult } from '@/services/auth.service';
import { getJobDetail } from '@/services/job.service';
import { compactText, getCurrentUserId, requireVerifiedUser } from '@/services/marketplace.helpers';
import { getServiceDetail } from '@/services/service-profile.service';
import type { JobDetail, ServiceDetail } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

export type SavedPostType = 'job' | 'service';

export type SavedPostReference = {
  id: string;
  userId: string;
  postType: SavedPostType;
  postId: string;
  createdAt: string;
};

export type SavedPostTarget = {
  postType: SavedPostType;
  postId: string;
};

export type SavedPost =
  | (SavedPostReference & {
      postType: 'job';
      job: JobDetail | null;
      service: null;
    })
  | (SavedPostReference & {
      postType: 'service';
      job: null;
      service: ServiceDetail | null;
    });

const SAVED_POST_COLUMNS = 'id, user_id, item_type, item_id, created_at';

type SavedPostRow = {
  id: string;
  user_id: string;
  item_type: SavedPostType;
  item_id: string;
  created_at: string;
};

export function getSavedPostKey({ postType, postId }: SavedPostTarget) {
  return `${postType}:${postId}`;
}

export async function listSavedPostReferences(): Promise<ServiceResult<SavedPostReference[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('saved_items')
    .select(SAVED_POST_COLUMNS)
    .eq('user_id', user.data)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  return {
    data: ((data as SavedPostRow[] | null) ?? []).map(mapSavedPostReference),
    error: null,
  };
}

export async function listSavedPosts(): Promise<ServiceResult<SavedPost[]>> {
  const references = await listSavedPostReferences();
  if (references.error || !references.data) return references;

  const posts = await Promise.all(
    references.data.map(async (reference): Promise<SavedPost> => {
      if (reference.postType === 'job') {
        const result = await getJobDetail(reference.postId);
        return {
          ...reference,
          postType: 'job',
          job: result.data ?? null,
          service: null,
        };
      }

      const result = await getServiceDetail(reference.postId);
      return {
        ...reference,
        postType: 'service',
        job: null,
        service: result.data ?? null,
      };
    }),
  );

  return { data: posts, error: null };
}

export async function isPostSaved(target: SavedPostTarget): Promise<ServiceResult<boolean>> {
  const normalized = normalizeTarget(target);
  if (!normalized) return { data: null, error: 'Choose a post to save.' };

  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.data)
    .eq('item_type', normalized.postType)
    .eq('item_id', normalized.postId)
    .maybeSingle<{ id: string }>();

  if (error) return { data: null, error: error.message };
  return { data: Boolean(data), error: null };
}

export async function savePost(
  target: SavedPostTarget,
): Promise<ServiceResult<SavedPostReference>> {
  const normalized = normalizeTarget(target);
  if (!normalized) return { data: null, error: 'Choose a post to save.' };

  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      user_id: user.data,
      item_type: normalized.postType,
      item_id: normalized.postId,
    })
    .select(SAVED_POST_COLUMNS)
    .single<SavedPostRow>();

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: existingError } = await supabase
        .from('saved_items')
        .select(SAVED_POST_COLUMNS)
        .eq('user_id', user.data)
        .eq('item_type', normalized.postType)
        .eq('item_id', normalized.postId)
        .maybeSingle<SavedPostRow>();

      if (existingError) return { data: null, error: existingError.message };
      if (existing) return { data: mapSavedPostReference(existing), error: null };
    }

    return {
      data: null,
      error: error.message.toLowerCase().includes('row-level security')
        ? 'Complete barangay verification before saving posts.'
        : error.message,
    };
  }

  return { data: mapSavedPostReference(data), error: null };
}

export async function unsavePost(target: SavedPostTarget): Promise<ServiceResult<boolean>> {
  const normalized = normalizeTarget(target);
  if (!normalized) return { data: null, error: 'Choose a post to remove.' };

  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', user.data)
    .eq('item_type', normalized.postType)
    .eq('item_id', normalized.postId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

function normalizeTarget(target: SavedPostTarget): SavedPostTarget | null {
  const postId = compactText(target.postId);
  if (!postId || (target.postType !== 'job' && target.postType !== 'service')) return null;

  return {
    postType: target.postType,
    postId,
  };
}

function mapSavedPostReference(row: SavedPostRow): SavedPostReference {
  return {
    id: row.id,
    userId: row.user_id,
    postType: row.item_type,
    postId: row.item_id,
    createdAt: row.created_at,
  };
}
