import type { WalkLocation } from '../../domain/entities/location';
import { validWalkLocation } from '../../domain/use-cases/walk-tracking-use-cases';
import { record } from './dashboard-values';

export function toWalkLocation(value: unknown): WalkLocation {
  const data = record(value);
  const point = { latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, bearing: data.bearing ?? null,
    speed: data.speed ?? null, recordedAt: data.recordedAt } as WalkLocation;
  if (!validWalkLocation(point)) throw new Error('Invalid GPS sample');
  return point;
}
export function toLocationDocument(point: WalkLocation) {
  if (!validWalkLocation(point)) throw new Error('Invalid GPS sample');
  return { latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy, bearing: point.bearing, speed: point.speed, recordedAt: point.recordedAt };
}
