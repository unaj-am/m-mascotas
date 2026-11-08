import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, useWalkBookingActions } from '../../../../composition/application-provider';
import type { Walker } from '../../../../core/domain/entities/walker';
import type { WalkRequestDraft } from '../../../../core/domain/entities/walk-request';
import { useLiveList } from '../../../../core/ui/use-live-list';
import type { LiveList } from '../../../../shared/types/live-list';
import type { Observer } from '../../../../shared/types/subscription';
import { failure, type Result } from '../../../../shared/types/result';

export function useWalkerSearch() {
  const session = useSession(), actions = useWalkBookingActions();
  const uid = session.status === 'authenticated' && session.role === 'OWNER' ? session.uid : null;
  const currentUid = useRef(uid); currentUid.current = uid;
  const mounted = useRef(false), busy = useRef(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const subscribe = useCallback((observer: Observer<LiveList<Walker>>) => {
    if (uid && actions) return actions.observeWalkers({ status: 'authenticated', uid, role: 'OWNER' }, observer);
    observer(failure('unauthenticated', 'Iniciá sesión como dueño para buscar paseadores.')); return () => {};
  }, [uid, actions]);
  const list = useLiveList(uid, subscribe);
  function newId() {
    if (!uid || uid !== currentUid.current || !actions) return failure('unauthenticated', 'La sesión cambió. Volvé a ingresar.');
    return actions.newRequestId({ status: 'authenticated', uid, role: 'OWNER' });
  }
  async function submit(draft: WalkRequestDraft): Promise<Result<void>> {
    if (!uid || uid !== currentUid.current || !actions) return failure('unauthenticated', 'La sesión cambió. Volvé a ingresar.');
    if (busy.current) return failure('conflict', 'Esperá a que termine el envío de la solicitud.');
    busy.current = true; setSaving(true);
    try {
      const result = await actions.createRequest({ status: 'authenticated', uid, role: 'OWNER' }, draft);
      return uid === currentUid.current ? result : failure('unauthenticated', 'La sesión cambió durante el envío.');
    } catch { return failure('unexpected', 'No pudimos enviar la solicitud. Intentá nuevamente.'); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  return { ...list, uid, saving, newId, submit };
}
export type WalkerSearch = ReturnType<typeof useWalkerSearch>;
