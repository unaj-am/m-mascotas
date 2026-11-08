import { useCallback, useEffect, useRef, useState } from 'react';
import { usePetActions, useSession } from '../../../../composition/application-provider';
import type { PetDraft, PetList } from '../../../../core/domain/entities/pet';
import { failure, type Result } from '../../../../shared/types/result';

type PetState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: PetList };

export function usePets() {
  const session = useSession();
  const actions = usePetActions();
  const uid = session.status === 'authenticated' && session.role === 'OWNER' ? session.uid : null;
  const currentUid = useRef(uid);
  currentUid.current = uid;
  const mounted = useRef(false);
  const savingUid = useRef<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ uid: string | null; state: PetState }>({ uid, state: { status: 'loading' } });

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setSnapshot({ uid, state: { status: 'loading' } });
    if (!uid || !actions) {
      setSnapshot({ uid, state: { status: 'error', message: 'No pudimos identificar tu cuenta de dueño.' } });
      return;
    }
    const timeout = setTimeout(() => {
      if (active) setSnapshot({ uid, state: { status: 'error', message: 'No pudimos obtener tus mascotas. Revisá la conexión y volvé a intentar.' } });
    }, 12000);
    const stop = actions.observe({ status: 'authenticated', uid, role: 'OWNER' }, (result) => {
      if (!active || currentUid.current !== uid) return;
      clearTimeout(timeout);
      setSnapshot({ uid, state: result.ok ? { status: 'ready', data: result.value } : { status: 'error', message: result.error.message } });
    });
    return () => { active = false; clearTimeout(timeout); stop(); };
  }, [uid, actions, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  function newId(): Result<string> {
    if (!uid || currentUid.current !== uid || !actions) return failure('unauthenticated', 'Iniciá sesión como dueño para registrar mascotas.');
    return actions.newId({ status: 'authenticated', uid, role: 'OWNER' });
  }
  async function create(draft: PetDraft): Promise<Result<void>> {
    if (!uid || currentUid.current !== uid || !actions) return failure('unauthenticated', 'La sesión cambió. Volvé a ingresar.');
    if (savingUid.current) return failure('conflict', 'Esperá a que termine el registro de la mascota.');
    savingUid.current = uid;
    setSaving(uid);
    try {
      const result = await actions.create({ status: 'authenticated', uid, role: 'OWNER' }, draft);
      return currentUid.current === uid ? result : failure('unauthenticated', 'La sesión cambió durante el registro.');
    } catch {
      return failure('unexpected', 'No pudimos registrar tu mascota. Intentá nuevamente.');
    } finally {
      savingUid.current = null;
      if (mounted.current) setSaving(null);
    }
  }
  return { uid, state: snapshot.uid === uid ? snapshot.state : { status: 'loading' } as PetState, saving: saving === uid && uid !== null, retry, newId, create };
}

export type PetCatalog = ReturnType<typeof usePets>;
