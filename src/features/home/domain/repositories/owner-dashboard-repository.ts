import type { Result } from '../../../../shared/types/result';
import type { OwnerDashboard } from '../entities/owner-dashboard';

export interface OwnerDashboardRepository {
  getByOwner(uid: string): Promise<Result<OwnerDashboard>>;
}
