import { useCallback, useEffect, useRef, useState } from 'react';
import { useGetOwnerDashboard, useSession } from '../../../../composition/application-provider';
import type { OwnerDashboard } from '../../domain/entities/owner-dashboard';
import type { Session } from '../../../auth/domain/entities/session';

type DashboardState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; uid: string; data: OwnerDashboard };
export function useOwnerDashboard() {
  const session = useSession();
  const getDashboard = useGetOwnerDashboard();
  const uid = session.status === 'authenticated' && session.role === 'OWNER' ? session.uid : null;
  const generation = useRef(0);
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const load = useCallback(async () => {
    const current = ++generation.current;
    if (!uid || !getDashboard) { setState({ status: 'error', message: 'No pudimos identificar tu cuenta de dueño.' }); return; }
    setState({ status: 'loading' });
    try {
      const owner: Session = { status: 'authenticated', uid, role: 'OWNER' };
      const result = await getDashboard(owner);
      if (current === generation.current) setState(result.ok ? { status: 'ready', uid, data: result.value } : { status: 'error', message: result.error.message });
    } catch {
      if (current === generation.current) setState({ status: 'error', message: 'No pudimos cargar tu inicio. Intentá nuevamente.' });
    }
  }, [uid, getDashboard]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  // No mostrar ni un render de los datos de la cuenta anterior.
  const visible: DashboardState = state.status === 'ready' && state.uid !== uid ? { status: 'loading' } : state;
  return { state: visible, reload: load };
}
