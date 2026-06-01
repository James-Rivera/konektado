import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { ServiceResult } from '@/services/auth.service';

type DraftRecord = {
  id: string;
};

type SaveDraft<Input, Record extends DraftRecord> = (args: {
  draftId?: string | null;
  input: Input;
}) => Promise<ServiceResult<Record>>;

type UseDraftAutosaveOptions<Input, Record extends DraftRecord> = {
  debounceMs?: number;
  draftId: string | null;
  enabled: boolean;
  hydrated: boolean;
  input: Input;
  isMeaningful: (input: Input) => boolean;
  onDraftIdChange: (draftId: string) => void;
  saveDraft: SaveDraft<Input, Record>;
  serialize?: (input: Input) => string;
};

type FlushResult = ServiceResult<{ id: string }> | null;

export function useDraftAutosave<Input, Record extends DraftRecord>({
  debounceMs = 750,
  draftId,
  enabled,
  hydrated,
  input,
  isMeaningful,
  onDraftIdChange,
  saveDraft,
  serialize = JSON.stringify,
}: UseDraftAutosaveOptions<Input, Record>) {
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

  draftIdRef.current = draftId;
  enabledRef.current = enabled;
  hydratedRef.current = hydrated;
  inputRef.current = input;
  isMeaningfulRef.current = isMeaningful;
  onDraftIdChangeRef.current = onDraftIdChange;
  saveDraftRef.current = saveDraft;
  serializeRef.current = serialize;

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

        if (!enabledRef.current || !hydratedRef.current || !isMeaningfulRef.current(nextInput)) {
          return null;
        }

        const serialized = serializeRef.current(nextInput);
        if (serialized === lastSavedSerializedRef.current && draftIdRef.current) {
          return { data: { id: draftIdRef.current }, error: null };
        }

        const result = await saveDraftRef.current({
          draftId: draftIdRef.current,
          input: nextInput,
        });

        if (result.error || !result.data) {
          return { data: null, error: result.error ?? 'Could not save your draft.' };
        }

        draftIdRef.current = result.data.id;
        lastSavedSerializedRef.current = serialized;
        if (mountedRef.current) {
          onDraftIdChangeRef.current(result.data.id);
        }
        return { data: { id: result.data.id }, error: null };
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

  return { flush };
}
