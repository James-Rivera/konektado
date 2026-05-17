import { useCallback, useState } from 'react';

import {
  getSavedItemKey,
  getSavedItems,
  toggleSavedItem,
  type SavedItemTarget,
} from '@/services/saved-items.service';

export function useSavedItems() {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshSavedItems = useCallback(async () => {
    setLoading(true);
    const result = await getSavedItems();
    setLoading(false);

    if (result.error || !result.data) {
      return result;
    }

    setSavedKeys(new Set(result.data.map((item) => getSavedItemKey(item))));
    return result;
  }, []);

  const isSaved = useCallback(
    (target: SavedItemTarget) => savedKeys.has(getSavedItemKey(target)),
    [savedKeys],
  );

  const isPending = useCallback(
    (target: SavedItemTarget) => pendingKeys.has(getSavedItemKey(target)),
    [pendingKeys],
  );

  const toggleSaved = useCallback(async (target: SavedItemTarget) => {
    const key = getSavedItemKey(target);
    if (pendingKeys.has(key)) {
      return { data: null, error: 'Please wait for the current save action to finish.' } as const;
    }

    setPendingKeys((current) => new Set(current).add(key));
    const result = await toggleSavedItem(target);
    setPendingKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });

    if (result.data) {
      setSavedKeys((current) => {
        const next = new Set(current);
        if (result.data.saved) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    }

    return result;
  }, [pendingKeys]);

  return {
    isPending,
    isSaved,
    loading,
    refreshSavedItems,
    toggleSaved,
  };
}
