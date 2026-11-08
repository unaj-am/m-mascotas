import { failure, type Result } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { WalkTracking } from '../entities/walk-tracking';
import type { Session } from '../entities/session';
import type { WalkLocation } from '../entities/location';
import type { WalkLocationRepository } from '../repositories/walk-location-repository';
import type { LocationCaptureRepository } from '../repositories/location-capture-repository';

export function validWalkLocation(point: WalkLocation): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 &&
    Number.isFinite(point.accuracy) && point.accuracy >= 0 && Number.isSafeInteger(point.recordedAt) && point.recordedAt > 0 &&
    (point.bearing === null || (Number.isFinite(point.bearing) && point.bearing >= 0 && point.bearing <= 360)) &&
    (point.speed === null || (Number.isFinite(point.speed) && point.speed >= 0));
}
export function locationDistance(a: WalkLocation, b: WalkLocation) {
  const rad = Math.PI / 180, lat = (b.latitude - a.latitude) * rad, lng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
// Mismos umbrales que TrackWalkLocationUseCase.kt.
export function shouldPublishLocation(previous: WalkLocation | null, point: WalkLocation) {
  if (!validWalkLocation(point) || point.accuracy > 35) return false;
  if (!previous) return true;
  return point.recordedAt > previous.recordedAt && (point.recordedAt - previous.recordedAt >= 30000 || locationDistance(previous, point) >= Math.max(5, point.accuracy * 0.5));
}
export function createWalkTrackingUseCases(repository: WalkLocationRepository, capture: LocationCaptureRepository) {
  const walker = (session: Session) => session.status === 'authenticated' && session.role === 'WALKER';
  async function safely<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
    try { return await work(); } catch { return failure('unavailable', 'No pudimos acceder al GPS. Revisá los permisos y volvé a intentar.'); }
  }
  return {
    observe(session: Session, id: string, observer: Observer<WalkTracking>) {
      if (session.status !== 'authenticated' || !id.trim() || id.includes('/')) { observer(failure('forbidden', 'Iniciá sesión para consultar el seguimiento.')); return () => {}; }
      return repository.observe(session.uid, id, observer);
    },
    prepare(session: Session) { return walker(session) ? safely(() => capture.prepare()) : Promise.resolve(failure('forbidden', 'Solo el paseador puede compartir su ubicación.')); },
    async start(session: Session, id: string): Promise<Result<void>> {
      if (session.status !== 'authenticated' || session.role !== 'WALKER' || !id.trim() || id.includes('/')) return failure('forbidden', 'Solo el paseador puede compartir su ubicación.');
      const walk = await repository.getWalk(session.uid, id);
      if (!walk.ok) return walk;
      if (walk.value.walkerId !== session.uid || walk.value.status !== 'IN_PROGRESS') return failure('forbidden', 'La ubicación se comparte solo durante tu paseo en curso.');
      return safely(() => capture.start(session.uid, id));
    },
    stop: (session: Session) => safely(() => session.status === 'authenticated' ? capture.stop(session.uid) : capture.stop()),
    status: (session: Session) => session.status === 'authenticated' ? safely(() => capture.status(session.uid)) : Promise.resolve(failure('unauthenticated', 'No hay una sesión activa.')),
    stopAll: () => safely(() => capture.stop()),
    async reconcile(session: Session) {
      if (session.status !== 'authenticated' || session.role !== 'WALKER') return capture.stop();
      const active = await capture.status(session.uid);
      if (!active.ok || !active.value.walkId) return;
      const walk = await repository.getWalk(session.uid, active.value.walkId);
      if ((walk.ok && walk.value.status !== 'IN_PROGRESS') || (!walk.ok && (walk.error.code === 'forbidden' || walk.error.code === 'not-found'))) await capture.stop(session.uid);
    },
  };
}
