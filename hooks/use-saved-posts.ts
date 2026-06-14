import { useCallback, useRef, useState } from 'react';

import {
  getSavedPostKey,
  listSavedPostReferences,
  savePost,
  unsavePost,
  type SavedPostTarget,
} from '@/services/saved-posts.service';

export function useSavedPosts() {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const savedKeysRef = useRef(savedKeys);
  const pendingKeysRef = useRef(pendingKeys);

  const replaceSavedKeys = useCallback((next: Set<string>) => {
    savedKeysRef.current = next;
    setSavedKeys(next);
  }, []);

  const replacePendingKeys = useCallback((next: Set<string>) => {
    pendingKeysRef.current = next;
    setPendingKeys(next);
  }, []);

  const refreshSavedPosts = useCallback(async () => {
    setLoading(true);
    const result = await listSavedPostReferences();
    setLoading(false);

    if (result.error || !result.data) {
      return result;
    }

    replaceSavedKeys(new Set(result.data.map((item) => getSavedPostKey(item))));
    return result;
  }, [replaceSavedKeys]);

  const isSaved = useCallback(
    (target: SavedPostTarget) => savedKeys.has(getSavedPostKey(target)),
    [savedKeys],
  );

  const isPending = useCallback(
    (target: SavedPostTarget) => pendingKeys.has(getSavedPostKey(target)),
    [pendingKeys],
  );

  const toggleSaved = useCallback(async (target: SavedPostTarget) => {
    const key = getSavedPostKey(target);
    if (pendingKeysRef.current.has(key)) {
      return { data: null, error: 'Please wait for the current save action to finish.' } as const;
    }

    const wasSaved = savedKeysRef.current.has(key);
    const optimisticKeys = new Set(savedKeysRef.current);
    if (wasSaved) optimisticKeys.delete(key);
    else optimisticKeys.add(key);
    replaceSavedKeys(optimisticKeys);

    const nextPending = new Set(pendingKeysRef.current).add(key);
    replacePendingKeys(nextPending);

    const result = wasSaved ? await unsavePost(target) : await savePost(target);

    const remainingPending = new Set(pendingKeysRef.current);
    remainingPending.delete(key);
    replacePendingKeys(remainingPending);

    if (result.error) {
      const rollbackKeys = new Set(savedKeysRef.current);
      if (wasSaved) rollbackKeys.add(key);
      else rollbackKeys.delete(key);
      replaceSavedKeys(rollbackKeys);
      return { data: null, error: result.error } as const;
    }

    return { data: { saved: !wasSaved }, error: null } as const;
  }, [replacePendingKeys, replaceSavedKeys]);

  return {
    isPending,
    isSaved,
    loading,
    refreshSavedPosts,
    toggleSaved,
  };
}
