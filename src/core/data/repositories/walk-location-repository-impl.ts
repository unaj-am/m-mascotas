import { failure, success, type Result } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { WalkLocation } from '../../domain/entities/location';
import type { WalkTracking } from '../../domain/entities/walk-tracking';
import type { Walk } from '../../domain/entities/walk';
import type { WalkLocationRepository } from '../../domain/repositories/walk-location-repository';
import { validWalkLocation } from '../../domain/use-cases/walk-tracking-use-cases';
import type { WalkLocationDataSource } from '../datasources/walk-location-data-source';
import { record } from '../mappers/dashboard-values';
import { toWalk } from '../mappers/walk-mapper';
import { toWalkLocation } from '../mappers/walk-location-mapper';

function trackingFailure(error: unknown): Result<never> {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return failure('forbidden', 'No tenés acceso al seguimiento de este paseo.');
  if (code.includes('not-found')) return failure('not-found', 'No encontramos el paseo.');
  if (code.includes('unavailable') || code.includes('network') || code.includes('deadline')) return failure('unavailable', 'No pudimos conectar el seguimiento. Revisá tu conexión.');
  return failure('unexpected', 'No pudimos consultar o compartir la ubicación. Intentá nuevamente.');
}
function participant(id: string, raw: unknown, uid: string) {
  if (!raw) throw { code: 'not-found' };
  const data = record(raw);
  if (data.ownerId !== uid && data.walkerId !== uid) throw { code: 'permission-denied' };
  return toWalk({ id, data }, uid, data.ownerId === uid ? 'owner' : 'walker');
}
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
    let active = true, walk: Walk | null = null, current: WalkLocation | null = null, history: readonly WalkLocation[] = [];
    let currentReady = false, historyReady = false, currentStop: (() => void) | null = null, historyStop: (() => void) | null = null;
    let mode: string | null = null, generation = 0, failed = false;
    const metadata = { walk: { fromCache: true, pendingWrites: false }, current: { fromCache: true, pendingWrites: false }, history: { fromCache: true, pendingWrites: false } };
    const stops = () => { generation++; currentStop?.(); historyStop?.(); currentStop = historyStop = null; };
    const emit = () => {
      if (!active || !walk || failed) return;
      const parts = [metadata.walk, ...(mode === 'IN_PROGRESS' ? [metadata.current, metadata.history] : mode === 'SCHEDULED' ? [] : [metadata.history])];
      observer(success({ walk, current, history, loadingLocations: mode !== 'SCHEDULED' && (!historyReady || (mode === 'IN_PROGRESS' && !currentReady)),
        fromCache: parts.some((part) => part.fromCache), pendingWrites: parts.some((part) => part.pendingWrites) }));
    };
    const error = (value: unknown) => { if (active) observer(trackingFailure(value)); };
    try {
      const stopWalk = this.source.observeWalk(uid, id, (snapshot) => {
        if (!active) return;
        if (snapshot.fromCache && snapshot.data === null) return;
        try {
          walk = participant(id, snapshot.data, uid); metadata.walk = snapshot;
          if (walk.status !== mode) {
            stops(); failed = false; mode = walk.status; current = null; history = []; currentReady = historyReady = false;
            const version = generation;
            const childError = (value: unknown) => { if (active && generation === version) { failed = true; stops(); error(value); } };
            if (mode !== 'SCHEDULED') {
              historyStop = this.source.observeHistory(uid, id, (value) => {
                if (!active || generation !== version) return;
                try { history = value.data.map(toWalkLocation).sort((a, b) => a.recordedAt - b.recordedAt); metadata.history = value; historyReady = true; emit(); }
                catch (value) { childError(value); }
              }, childError);
            }
            if (mode === 'IN_PROGRESS') currentStop = this.source.observeCurrent(uid, id, (value) => {
              if (!active || generation !== version) return;
              try { current = value.data === null ? null : toWalkLocation(value.data); metadata.current = value; currentReady = true; emit(); }
              catch (value) { childError(value); }
            }, childError);
          }
          emit();
        } catch (value) { failed = true; stops(); error(value); }
      }, error);
      return () => { active = false; stops(); stopWalk(); };
    } catch (value) { stops(); error(value); return () => { active = false; }; }
  }
}
