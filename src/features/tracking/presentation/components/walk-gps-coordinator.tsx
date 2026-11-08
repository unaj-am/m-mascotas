import { useEffect } from 'react';
import { useSession, useWalkTrackingActions } from '../../../../composition/application-provider';
import { useWalks } from '../../../walks/presentation/hooks/use-walks';

export function WalkGpsCoordinator() {
  const session = useSession(), actions = useWalkTrackingActions(), walks = useWalks('walker');
  useEffect(() => {
    if (session.status !== 'authenticated' || session.role !== 'WALKER' || !actions || walks.state.status !== 'ready' || walks.state.data.fromCache || walks.state.data.pendingWrites) return;
    let active = true;
    const current = session;
    const items = walks.state.data.items;
    void actions.status(current).then((result) => {
      if (active && result.ok && result.value.walkId && !items.some((walk) => walk.id === result.value.walkId && walk.status === 'IN_PROGRESS')) void actions.reconcile(current);
    });
    return () => { active = false; };
  }, [session, actions, walks.state]);
  return null;
}
