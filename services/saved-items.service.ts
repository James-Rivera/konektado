import type { ServiceResult } from '@/services/auth.service';
import { compactText, getCurrentUserId, requireVerifiedUser } from '@/services/marketplace.helpers';
import { supabase } from '@/utils/supabase';

export type SavedItemType = 'job' | 'provider';

export type SavedItem = {
  id: string;
  userId: string;
  itemType: SavedItemType;
  itemId: string;
  createdAt: string;
};

export type SavedItemTarget = {
  itemType: SavedItemType;
  itemId: string;
};

const SAVED_ITEM_COLUMNS = 'id, user_id, item_type, item_id, created_at';

type SavedItemRow = {
  id: string;
  user_id: string;
  item_type: SavedItemType;
  item_id: string;
  created_at: string;
};

export function getSavedItemKey({ itemType, itemId }: SavedItemTarget) {
  return `${itemType}:${itemId}`;
}

export async function getSavedItems(): Promise<ServiceResult<SavedItem[]>> {
  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('saved_items')
    .select(SAVED_ITEM_COLUMNS)
    .eq('user_id', user.data)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };

  return {
    data: ((data as SavedItemRow[] | null) ?? []).map(mapSavedItem),
    error: null,
  };
}

export async function isItemSaved(target: SavedItemTarget): Promise<ServiceResult<boolean>> {
  const normalized = normalizeTarget(target);
  if (!normalized) return { data: null, error: 'Choose an item to save.' };

  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.data)
    .eq('item_type', normalized.itemType)
    .eq('item_id', normalized.itemId)
    .maybeSingle<{ id: string }>();

  if (error) return { data: null, error: error.message };
  return { data: Boolean(data), error: null };
}

export async function saveItem(target: SavedItemTarget): Promise<ServiceResult<SavedItem>> {
  const normalized = normalizeTarget(target);
  if (!normalized) return { data: null, error: 'Choose an item to save.' };

  const user = await requireVerifiedUser();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      user_id: user.data,
      item_type: normalized.itemType,
      item_id: normalized.itemId,
    })
    .select(SAVED_ITEM_COLUMNS)
    .single<SavedItemRow>();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'This item is already saved.' };
    }

    return {
      data: null,
      error: error.message.toLowerCase().includes('row-level security')
        ? 'Complete barangay verification before saving items.'
        : error.message,
    };
  }

  return { data: mapSavedItem(data), error: null };
}

export async function unsaveItem(target: SavedItemTarget): Promise<ServiceResult<boolean>> {
  const normalized = normalizeTarget(target);
  if (!normalized) return { data: null, error: 'Choose an item to remove.' };

  const user = await getCurrentUserId();
  if (user.error) return user;
  if (!user.data) return { data: null, error: 'Please sign in again to continue.' };

  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', user.data)
    .eq('item_type', normalized.itemType)
    .eq('item_id', normalized.itemId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function toggleSavedItem(
  target: SavedItemTarget,
): Promise<ServiceResult<{ saved: boolean }>> {
  const saved = await isItemSaved(target);
  if (saved.error) return saved;

  if (saved.data) {
    const removed = await unsaveItem(target);
    if (removed.error) return removed;
    return { data: { saved: false }, error: null };
  }

  const created = await saveItem(target);
  if (created.error) return created;
  return { data: { saved: true }, error: null };
}

function normalizeTarget(target: SavedItemTarget): SavedItemTarget | null {
  const itemId = compactText(target.itemId);
  if (!itemId || (target.itemType !== 'job' && target.itemType !== 'provider')) return null;

  return {
    itemType: target.itemType,
    itemId,
  };
}

function mapSavedItem(row: SavedItemRow): SavedItem {
  return {
    id: row.id,
    userId: row.user_id,
    itemType: row.item_type,
    itemId: row.item_id,
    createdAt: row.created_at,
  };
}
