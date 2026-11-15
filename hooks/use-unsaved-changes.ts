import { createElement, useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { Platform } from 'react-native';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

export function useUnsavedChanges(dirty: boolean, options?: { message?: string; onDiscard?: () => Promise<boolean> }) {
  const navigation = useNavigation();
  const [pendingAction,setPendingAction] = useState<NavigationAction | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  usePreventRemove(dirty, ({ data }) => { setPendingAction(data.action); setError(null); });
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty || typeof window === 'undefined') return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const discard = async () => {
    if (!pendingAction || busy) return;
    setBusy(true);
    try {
      if (options?.onDiscard && !(await options.onDiscard())) { setError('Could not discard these changes. Reconnect and retry.'); return; }
      const action=pendingAction; setPendingAction(null); navigation.dispatch(action);
    } catch { setError('Could not discard these changes. Your draft is still available.'); }
    finally { setBusy(false); }
  };
  return createElement(ConfirmationDialog,{visible:Boolean(pendingAction),title:'Discard unsaved changes?',message:options?.message ?? 'Your saved profile will stay unchanged.',busy,error,onCancel:()=> {if(!busy)setPendingAction(null);},onConfirm:()=>{void discard();}});
}
