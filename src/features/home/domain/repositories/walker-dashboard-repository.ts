import type { Result } from '../../../../shared/types/result';
import type { WalkerDashboard } from '../entities/walker-dashboard';

export interface WalkerDashboardRepository {
  getByWalker(uid: string): Promise<Result<WalkerDashboard>>;
  updateAvailability(uid: string, available: boolean): Promise<Result<void>>;
}
