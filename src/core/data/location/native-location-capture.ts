import { requireOptionalNativeModule } from 'expo';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import type { LocationObject } from 'expo-location';
import type { WalkLocation } from '../../domain/entities/location';
import type { WalkLocationRepository } from '../../domain/repositories/walk-location-repository';
import type { LocationCaptureRepository } from '../../domain/repositories/location-capture-repository';
import { shouldPublishLocation } from '../../domain/use-cases/walk-tracking-use-cases';
import { failure, success } from '../../../shared/types/result';

const TASK = 'mascotas-walk-gps-v1', KEY = '@mascotas/active-walk-gps';
type Context = { uid: string; walkId: string; captureStartedAt: number; previous: WalkLocation | null; message: string | null };
const available = () => !!requireOptionalNativeModule('ExpoLocation') && !!requireOptionalNativeModule('ExpoTaskManager');
const location = (): typeof import('expo-location') => require('expo-location');
const storage = (): typeof import('@react-native-async-storage/async-storage').default => require('@react-native-async-storage/async-storage').default;
const missing = () => failure('unavailable', 'Instalá la nueva versión de Mascotas para habilitar el GPS.');
async function context(): Promise<Context | null> {
  const raw = await storage().getItem(KEY);
  if (!raw) return null;
  try { const data = JSON.parse(raw) as Context; return typeof data.uid === 'string' && typeof data.walkId === 'string' ? data : null; }
  catch { return null; }
}
async function stopNative(uid?: string) {
  if (!available()) return success(undefined);
  const active = await context(); if (uid && active?.uid !== uid) return success(undefined);
  await storage().removeItem(KEY);
  if (await location().hasStartedLocationUpdatesAsync(TASK)) await location().stopLocationUpdatesAsync(TASK);
  return success(undefined);
}
async function authReady() {
  const auth = getAuth(getApp());
  if (auth.currentUser) return auth.currentUser.uid;
  return new Promise<string | null>((resolve) => {
    let stop = () => {};
    const timeout = setTimeout(() => { stop(); resolve(null); }, 10000);
    stop = onAuthStateChanged(auth, (user) => { clearTimeout(timeout); stop(); resolve(user?.uid ?? null); });
  });
}
export function registerNativeLocationTask(createRepository: () => WalkLocationRepository) {
  if (!available()) return;
  const tasks: typeof import('expo-task-manager') = require('expo-task-manager');
  if (tasks.isTaskDefined(TASK)) return;
  let running: Promise<void> | null = null;
  let pending: { locations: LocationObject[]; error: unknown } | null = null;
  async function processBatch(locations: LocationObject[], error: unknown) {
      let active = await context(); if (!active) { await stopNative(); return; }
      if (await authReady() !== active.uid) { await stopNative(); return; }
      if (error) { await storage().setItem(KEY, JSON.stringify({ ...active, message: 'No pudimos obtener tu ubicación. Revisá el GPS y sus permisos.' })); return; }
      const repository = createRepository();
      for (const value of locations.slice(-30).sort((a, b) => a.timestamp - b.timestamp)) {
        const latest = await context();
        if (!latest || latest.uid !== active.uid || latest.walkId !== active.walkId || latest.captureStartedAt !== active.captureStartedAt) return;
        const point: WalkLocation = { latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy ?? Infinity,
          bearing: value.coords.heading !== null && value.coords.heading >= 0 ? value.coords.heading : null,
          speed: value.coords.speed !== null && value.coords.speed >= 0 ? value.coords.speed : null, recordedAt: Math.round(value.timestamp) };
        if (point.recordedAt < active.captureStartedAt || !shouldPublishLocation(active.previous, point)) continue;
        const result = await repository.publish(active.uid, active.walkId, point);
        const current = await context(); if (!current || current.uid !== active.uid || current.walkId !== active.walkId || current.captureStartedAt !== active.captureStartedAt) return;
        if (!result.ok && (result.error.code === 'forbidden' || result.error.code === 'not-found')) { await stopNative(); return; }
        active = { ...current, previous: result.ok ? point : current.previous, message: result.ok ? null : result.error.message };
        await storage().setItem(KEY, JSON.stringify(active));
      }
  }
  tasks.defineTask<{ locations: LocationObject[] }>(TASK, ({ data, error }) => {
    // Un solo envío en curso y un lote reciente: no acumular tareas sin límite al perder señal.
    pending = { locations: data?.locations ?? [], error };
    if (!running) running = (async () => {
      while (pending) { const batch = pending; pending = null; await processBatch(batch.locations, batch.error); }
    })().finally(() => { running = null; });
    return running;
  });
}
export function createNativeLocationCapture(): LocationCaptureRepository {
  async function prepare() {
    if (!available()) return missing();
    if (!await location().hasServicesEnabledAsync()) return failure('unavailable', 'Activá la ubicación del teléfono para iniciar el paseo.');
    const foreground = await location().requestForegroundPermissionsAsync();
    if (!foreground.granted) return failure('forbidden', 'Permití el acceso a tu ubicación para iniciar el paseo.');
    if (foreground.android?.accuracy === 'coarse') return failure('forbidden', 'Activá «Ubicación precisa» en los permisos de Mascotas para registrar el recorrido.');
    const background = await location().requestBackgroundPermissionsAsync();
    if (!background.granted) return failure('forbidden', 'Habilitá la ubicación «Permitir siempre» para compartir el recorrido mientras usás otras aplicaciones.');
    return success(undefined);
  }
  return {
    prepare,
    async start(uid, walkId) {
      const ready = await prepare(); if (!ready.ok) return ready;
      const previous = await context();
      if (previous?.uid === uid && previous.walkId === walkId && await location().hasStartedLocationUpdatesAsync(TASK)) return success(undefined);
      await stopNative(); await storage().setItem(KEY, JSON.stringify({ uid, walkId, captureStartedAt: Date.now(), previous: null, message: null } satisfies Context));
      try {
        await location().startLocationUpdatesAsync(TASK, { accuracy: location().Accuracy.High, timeInterval: 5000, distanceInterval: 0,
          pausesUpdatesAutomatically: false, foregroundService: { notificationTitle: 'Paseo en curso', notificationBody: 'Compartiendo la ubicación del paseador', killServiceOnDestroy: true } });
        return success(undefined);
      } catch { await stopNative(); return failure('unavailable', 'No pudimos activar el GPS del paseo. Volvé a intentar compartir tu ubicación.'); }
    },
    async stop(uid) { try { return await stopNative(uid); } catch { return failure('unexpected', 'No pudimos detener el GPS. Desactivá la ubicación desde los ajustes del teléfono.'); } },
    async status(uid) {
      if (!available()) return success({ walkId: null, sharing: false, message: 'Actualizá Mascotas para usar el seguimiento GPS.' });
      try { const active = await context(); return success({ walkId: active?.uid === uid ? active.walkId : null,
        sharing: active?.uid === uid && await location().hasStartedLocationUpdatesAsync(TASK), message: active?.uid === uid ? active.message : null }); }
      catch { return failure('unexpected', 'No pudimos consultar el estado del GPS.'); }
    },
  };
}
