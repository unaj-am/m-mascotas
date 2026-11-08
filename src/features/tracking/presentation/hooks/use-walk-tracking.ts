import { useEffect, useState } from 'react';
import { useSession, useWalkTrackingActions } from '../../../../composition/application-provider';
import type { WalkTracking } from '../../../../core/domain/entities/walk-tracking';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: WalkTracking };
export function useWalkTracking(id: string) {
  const session = useSession(), actions = useWalkTrackingActions();
  const uid = session.status === 'authenticated' ? session.uid : null;
  const role = session.status === 'authenticated' ? session.role : null;
  const [attempt, setAttempt] = useState(0);
  const key = `${uid}:${id}`;
  const [snapshot, setSnapshot] = useState<{ key: string; state: State }>({ key, state: { status: 'loading' } });
  useEffect(() => {
    let active = true;
    setSnapshot({ key, state: { status: 'loading' } });
    if (!uid || !role || !actions) { setSnapshot({ key, state: { status: 'error', message: 'No pudimos identificar tu cuenta.' } }); return; }
    const timeout = setTimeout(() => { if (active) setSnapshot({ key, state: { status: 'error', message: 'No pudimos conectar el seguimiento. Revisá tu conexión.' } }); }, 15000);
    const stop = actions.observe({ status: 'authenticated', uid, role }, id, (result) => {
      if (!active) return;
      clearTimeout(timeout); setSnapshot({ key, state: result.ok ? { status: 'ready', data: result.value } : { status: 'error', message: result.error.message } });
    });
    return () => { active = false; clearTimeout(timeout); stop(); };
  }, [key, uid, role, id, actions, attempt]);
  const state: State = snapshot.key === key ? snapshot.state : { status: 'loading' };
  return { state, retry: () => setAttempt((value) => value + 1) };
}
