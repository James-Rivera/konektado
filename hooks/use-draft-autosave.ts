import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { ServiceResult } from '@/services/auth.service';

type DraftRecord = {
  id: string;
  revision?: number;
};

type SaveDraft<Input, Record extends DraftRecord> = (args: {
  draftId?: string | null;
  expectedRevision?: number;
  input: Input;
}) => Promise<ServiceResult<Record>>;

type UseDraftAutosaveOptions<Input, Record extends DraftRecord> = {
  debounceMs?: number;
  draftId: string | null;
  revision?: number;
  enabled: boolean;
  hydrated: boolean;
  input: Input;
  isMeaningful: (input: Input) => boolean;
  onDraftIdChange: (draftId: string) => void;
  onRevisionChange?: (revision: number) => void;
  saveDraft: SaveDraft<Input, Record>;
  serialize?: (input: Input) => string;
};

type FlushResult = ServiceResult<{ id: string; revision?: number }> | null;

export function useDraftAutosave<Input, Record extends DraftRecord>({
  debounceMs = 750,
  draftId,
  revision,
  enabled,
  hydrated,
  input,
  isMeaningful,
  onDraftIdChange,
  onRevisionChange,
  saveDraft,
  serialize = JSON.stringify,
}: UseDraftAutosaveOptions<Input, Record>) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(input));
  const [wasHydrated, setWasHydrated] = useState(hydrated);
  if (hydrated !== wasHydrated) {
    setWasHydrated(hydrated);
    if (hydrated) setSavedSnapshot(serialize(input));
  }
  const revisionRef = useRef(revision);
  const revisionChangeRef = useRef(onRevisionChange);
  const discardRef = useRef(false);
  const draftIdRef = useRef(draftId);
  const enabledRef = useRef(enabled);
  const hydratedRef = useRef(hydrated);
  const hydrationReadyRef = useRef(hydrated);
  const inputRef = useRef(input);
  const isMeaningfulRef = useRef(isMeaningful);
  const lastSavedSerializedRef = useRef(hydrated ? serialize(input) : null);
  const mountedRef = useRef(true);
  const onDraftIdChangeRef = useRef(onDraftIdChange);
  const saveDraftRef = useRef(saveDraft);
  const serializeRef = useRef(serialize);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  // Latest-value refs, so the debounce timer and the save chain always read
  // current props without re-subscribing. Written after commit rather than
  // during render: everything that reads them (timers, the flush callback,
  // unmount cleanup) runs after the commit that set them.
  useEffect(() => {
    draftIdRef.current = draftId;
    revisionRef.current = revision;
    revisionChangeRef.current = onRevisionChange;
    enabledRef.current = enabled;
    hydratedRef.current = hydrated;
    inputRef.current = input;
    isMeaningfulRef.current = isMeaningful;
    onDraftIdChangeRef.current = onDraftIdChange;
    saveDraftRef.current = saveDraft;
    serializeRef.current = serialize;
  });

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback(
    (overrideInput?: Input): Promise<FlushResult> => {
      clearTimer();

      const persist = async (): Promise<FlushResult> => {
        const nextInput = overrideInput ?? inputRef.current;

        if (discardRef.current || !enabledRef.current || !hydratedRef.current || !isMeaningfulRef.current(nextInput)) {
          return null;
        }

        const serialized = serializeRef.current(nextInput);
        if (serialized === lastSavedSerializedRef.current && draftIdRef.current) {
          return { data: { id: draftIdRef.current, revision: revisionRef.current }, error: null };
        }

        if (mountedRef.current) { setSaveStatus('saving'); setSaveError(null); }
        const result = await saveDraftRef.current({
          draftId: draftIdRef.current,
          expectedRevision: revisionRef.current,
          input: nextInput,
        }).catch(() => ({ data: null, error: 'Could not save your draft. Check your connection and retry.' }));

        if (result.error || !result.data) {
          if (mountedRef.current) { setSaveStatus('error'); setSaveError(result.error ?? 'Could not save your draft.'); }
          return { data: null, error: result.error ?? 'Could not save your draft.' };
        }

        draftIdRef.current = result.data.id;
        revisionRef.current = result.data.revision;
        lastSavedSerializedRef.current = serialized;
        if (mountedRef.current) {
          onDraftIdChangeRef.current(result.data.id);
          if (result.data.revision !== undefined) revisionChangeRef.current?.(result.data.revision);
          setSavedSnapshot(serialized);
          setSaveStatus('saved');
          setSaveError(null);
        }
        return { data: { id: result.data.id, revision: result.data.revision }, error: null };
      };

      const queuedSave = saveChainRef.current.then(persist, persist);
      saveChainRef.current = queuedSave.then(
        () => undefined,
        () => undefined,
      );
      return queuedSave;
    },
    [clearTimer],
  );

  useEffect(() => {
    if (!hydrated) {
      hydrationReadyRef.current = false;
      clearTimer();
      return;
    }

    if (!hydrationReadyRef.current) {
      hydrationReadyRef.current = true;
      lastSavedSerializedRef.current = serialize(input);
      return;
    }

    if (!enabled || !isMeaningful(input)) {
      clearTimer();
      return;
    }

    const serialized = serialize(input);
    if (serialized === lastSavedSerializedRef.current) {
      clearTimer();
      return;
    }

    clearTimer();
    timerRef.current = setTimeout(() => {
      void flush();
    }, debounceMs);

    return clearTimer;
  }, [clearTimer, debounceMs, enabled, flush, hydrated, input, isMeaningful, serialize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') void flush();
    });

    return () => subscription.remove();
  }, [flush]);

  useFocusEffect(
    useCallback(
      () => () => {
        void flush();
      },
      [flush],
    ),
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTimer();
      void flush();
    };
  }, [clearTimer, flush]);

  const discardPending = async () => {
    const baseline = savedSnapshot;
    discardRef.current = true;
    clearTimer();
    await saveChainRef.current;
    if (!draftIdRef.current || lastSavedSerializedRef.current === baseline) return true;
    // A save may have completed while the leave dialog was open. Restore the
    // last confirmed baseline with the same revision check before leaving.
    const result = await saveDraftRef.current({ draftId:draftIdRef.current, expectedRevision:revisionRef.current, input:JSON.parse(baseline) as Input });
    if (result.error || !result.data) {
      discardRef.current = false;
      setSaveStatus('error'); setSaveError(result.error ?? 'Could not discard these changes. Please retry.');
      return false;
    }
    revisionRef.current = result.data.revision;
    lastSavedSerializedRef.current = baseline;
    setSavedSnapshot(baseline);
    return true;
  };
  const hasUnsavedChanges = enabled && hydrated && isMeaningful(input) && serialize(input) !== savedSnapshot;
  return { flush, saveStatus:hasUnsavedChanges && saveStatus !== 'error' ? 'saving' as const : saveStatus, saveError, hasUnsavedChanges, discardPending };
}
