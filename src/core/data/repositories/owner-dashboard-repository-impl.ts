import { failure, success } from '../../../shared/types/result';
import type { OwnerDashboardRepository } from '../../domain/repositories/owner-dashboard-repository';
import type { OwnerDashboardDataSource } from '../datasources/owner-dashboard-data-source';
import { record } from '../mappers/dashboard-values';
import { toOwnerDashboard } from '../mappers/owner-dashboard-mapper';

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
      return success(toOwnerDashboard(uid, profile, rawPets, rawWalks));
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
