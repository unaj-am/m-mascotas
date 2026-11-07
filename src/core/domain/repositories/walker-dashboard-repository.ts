import type { Result } from '../../../shared/types/result';
import type { WalkerDashboard } from '../entities/walker-dashboard';

/** Contrato para consultar el panel y actualizar la disponibilidad del paseador. */
export interface WalkerDashboardRepository {
  getByWalker(uid: string): Promise<Result<WalkerDashboard>>;
  updateAvailability(uid: string, available: boolean): Promise<Result<void>>;
}
