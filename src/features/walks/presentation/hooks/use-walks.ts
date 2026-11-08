import { useCallback } from 'react';
import { useSession, useWalkExecutionActions } from '../../../../composition/application-provider';
import type { Walk } from '../../../../core/domain/entities/walk';
import type { RequestSide } from '../../../../core/domain/entities/walk-request';
import { useLiveList } from '../../../../core/ui/use-live-list';
import type { Observer } from '../../../../shared/types/subscription';
import type { LiveList } from '../../../../shared/types/live-list';
import { failure } from '../../../../shared/types/result';

export function useWalks(side: RequestSide) {
  const session = useSession(), actions = useWalkExecutionActions();
  const role = side === 'owner' ? 'OWNER' : 'WALKER';
  const uid = session.status === 'authenticated' && session.role === role ? session.uid : null;
  const subscribe = useCallback((observer: Observer<LiveList<Walk>>) => {
    if (uid && actions) return actions.observeWalks({ status: 'authenticated', uid, role }, side, observer);
    observer(failure('unauthenticated', 'No pudimos identificar tu cuenta.')); return () => {};
  }, [uid, role, side, actions]);
  return { ...useLiveList(uid ? `${side}:${uid}` : null, subscribe), uid };
}
