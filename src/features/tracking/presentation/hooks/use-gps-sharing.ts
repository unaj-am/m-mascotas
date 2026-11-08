import { useEffect, useRef, useState } from 'react';
import { useSession, useWalkTrackingActions } from '../../../../composition/application-provider';
import type { LocationCaptureStatus } from '../../../../core/domain/entities/walk-tracking';

export function useGpsSharing() {
  const session = useSession(), actions = useWalkTrackingActions();
  const uid = session.status === 'authenticated' && session.role === 'WALKER' ? session.uid : null;
  const currentUid = useRef(uid); currentUid.current = uid;
  const [state, setState] = useState<{ uid: string | null; value: LocationCaptureStatus }>({ uid, value: { sharing: false, walkId: null, message: null } });
  const [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const lock = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!uid || !actions) return;
    let active = true;
    const refresh = async () => {
      const result = await actions.status({ status: 'authenticated', uid, role: 'WALKER' });
      if (active) setState({ uid, value: result.ok ? result.value : { sharing: false, walkId: null, message: result.error.message } });
    };
    void refresh(); const timer = setInterval(() => { void refresh(); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [uid, actions, attempt]);
  async function resume(id: string) {
    if (!uid || !actions || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await actions.start({ status: 'authenticated', uid, role: 'WALKER' }, id);
      if (mounted.current && currentUid.current === uid) {
        if (!result.ok) setState({ uid, value: { sharing: false, walkId: id, message: result.error.message } });
        else setAttempt((value) => value + 1);
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return { state: state.uid === uid ? state.value : { sharing: false, walkId: null, message: null }, busy, resume };
}
