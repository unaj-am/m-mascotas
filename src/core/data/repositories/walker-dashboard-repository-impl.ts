import { failure, success, type Result } from '../../../shared/types/result';
import type { WalkerDashboardRepository } from '../../domain/repositories/walker-dashboard-repository';
import type { WalkerDashboard } from '../../domain/entities/walker-dashboard';
import type { WalkerDashboardDataSource } from '../datasources/walker-dashboard-data-source';
import { record } from '../mappers/dashboard-values';
import { toWalkerDashboard } from '../mappers/walker-dashboard-mapper';

function authorizedProfile(value: unknown) {
  const profile = record(value);
  if (profile.role !== 'WALKER' || (profile.active !== undefined && profile.active !== true)) throw { code: 'permission-denied' };
  return profile;
}
function dataFailure(error: unknown): Result<never> {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return failure('forbidden', 'No pudimos consultar o actualizar tus datos de paseador. Revisá los permisos de tu cuenta.');
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return failure('unavailable', 'No pudimos conectarnos. Revisá tu conexión y volvé a intentar.');
  if (code.includes('not-found')) return failure('not-found', 'Completá tu perfil de paseador antes de cambiar la disponibilidad.');
  return failure('unexpected', 'No pudimos completar la operación. Intentá nuevamente.');
}
/** Implementación del contrato de paseador sobre las fuentes de datos de Firebase. */
export class WalkerDashboardRepositoryImpl implements WalkerDashboardRepository {
  constructor(private readonly source: WalkerDashboardDataSource) {}
  async getByWalker(uid: string): Promise<Result<WalkerDashboard>> {
    try {
      const [rawProfile, rawWalker, rawRequests, rawWalks] = await Promise.all([
        this.source.getProfile(uid), this.source.getWalker(uid), this.source.getRequests(uid), this.source.getWalks(uid),
      ]);
      const profile = authorizedProfile(rawProfile);
      return success(toWalkerDashboard(uid, profile, rawWalker, rawRequests, rawWalks));
    } catch (error) { return dataFailure(error); }
  }
  async updateAvailability(uid: string, available: boolean): Promise<Result<void>> {
    try {
      authorizedProfile(await this.source.getProfile(uid));
      if (await this.source.getWalker(uid) === null) return failure('not-found', 'Completá tu perfil de paseador antes de cambiar la disponibilidad.');
      await this.source.updateAvailability(uid, available);
      return success(undefined);
    } catch (error) { return dataFailure(error); }
  }
}
