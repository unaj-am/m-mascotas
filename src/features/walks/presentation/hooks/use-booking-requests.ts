import { useCallback } from 'react';
import { useSession, useWalkBookingActions } from '../../../../composition/application-provider';
import type { RequestSide, WalkRequest } from '../../../../core/domain/entities/walk-request';
import { useLiveList } from '../../../../core/ui/use-live-list';
import type { Observer } from '../../../../shared/types/subscription';
import type { LiveList } from '../../../../shared/types/live-list';
import { failure } from '../../../../shared/types/result';

export function useBookingRequests(side: RequestSide) {
  const session = useSession(), actions = useWalkBookingActions();
  const role = side === 'owner' ? 'OWNER' : 'WALKER';
  const uid = session.status === 'authenticated' && session.role === role ? session.uid : null;
  const subscribe = useCallback((observer: Observer<LiveList<WalkRequest>>) => {
    if (uid && actions) return actions.observeRequests({ status: 'authenticated', uid, role }, side, observer);
    observer(failure('unauthenticated', 'No pudimos identificar tu cuenta.')); return () => {};
  }, [uid, role, side, actions]);
  return { ...useLiveList(uid ? `${side}:${uid}` : null, subscribe), uid };
}
export type BookingRequests = ReturnType<typeof useBookingRequests>;
