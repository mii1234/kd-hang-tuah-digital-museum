import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MuseumData } from './types';
import { loadMuseumData } from './loader';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MuseumData };

const DataCtx = createContext<{ state: State; reload: () => void } | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const load = useCallback(() => {
    setState({ status: 'loading' });
    loadMuseumData()
      .then((data) => setState({ status: 'ready', data }))
      .catch((e: Error) => setState({ status: 'error', message: e.message }));
  }, []);
  useEffect(load, [load]);
  return <DataCtx.Provider value={{ state, reload: load }}>{children}</DataCtx.Provider>;
}

export function useDataState() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useDataState must be used inside DataProvider');
  return ctx;
}

/** For components rendered only after data has loaded (inside <DataGate>). */
export function useMuseum(): MuseumData {
  const { state } = useDataState();
  if (state.status !== 'ready') throw new Error('Museum data is not loaded yet');
  return state.data;
}
