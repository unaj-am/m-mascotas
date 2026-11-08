import type { WalkStatus } from '../../../../core/domain/entities/walk';

export type WalkTimingData = { status: WalkStatus; startedAt?: number | null; finishedAt?: number | null };
export function elapsedWalkSeconds(walk: WalkTimingData, now: number): number | null {
  if (!walk.startedAt || !Number.isFinite(walk.startedAt)) return null;
  const end = walk.status === 'IN_PROGRESS' ? now : walk.status === 'COMPLETED' ? walk.finishedAt : null;
  if (end == null || !Number.isFinite(end)) return null;
  return Math.max(0, Math.floor((end - walk.startedAt) / 1000));
}
export function formatWalkElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), remaining = seconds % 60;
  return [hours ? String(hours).padStart(2, '0') : null, String(minutes).padStart(2, '0'), String(remaining).padStart(2, '0')].filter((value) => value !== null).join(':');
}
