import type { OwnerDashboard, OwnerPetSummary, OwnerWalkSummary } from '../../domain/entities/owner-dashboard';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { record, text, nonnegative, timestamp } from './dashboard-values';

function owned(document: DashboardDocument, uid: string) {
  const value = record(document.data);
  if (value.ownerId !== uid) throw new Error('Owner mismatch');
  return value;
}
function pet(document: DashboardDocument, uid: string): OwnerPetSummary {
  const value = owned(document, uid);
  const photo = text(value.photoUri);
  return {
    id: document.id, name: text(value.name) || 'Sin nombre', breed: text(value.breed),
    photoUri: /^https:\/\//i.test(photo) ? photo : null, age: nonnegative(value.age),
  };
}
function walk(document: DashboardDocument, uid: string): OwnerWalkSummary {
  const value = owned(document, uid);
  if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(String(value.status))) throw new Error('Invalid status');
  return {
    id: document.id, status: value.status as OwnerWalkSummary['status'], scheduledAt: timestamp(value.scheduledAt),
    petIds: Array.isArray(value.petIds) ? value.petIds.filter((id): id is string => typeof id === 'string') : [],
    durationMinutes: nonnegative(value.durationMinutes),
    startedAt: timestamp(value.startedAt), finishedAt: timestamp(value.finishedAt),
  };
}

export function toOwnerDashboard(
  uid: string,
  profile: Record<string, unknown>,
  rawPets: readonly DashboardDocument[],
  rawWalks: readonly DashboardDocument[],
): OwnerDashboard {
  return {
    name: text(profile.name), lastName: text(profile.lastName), email: text(profile.email), phone: text(profile.phone),
    profileImage: /^https:\/\//i.test(text(profile.profileImage)) ? text(profile.profileImage) : null,
    pets: rawPets.map((document) => pet(document, uid)).sort((a, b) => a.name.localeCompare(b.name)),
    walks: rawWalks.map((document) => walk(document, uid)).sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity)),
  };
}
