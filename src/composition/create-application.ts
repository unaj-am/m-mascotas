import { DataAuthRepository } from '../features/auth/data/repositories/auth-repository';
import type { AuthDataSource } from '../features/auth/data/datasources/auth-data-source';
import { createObserveSession } from '../features/auth/domain/use-cases/observe-session';
import { createAuthUseCases } from '../features/auth/domain/use-cases/auth-use-cases';
import type { OwnerDashboardDataSource } from '../features/home/data/datasources/owner-dashboard-data-source';
import { FirebaseOwnerDashboardRepository } from '../features/home/data/repositories/firebase-owner-dashboard-repository';
import { createGetOwnerDashboard } from '../features/home/domain/use-cases/get-owner-dashboard';
import type { WalkerDashboardDataSource } from '../features/home/data/datasources/walker-dashboard-data-source';
import { FirebaseWalkerDashboardRepository } from '../features/home/data/repositories/firebase-walker-dashboard-repository';
import { createWalkerDashboardUseCases } from '../features/home/domain/use-cases/walker-dashboard-use-cases';
export function createApplication(authSource: AuthDataSource, ownerSource?: OwnerDashboardDataSource, walkerSource?: WalkerDashboardDataSource) {
  const auth = new DataAuthRepository(authSource);
  return {
    observeSession: createObserveSession(auth), auth: createAuthUseCases(auth),
    getOwnerDashboard: ownerSource ? createGetOwnerDashboard(new FirebaseOwnerDashboardRepository(ownerSource)) : null,
    walkerDashboard: walkerSource ? createWalkerDashboardUseCases(new FirebaseWalkerDashboardRepository(walkerSource)) : null,
  };
}
export type Application = ReturnType<typeof createApplication>;
