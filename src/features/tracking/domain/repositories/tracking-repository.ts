import type { Result } from '../../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../../shared/types/subscription';
import type { TrackingPoint, WalkLocation } from '../entities/location';

export interface TrackingRepository {
  // Debe persistir el punto y su outbox juntos antes de intentar publicarlo.
  enqueue(point: TrackingPoint): Promise<Result<void>>;
  syncPending(walkId: string): Promise<Result<void>>;
  observeCurrentLocation(walkId: string, observer: Observer<WalkLocation | null>): Unsubscribe;
}
