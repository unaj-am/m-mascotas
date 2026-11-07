import { AuthRepositoryImpl } from '../core/data/repositories/auth-repository-impl';
import type { AuthDataSource } from '../core/data/datasources/auth-data-source';
import { createObserveSession } from '../core/domain/use-cases/observe-session';
import { createAuthUseCases } from '../core/domain/use-cases/auth-use-cases';
import type { OwnerDashboardDataSource } from '../core/data/datasources/owner-dashboard-data-source';
import { OwnerDashboardRepositoryImpl } from '../core/data/repositories/owner-dashboard-repository-impl';
import { createGetOwnerDashboard } from '../core/domain/use-cases/get-owner-dashboard';
import type { WalkerDashboardDataSource } from '../core/data/datasources/walker-dashboard-data-source';
import { WalkerDashboardRepositoryImpl } from '../core/data/repositories/walker-dashboard-repository-impl';
import { createWalkerDashboardUseCases } from '../core/domain/use-cases/walker-dashboard-use-cases';
export function createApplication(authSource: AuthDataSource, ownerSource?: OwnerDashboardDataSource, walkerSource?: WalkerDashboardDataSource) {
  const auth = new AuthRepositoryImpl(authSource);
  return {
    observeSession: createObserveSession(auth), auth: createAuthUseCases(auth),
    getOwnerDashboard: ownerSource ? createGetOwnerDashboard(new OwnerDashboardRepositoryImpl(ownerSource)) : null,
    walkerDashboard: walkerSource ? createWalkerDashboardUseCases(new WalkerDashboardRepositoryImpl(walkerSource)) : null,
  };
}
export type Application = ReturnType<typeof createApplication>;
