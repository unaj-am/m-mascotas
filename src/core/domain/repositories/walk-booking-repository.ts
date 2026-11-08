import type { Result } from '../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';
import type { LiveList } from '../../../shared/types/live-list';
import type { Walker } from '../entities/walker';
import type { WalkRequest, WalkRequestDraft, RequestSide } from '../entities/walk-request';
import type { Walk } from '../entities/walk';

/** Contrato del directorio y del envío/seguimiento de solicitudes. */
export interface WalkBookingRepository {
  newRequestId(): string;
  observeAvailableWalkers(observer: Observer<LiveList<Walker>>): Unsubscribe;
  createRequest(ownerId: string, draft: WalkRequestDraft): Promise<Result<void>>;
  observeRequests(uid: string, side: RequestSide, observer: Observer<LiveList<WalkRequest>>): Unsubscribe;
  acceptRequest(walkerId: string, requestId: string): Promise<Result<Walk>>;
  startWalk(walkerId: string, walkId: string): Promise<Result<Walk>>;
  completeWalk(walkerId: string, walkId: string): Promise<Result<Walk>>;
  observeWalks(uid: string, side: RequestSide, observer: Observer<LiveList<Walk>>): Unsubscribe;
}
