import type { LocationCaptureRepository } from '../../domain/repositories/location-capture-repository';
import { failure, success } from '../../../shared/types/result';
import { nativeGpsFailure, prepareNativeLocation } from './native-location-permissions';
import { LOCATION_TASK, hasNativeLocation, readCaptureSession, locationModule, saveCaptureSession, stopNativeCapture } from './native-location-session';

export function createNativeLocationCapture(): LocationCaptureRepository {
  const prepare = () => prepareNativeLocation(() => hasNativeLocation() ? locationModule() : null);
  return {
    prepare,
    async start(uid, walkId) {
      const ready = await prepare(); if (!ready.ok) return ready;
      try {
        const previous = await readCaptureSession();
        if (previous?.uid === uid && previous.walkId === walkId && await locationModule().hasStartedLocationUpdatesAsync(LOCATION_TASK)) return success(undefined);
        await stopNativeCapture(); await saveCaptureSession({ uid, walkId, captureStartedAt: Date.now(), previous: null, message: null });
        await locationModule().startLocationUpdatesAsync(LOCATION_TASK, { accuracy: locationModule().Accuracy.High, timeInterval: 5000, distanceInterval: 0,
          pausesUpdatesAutomatically: false, foregroundService: { notificationTitle: 'Paseo en curso', notificationBody: 'Compartiendo la ubicación del paseador', killServiceOnDestroy: true } });
        return success(undefined);
      } catch (error) {
        try { await stopNativeCapture(); } catch (cleanupError) { console.warn('[GPS:limpieza]', cleanupError); }
        return nativeGpsFailure('inicio', error);
      }
    },
    async stop(uid) { try { return await stopNativeCapture(uid); } catch { return failure('unexpected', 'No pudimos detener el GPS. Desactivá la ubicación desde los ajustes del teléfono.'); } },
    async status(uid) {
      if (!hasNativeLocation()) return success({ walkId: null, sharing: false, message: 'Actualizá Mascotas para usar el seguimiento GPS.' });
      try { const active = await readCaptureSession(); return success({ walkId: active?.uid === uid ? active.walkId : null,
        sharing: active?.uid === uid && await locationModule().hasStartedLocationUpdatesAsync(LOCATION_TASK), message: active?.uid === uid ? active.message : null }); }
      catch { return failure('unexpected', 'No pudimos consultar el estado del GPS.'); }
    },
  };
}
