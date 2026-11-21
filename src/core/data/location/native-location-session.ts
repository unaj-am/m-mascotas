import { requireOptionalNativeModule } from 'expo';
import { success } from '../../../shared/types/result';
import type { WalkLocation } from '../../domain/entities/location';

export const LOCATION_TASK = 'mascotas-walk-gps-v1';
const KEY = '@mascotas/active-walk-gps';
type CaptureSession = { uid: string; walkId: string; captureStartedAt: number; previous: WalkLocation | null; message: string | null };
export const hasNativeLocation = () => !!requireOptionalNativeModule('ExpoLocation') && !!requireOptionalNativeModule('ExpoTaskManager');
export const locationModule = (): typeof import('expo-location') => require('expo-location');
const storage = (): typeof import('@react-native-async-storage/async-storage').default => require('@react-native-async-storage/async-storage').default;
export async function readCaptureSession(): Promise<CaptureSession | null> {
  const raw = await storage().getItem(KEY);
  if (!raw) return null;
  try { const data = JSON.parse(raw) as CaptureSession; return typeof data.uid === 'string' && typeof data.walkId === 'string' ? data : null; }
  catch { return null; }
}
export async function stopNativeCapture(uid?: string) {
  if (!hasNativeLocation()) return success(undefined);
  const active = await readCaptureSession(); if (uid && active?.uid !== uid) return success(undefined);
  await storage().removeItem(KEY);
  if (await locationModule().hasStartedLocationUpdatesAsync(LOCATION_TASK)) await locationModule().stopLocationUpdatesAsync(LOCATION_TASK);
  return success(undefined);
}

export function saveCaptureSession(active: CaptureSession) {
  return storage().setItem(KEY, JSON.stringify(active));
}
