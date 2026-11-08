import { useEffect, useRef, useState } from 'react';
import { useSession, useWalkExecutionActions, useWalkTrackingActions } from '../../../../composition/application-provider';
import type { WalkAction } from '../../../../core/domain/use-cases/walk-execution-use-cases';

type Operation = { uid: string | null; id: string | null; action: WalkAction | null; busy: boolean; message: string | null; error: boolean };
const empty: Operation = { uid: null, id: null, action: null, busy: false, message: null, error: false };
export function useWalkExecution() {
  const session = useSession(), actions = useWalkExecutionActions();
  const tracking = useWalkTrackingActions();
  const uid = session.status === 'authenticated' && session.role === 'WALKER' ? session.uid : null;
  const currentUid = useRef(uid); currentUid.current = uid;
  const mounted = useRef(false), busy = useRef(false);
  const [state, setState] = useState<Operation>(empty);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function act(action: WalkAction, id: string) {
    if (!uid || currentUid.current !== uid || !actions || busy.current) return null;
    busy.current = true;
    setState({ uid, id, action, busy: true, message: null, error: false });
    try {
      const current = { status: 'authenticated', uid, role: 'WALKER' } as const;
      if (action === 'start' && tracking) {
        const permission = await tracking.prepare(current);
        if (!mounted.current || currentUid.current !== uid) return null;
        if (!permission.ok) { setState({ uid, id, action, busy: false, error: true, message: permission.error.message }); return null; }
      }
      const result = await actions[action]({ status: 'authenticated', uid, role: 'WALKER' }, id);
      if (!mounted.current || currentUid.current !== uid) return null;
      let gpsMessage: string | null = null;
      if (result.ok && tracking && action !== 'accept') {
        const gps = action === 'start' ? await tracking.start(current, id) : await tracking.stop(current);
        if (!mounted.current || currentUid.current !== uid) return null;
        if (!gps.ok) gpsMessage = gps.error.message;
      }
      const messages = { accept: 'Solicitud aceptada. El paseo está programado.', start: 'Paseo iniciado.', complete: 'Paseo finalizado. Podés consultarlo en el historial.' };
      const acceptedMessage = result.ok && result.value.status !== 'SCHEDULED'
        ? `La solicitud ya estaba aceptada. El paseo ${result.value.status === 'IN_PROGRESS' ? 'está en curso' : result.value.status === 'COMPLETED' ? 'ya finalizó' : 'está cancelado'}.`
        : messages.accept;
      setState({ uid, id, action, busy: false, error: !result.ok || !!gpsMessage,
        message: result.ok ? gpsMessage ? `${messages[action]} ${gpsMessage}` : action === 'accept' ? acceptedMessage : messages[action] : result.error.message });
      return result.ok ? result.value : null;
    } catch {
      if (mounted.current && currentUid.current === uid) setState({ uid, id, action, busy: false, error: true, message: 'No pudimos completar la operación. Intentá nuevamente.' });
      return null;
    } finally { busy.current = false; }
  }
  return { operation: state.uid === uid ? state : empty, act };
}
export type WalkExecution = ReturnType<typeof useWalkExecution>;
