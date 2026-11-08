import type { WalkLocation } from '../../../../core/domain/entities/location';
import { locationDistance, validWalkLocation } from '../../../../core/domain/use-cases/walk-tracking-use-cases';

export function trackingMapData(current: WalkLocation | null, history: readonly WalkLocation[]) {
  const points = history.filter((point) => validWalkLocation(point) && point.accuracy <= 35).slice().sort((a, b) => a.recordedAt - b.recordedAt);
  const segments: number[][][] = [];
  let segment: number[][] = [], previous: WalkLocation | null = null;
  for (const point of points) {
    if (previous && point.recordedAt <= previous.recordedAt) continue;
    if (previous && (point.recordedAt - previous.recordedAt > 120000 || locationDistance(previous, point) / ((point.recordedAt - previous.recordedAt) / 1000) > 15)) {
      if (segment.length >= 2) segments.push(segment); segment = [];
    }
    segment.push([point.longitude, point.latitude]); previous = point;
  }
  if (segment.length >= 2) segments.push(segment);
  const latest = current && validWalkLocation(current) ? current : points.at(-1) ?? null;
  return { type: 'GPS_MAP_UPDATE', target: latest ? [latest.longitude, latest.latitude] : null, segments };
}
export type TrackingMapData = ReturnType<typeof trackingMapData>;
