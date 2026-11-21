import { failure, success, type Result } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { WalkLocation } from '../../domain/entities/location';
import type { WalkTracking } from '../../domain/entities/walk-tracking';
import type { Walk } from '../../domain/entities/walk';
import type { WalkLocationRepository } from '../../domain/repositories/walk-location-repository';
import { validWalkLocation } from '../../domain/use-cases/walk-tracking-use-cases';
import type { WalkLocationDataSource } from '../datasources/walk-location-data-source';
import { participant, trackingFailure } from '../mappers/walk-tracking-mapper';
import { observeWalkTracking } from '../datasources/observe-walk-tracking';

export class WalkLocationRepositoryImpl implements WalkLocationRepository {
  constructor(private readonly source: WalkLocationDataSource) {}
  async getWalk(uid: string, id: string): Promise<Result<Walk>> {
    try { return success(participant(id, await this.source.getWalk(uid, id), uid)); }
    catch (error) { return trackingFailure(error); }
  }
  async publish(uid: string, id: string, point: WalkLocation): Promise<Result<void>> {
    if (!validWalkLocation(point)) return failure('validation', 'El GPS no entregó una ubicación válida.');
    const walk = await this.getWalk(uid, id);
    if (!walk.ok) return walk;
    if (walk.value.walkerId !== uid || walk.value.status !== 'IN_PROGRESS') return failure('forbidden', 'La ubicación se comparte solo durante tu paseo en curso.');
    try { await this.source.publish(uid, id, point); return success(undefined); }
    catch (error) { return trackingFailure(error); }
  }
  observe(uid: string, id: string, observer: Observer<WalkTracking>) {
    return observeWalkTracking(this.source, uid, id, observer);
  }
}
