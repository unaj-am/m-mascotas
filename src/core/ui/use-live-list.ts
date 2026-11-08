import { useEffect, useState } from 'react';
import type { LiveList } from '../../shared/types/live-list';
import type { Observer, Unsubscribe } from '../../shared/types/subscription';

export type LiveListState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: LiveList<T> };
export function useLiveList<T>(identity: string | null, subscribe: (observer: Observer<LiveList<T>>) => Unsubscribe) {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ identity: string | null; state: LiveListState<T> }>({ identity, state: { status: 'loading' } });
  useEffect(() => {
    let active = true;
    setSnapshot({ identity, state: { status: 'loading' } });
    const timeout = setTimeout(() => {
      if (active) setSnapshot({ identity, state: { status: 'error', message: 'No pudimos obtener los datos. Revisá la conexión y volvé a intentar.' } });
    }, 12000);
    const stop = subscribe((result) => {
      if (!active) return;
      clearTimeout(timeout);
      setSnapshot({ identity, state: result.ok ? { status: 'ready', data: result.value } : { status: 'error', message: result.error.message } });
    });
    return () => { active = false; clearTimeout(timeout); stop(); };
  }, [identity, subscribe, attempt]);
  const state: LiveListState<T> = snapshot.identity === identity ? snapshot.state : { status: 'loading' };
  return { state, retry: () => setAttempt((value) => value + 1) };
}
