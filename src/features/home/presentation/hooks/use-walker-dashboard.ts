import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, useWalkerDashboardActions } from '../../../../composition/application-provider';
import type { WalkerDashboard } from '../../domain/entities/walker-dashboard';

type DashboardState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; uid: string; data: WalkerDashboard };
type AvailabilityState = { uid: string | null; busy: boolean; message: string | null; error: boolean };
export function useWalkerDashboard() {
  const session = useSession();
  const actions = useWalkerDashboardActions();
  const uid = session.status === 'authenticated' && session.role === 'WALKER' ? session.uid : null;
  const generation = useRef(0);
  const updating = useRef<string | null>(null);
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [availability, setAvailability] = useState<AvailabilityState>({ uid, busy: false, message: null, error: false });
  const load = useCallback(async () => {
    if (uid !== null && updating.current === uid) return;
    const current = ++generation.current;
    setAvailability({ uid, busy: false, message: null, error: false });
    if (!uid || !actions) { setState({ status: 'error', message: 'No pudimos identificar tu cuenta de paseador.' }); return; }
    setState({ status: 'loading' });
    try {
      const result = await actions.getDashboard({ status: 'authenticated', uid, role: 'WALKER' });
      if (current === generation.current) setState(result.ok ? { status: 'ready', uid, data: result.value } : { status: 'error', message: result.error.message });
    } catch {
      if (current === generation.current) setState({ status: 'error', message: 'No pudimos cargar tu inicio. Intentá nuevamente.' });
    }
  }, [uid, actions]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const changeAvailability = useCallback(async (value: boolean) => {
    if (!uid || !actions || updating.current === uid || state.status !== 'ready' || state.uid !== uid || !state.data.hasWalkerProfile || state.data.available === value) return;
    const current = generation.current;
    updating.current = uid;
    setAvailability({ uid, busy: true, message: null, error: false });
    try {
      const result = await actions.updateAvailability({ status: 'authenticated', uid, role: 'WALKER' }, value);
      if (current !== generation.current) return;
      if (result.ok) setState((previous) => previous.status === 'ready' && previous.uid === uid ? { ...previous, data: { ...previous.data, available: value } } : previous);
      setAvailability({ uid, busy: false, error: !result.ok, message: result.ok ? (value ? 'Ahora estás disponible para recibir solicitudes.' : 'Ya no estás disponible para nuevas solicitudes.') : result.error.message });
    } catch {
      if (current === generation.current) setAvailability({ uid, busy: false, error: true, message: 'No pudimos actualizar tu disponibilidad. Intentá nuevamente.' });
    } finally { if (updating.current === uid) updating.current = null; }
  }, [uid, actions, state]);
  const visible: DashboardState = state.status === 'ready' && state.uid !== uid ? { status: 'loading' } : state;
  return { state: visible, reload: load, changeAvailability, availability: availability.uid === uid ? availability : { uid, busy: false, message: null, error: false } };
}
