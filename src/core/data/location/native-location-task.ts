import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import type { LocationObject } from 'expo-location';
import type { WalkLocation } from '../../domain/entities/location';
import type { WalkLocationRepository } from '../../domain/repositories/walk-location-repository';
import { shouldPublishLocation } from '../../domain/use-cases/walk-tracking-use-cases';
import { LOCATION_TASK, hasNativeLocation, readCaptureSession, saveCaptureSession, stopNativeCapture } from './native-location-session';

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
  if (!hasNativeLocation()) return;
  const tasks: typeof import('expo-task-manager') = require('expo-task-manager');
  if (tasks.isTaskDefined(LOCATION_TASK)) return;
  let running: Promise<void> | null = null;
  let pending: { locations: LocationObject[]; error: unknown } | null = null;
  async function processBatch(locations: LocationObject[], error: unknown) {
    let active = await readCaptureSession(); if (!active) { await stopNativeCapture(); return; }
    if (await authReady() !== active.uid) { await stopNativeCapture(); return; }
    if (error) { await saveCaptureSession({ ...active, message: 'No pudimos obtener tu ubicación. Revisá el GPS y sus permisos.' }); return; }
    const repository = createRepository();
    for (const value of locations.slice(-30).sort((a, b) => a.timestamp - b.timestamp)) {
      const latest = await readCaptureSession();
      if (!latest || latest.uid !== active.uid || latest.walkId !== active.walkId || latest.captureStartedAt !== active.captureStartedAt) return;
      const point: WalkLocation = { latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy ?? Infinity,
        bearing: value.coords.heading !== null && value.coords.heading >= 0 ? value.coords.heading : null,
        speed: value.coords.speed !== null && value.coords.speed >= 0 ? value.coords.speed : null, recordedAt: Math.round(value.timestamp) };
      if (point.recordedAt < active.captureStartedAt || !shouldPublishLocation(active.previous, point)) continue;
      const result = await repository.publish(active.uid, active.walkId, point);
      const current = await readCaptureSession(); if (!current || current.uid !== active.uid || current.walkId !== active.walkId || current.captureStartedAt !== active.captureStartedAt) return;
      if (!result.ok && (result.error.code === 'forbidden' || result.error.code === 'not-found')) { await stopNativeCapture(); return; }
      active = { ...current, previous: result.ok ? point : current.previous, message: result.ok ? null : result.error.message };
      await saveCaptureSession(active);
    }
  }
  tasks.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, ({ data, error }) => {
    // Un solo envío en curso y un lote reciente: no acumular tareas sin límite al perder señal.
    pending = { locations: data?.locations ?? [], error };
    if (!running) running = (async () => {
      while (pending) { const batch = pending; pending = null; await processBatch(batch.locations, batch.error); }
    })().finally(() => { running = null; });
    return running;
  });
}
