import type { Unsubscribe } from '../../../shared/types/subscription';
import type { WalkRequestDraft, RequestSide } from '../../domain/entities/walk-request';
import type { DashboardDocument } from './dashboard-document';

export type BookingSnapshot = Readonly<{ documents: readonly DashboardDocument[]; fromCache: boolean; pendingWrites: boolean }>;
export type BookingListener = (snapshot: BookingSnapshot) => void;
export interface WalkBookingDataSource {
  newRequestId(): string;
  observeAvailableWalkers(listener: BookingListener, onError: (error: unknown) => void): Unsubscribe;
  createRequest(ownerId: string, draft: WalkRequestDraft): Promise<void>;
  observeRequests(uid: string, side: RequestSide, listener: BookingListener, onError: (error: unknown) => void): Unsubscribe;
  acceptRequest(walkerId: string, requestId: string): Promise<DashboardDocument>;
  updateWalk(walkerId: string, walkId: string, action: 'start' | 'complete'): Promise<DashboardDocument>;
  observeWalks(uid: string, side: RequestSide, listener: BookingListener, onError: (error: unknown) => void): Unsubscribe;
}
