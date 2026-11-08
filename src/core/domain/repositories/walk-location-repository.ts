import type { Result } from '../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';
import type { WalkLocation } from '../entities/location';
import type { WalkTracking } from '../entities/walk-tracking';
import type { Walk } from '../entities/walk';

/** Ubicación actual e historial con el contrato compartido con Kotlin. */
export interface WalkLocationRepository {
  getWalk(uid: string, walkId: string): Promise<Result<Walk>>;
  observe(uid: string, walkId: string, observer: Observer<WalkTracking>): Unsubscribe;
  publish(uid: string, walkId: string, location: WalkLocation): Promise<Result<void>>;
}
