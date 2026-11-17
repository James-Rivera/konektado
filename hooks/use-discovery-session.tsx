import { createContext, useCallback, useContext, useMemo, useReducer, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { SearchMode } from '@/constants/search-demo-data';
import { useProfile } from '@/hooks/use-profile';
import { resolveHomeFeedMode, type HomeFeedFilters } from '@/services/home-feed.service';
import type { SearchDiscoveryFilters } from '@/types/discovery.types';
import { createDiscoverySession, discoveryReducer, type DiscoveryAction, type DiscoverySession } from '@/utils/discovery-session';

const DiscoveryContext = createContext<{ state: DiscoverySession; dispatch: Dispatch<DiscoveryAction> } | null>(null);

function DiscoveryScope({ children, initialMode }: { children: ReactNode; initialMode: SearchMode }) {
  const [state, dispatch] = useReducer(discoveryReducer, initialMode, createDiscoverySession);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function DiscoverySessionProvider({ children }: { children: ReactNode }) {
  const { profile, preferences } = useProfile();
  const initialMode = resolveHomeFeedMode({ activeRole: profile?.active_role, preferences }) === 'client' ? 'workers' : 'jobs';
  // Session-only UI state. Account changes reset it; profile refreshes do not.
  return <DiscoveryScope key={profile?.id ?? 'signed-out'} initialMode={initialMode}>{children}</DiscoveryScope>;
}

export function useDiscoverySession() {
  const context = useContext(DiscoveryContext);
  if (!context) throw new Error('DiscoverySessionProvider is required');
  const { state, dispatch } = context;
  const setMode = useCallback((value: SearchMode) => dispatch({ type: 'mode', value }), [dispatch]);
  const setQuery = useCallback((value: SetStateAction<string>) => dispatch({ type: 'query', value }), [dispatch]);
  const setFilters = useCallback((value: SetStateAction<SearchDiscoveryFilters>) => dispatch({ type: 'filters', value }), [dispatch]);
  const setHomeFilters = useCallback((value: SetStateAction<HomeFeedFilters>) => dispatch({ type: 'homeFilters', value }), [dispatch]);
  return { ...state, setMode, setQuery, setFilters, setHomeFilters };
}
