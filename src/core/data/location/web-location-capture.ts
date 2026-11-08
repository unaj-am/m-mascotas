import { failure, success } from '../../../shared/types/result';
import type { WalkLocation } from '../../domain/entities/location';
import type { WalkLocationRepository } from '../../domain/repositories/walk-location-repository';
import type { LocationCaptureRepository } from '../../domain/repositories/location-capture-repository';
import { shouldPublishLocation } from '../../domain/use-cases/walk-tracking-use-cases';

export function createWebLocationCapture(repository: WalkLocationRepository): LocationCaptureRepository {
  let watch: number | null = null, uid: string | null = null, id: string | null = null, generation = 0;
  let previous: WalkLocation | null = null, busy = false, message: string | null = null;
  const point = (value: GeolocationPosition): WalkLocation => ({ latitude: value.coords.latitude, longitude: value.coords.longitude,
    accuracy: value.coords.accuracy, bearing: value.coords.heading, speed: value.coords.speed, recordedAt: Math.round(value.timestamp) });
  async function prepare() {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !globalThis.isSecureContext) return failure('unavailable', 'El GPS del navegador requiere HTTPS o localhost y un navegador compatible.');
    return new Promise<ReturnType<typeof success<void>> | ReturnType<typeof failure>>((resolve) => navigator.geolocation.getCurrentPosition(
      () => resolve(success(undefined)), () => resolve(failure('forbidden', 'Permití el acceso a la ubicación y activá el GPS para iniciar el paseo.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }));
  }
  async function stop(currentUid?: string) {
    if (currentUid && uid !== currentUid) return success(undefined);
    generation++; if (watch !== null) navigator.geolocation.clearWatch(watch);
    watch = null; uid = id = null; previous = null; message = null; return success(undefined);
  }
  return {
    prepare, stop,
    async start(currentUid, walkId) {
      if (watch !== null && uid === currentUid && id === walkId) return success(undefined);
      const permission = await prepare(); if (!permission.ok) return permission;
      await stop(); uid = currentUid; id = walkId; const version = generation;
      watch = navigator.geolocation.watchPosition((value) => {
        const location = point(value);
        if (generation !== version || busy || !shouldPublishLocation(previous, location)) return;
        busy = true;
        void repository.publish(currentUid, walkId, location).then(async (result) => {
          if (generation !== version) return;
          if (result.ok) { previous = location; message = null; }
          else { message = result.error.message; if (result.error.code === 'forbidden' || result.error.code === 'not-found') await stop(); }
        }).catch(() => { if (generation === version) message = 'No pudimos compartir la ubicación. Revisá la conexión.'; }).finally(() => { busy = false; });
      }, () => { message = 'No recibimos ubicación del navegador. Revisá los permisos y el GPS.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      return success(undefined);
    },
    async status(currentUid) { return success({ walkId: currentUid === uid ? id : null, sharing: currentUid === uid && watch !== null,
      message: message ?? (watch !== null ? 'En web, mantené esta pestaña abierta para compartir la ubicación.' : null) }); },
  };
}
