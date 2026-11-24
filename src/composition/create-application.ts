import { Container } from 'inversify';
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
import type { WalkLocationRepository } from '../core/domain/repositories/walk-location-repository';
import type { LocationCaptureRepository } from '../core/domain/repositories/location-capture-repository';
import { createWalkTrackingUseCases } from '../core/domain/use-cases/walk-tracking-use-cases';

const sources = {
  auth: Symbol('AuthDataSource'),
  owner: Symbol('OwnerDashboardDataSource'),
  walker: Symbol('WalkerDashboardDataSource'),
  pets: Symbol('PetDataSource'),
  booking: Symbol('WalkBookingDataSource'),
  locations: Symbol('WalkLocationRepository'),
  capture: Symbol('LocationCaptureRepository'),
};
const useCases = {
  observeSession: Symbol('ObserveSession'),
  auth: Symbol('AuthUseCases'),
  owner: Symbol('GetOwnerDashboard'),
  walker: Symbol('WalkerDashboardUseCases'),
  pets: Symbol('PetUseCases'),
  booking: Symbol('WalkBookingUseCases'),
  execution: Symbol('WalkExecutionUseCases'),
  tracking: Symbol('WalkTrackingUseCases'),
};

export function createApplication(authSource: AuthDataSource, ownerSource?: OwnerDashboardDataSource, walkerSource?: WalkerDashboardDataSource, petSource?: PetDataSource, bookingSource?: WalkBookingDataSource, locations?: WalkLocationRepository, capture?: LocationCaptureRepository) {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind<AuthDataSource>(sources.auth).toConstantValue(authSource);
  container.bind(AuthRepositoryImpl).toResolvedValue((source: AuthDataSource) => new AuthRepositoryImpl(source), [sources.auth]);
  container.bind(useCases.observeSession).toResolvedValue(createObserveSession, [AuthRepositoryImpl]);
  container.bind(useCases.auth).toResolvedValue(createAuthUseCases, [AuthRepositoryImpl]);

  if (ownerSource) {
    container.bind<OwnerDashboardDataSource>(sources.owner).toConstantValue(ownerSource);
    container.bind(OwnerDashboardRepositoryImpl).toResolvedValue((source: OwnerDashboardDataSource) => new OwnerDashboardRepositoryImpl(source), [sources.owner]);
    container.bind(useCases.owner).toResolvedValue(createGetOwnerDashboard, [OwnerDashboardRepositoryImpl]);
  }
  if (walkerSource) {
    container.bind<WalkerDashboardDataSource>(sources.walker).toConstantValue(walkerSource);
    container.bind(WalkerDashboardRepositoryImpl).toResolvedValue((source: WalkerDashboardDataSource) => new WalkerDashboardRepositoryImpl(source), [sources.walker]);
    container.bind(useCases.walker).toResolvedValue(createWalkerDashboardUseCases, [WalkerDashboardRepositoryImpl]);
  }
  if (petSource) {
    container.bind<PetDataSource>(sources.pets).toConstantValue(petSource);
    container.bind(PetRepositoryImpl).toResolvedValue((source: PetDataSource) => new PetRepositoryImpl(source), [sources.pets]);
    container.bind(useCases.pets).toResolvedValue(createPetUseCases, [PetRepositoryImpl]);
  }
  if (bookingSource) {
    container.bind<WalkBookingDataSource>(sources.booking).toConstantValue(bookingSource);
    container.bind(WalkBookingRepositoryImpl).toResolvedValue((source: WalkBookingDataSource) => new WalkBookingRepositoryImpl(source), [sources.booking]);
    container.bind(useCases.booking).toResolvedValue((repo: WalkBookingRepositoryImpl) => createWalkBookingUseCases(repo), [WalkBookingRepositoryImpl]);
    container.bind(useCases.execution).toResolvedValue(createWalkExecutionUseCases, [WalkBookingRepositoryImpl]);
  }
  if (locations && capture) {
    container.bind<WalkLocationRepository>(sources.locations).toConstantValue(locations);
    container.bind<LocationCaptureRepository>(sources.capture).toConstantValue(capture);
    container.bind(useCases.tracking).toResolvedValue(createWalkTrackingUseCases, [sources.locations, sources.capture]);
  }

  return {
    observeSession: container.get<ReturnType<typeof createObserveSession>>(useCases.observeSession),
    auth: container.get<ReturnType<typeof createAuthUseCases>>(useCases.auth),
    getOwnerDashboard: container.get<ReturnType<typeof createGetOwnerDashboard>>(useCases.owner, { optional: true }) ?? null,
    walkerDashboard: container.get<ReturnType<typeof createWalkerDashboardUseCases>>(useCases.walker, { optional: true }) ?? null,
    pets: container.get<ReturnType<typeof createPetUseCases>>(useCases.pets, { optional: true }) ?? null,
    booking: container.get<ReturnType<typeof createWalkBookingUseCases>>(useCases.booking, { optional: true }) ?? null,
    walkExecution: container.get<ReturnType<typeof createWalkExecutionUseCases>>(useCases.execution, { optional: true }) ?? null,
    tracking: container.get<ReturnType<typeof createWalkTrackingUseCases>>(useCases.tracking, { optional: true }) ?? null,
  };
}
export type Application = ReturnType<typeof createApplication>;
