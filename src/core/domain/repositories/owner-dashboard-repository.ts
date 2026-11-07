import type { Result } from '../../../shared/types/result';
import type { OwnerDashboard } from '../entities/owner-dashboard';

/** Contrato para consultar el panel de dueño, independiente de la fuente de datos. */
export interface OwnerDashboardRepository {
  getByOwner(uid: string): Promise<Result<OwnerDashboard>>;
}
