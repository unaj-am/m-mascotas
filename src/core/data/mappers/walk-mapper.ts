import type { Walk } from '../../domain/entities/walk';
import type { RequestSide } from '../../domain/entities/walk-request';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { record, text, strings, timestamp, nonnegative } from './dashboard-values';

export function toWalk(document: DashboardDocument, uid: string, side: RequestSide): Walk {
  const data = record(document.data);
  if (data[side === 'owner' ? 'ownerId' : 'walkerId'] !== uid) throw { code: 'permission-denied' };
  if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(String(data.status))) throw new Error('Invalid walk status');
  const distance = nonnegative(data.distanceKm);
  return { id: document.id, ownerId: text(data.ownerId), walkerId: text(data.walkerId), petIds: strings(data.petIds),
    scheduledAt: timestamp(data.scheduledAt) ?? 0, durationMinutes: nonnegative(data.durationMinutes) ?? 0,
    status: data.status as Walk['status'], startedAt: timestamp(data.startedAt), finishedAt: timestamp(data.finishedAt),
    distanceKm: distance !== null && distance > 0 ? distance : null, observations: text(data.observations) };
}
export const walkTime = (value: number | null) => value === null ? '' : new Date(value).toISOString();
export function toWalkDocument(walk: Walk) {
  return { ownerId: walk.ownerId, walkerId: walk.walkerId, petIds: [...walk.petIds], scheduledAt: walkTime(walk.scheduledAt),
    durationMinutes: walk.durationMinutes, status: walk.status, startedAt: walkTime(walk.startedAt), finishedAt: walkTime(walk.finishedAt),
    distanceKm: walk.distanceKm ?? 0, observations: walk.observations };
}
