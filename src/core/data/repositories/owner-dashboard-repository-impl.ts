import { failure, success } from '../../../shared/types/result';
import type { OwnerDashboard, OwnerPetSummary, OwnerWalkSummary } from '../../domain/entities/owner-dashboard';
import type { OwnerDashboardRepository } from '../../domain/repositories/owner-dashboard-repository';
import type { OwnerDashboardDataSource } from '../datasources/owner-dashboard-data-source';
import type { DashboardDocument } from '../datasources/dashboard-document';

import { record, text, nonnegative, timestamp } from '../mappers/dashboard-values';

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

/** Implementación del contrato de dueño: consulta y transforma los datos remotos. */
export class OwnerDashboardRepositoryImpl implements OwnerDashboardRepository {
  constructor(private readonly source: OwnerDashboardDataSource) {}
  async getByOwner(uid: string) {
    try {
      const [rawProfile, rawPets, rawWalks] = await Promise.all([
        this.source.getProfile(uid), this.source.getPets(uid), this.source.getWalks(uid),
      ]);
      const profile = record(rawProfile);
      if (profile.role !== 'OWNER' || (profile.active !== undefined && profile.active !== true)) {
        return failure('forbidden', 'Tu cuenta no tiene acceso al espacio de dueño.');
      }
      const dashboard: OwnerDashboard = {
        name: text(profile.name), lastName: text(profile.lastName), email: text(profile.email), phone: text(profile.phone),
        profileImage: /^https:\/\//i.test(text(profile.profileImage)) ? text(profile.profileImage) : null,
        pets: rawPets.map((document) => pet(document, uid)).sort((a, b) => a.name.localeCompare(b.name)),
        walks: rawWalks.map((document) => walk(document, uid)).sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity)),
      };
      return success(dashboard);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code.includes('permission-denied')) return failure('forbidden', 'No pudimos consultar tus mascotas y paseos. Revisá los permisos de tu cuenta.');
      if (['unavailable', 'firestore/unavailable', 'auth/network-request-failed', 'firestore/deadline-exceeded'].includes(code)) {
        return failure('unavailable', 'No pudimos conectarnos. Revisá tu conexión y volvé a intentar.');
      }
      return failure('unexpected', 'No pudimos cargar tu inicio. Intentá nuevamente.');
    }
  }
}
