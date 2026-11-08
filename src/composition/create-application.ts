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
import type { PetDataSource } from '../core/data/datasources/pet-data-source';
import { PetRepositoryImpl } from '../core/data/repositories/pet-repository-impl';
import { createPetUseCases } from '../core/domain/use-cases/pet-use-cases';
import type { WalkBookingDataSource } from '../core/data/datasources/walk-booking-data-source';
import { WalkBookingRepositoryImpl } from '../core/data/repositories/walk-booking-repository-impl';
import { createWalkBookingUseCases } from '../core/domain/use-cases/walk-booking-use-cases';
import { createWalkExecutionUseCases } from '../core/domain/use-cases/walk-execution-use-cases';
export function createApplication(authSource: AuthDataSource, ownerSource?: OwnerDashboardDataSource, walkerSource?: WalkerDashboardDataSource, petSource?: PetDataSource, bookingSource?: WalkBookingDataSource) {
  const auth = new AuthRepositoryImpl(authSource);
  const booking = bookingSource ? new WalkBookingRepositoryImpl(bookingSource) : null;
  return {
    observeSession: createObserveSession(auth), auth: createAuthUseCases(auth),
    getOwnerDashboard: ownerSource ? createGetOwnerDashboard(new OwnerDashboardRepositoryImpl(ownerSource)) : null,
    walkerDashboard: walkerSource ? createWalkerDashboardUseCases(new WalkerDashboardRepositoryImpl(walkerSource)) : null,
    pets: petSource ? createPetUseCases(new PetRepositoryImpl(petSource)) : null,
    booking: booking ? createWalkBookingUseCases(booking) : null,
    walkExecution: booking ? createWalkExecutionUseCases(booking) : null,
  };
}
export type Application = ReturnType<typeof createApplication>;
