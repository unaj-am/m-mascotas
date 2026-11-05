import { DataAuthRepository } from '../features/auth/data/repositories/auth-repository';
import type { AuthDataSource } from '../features/auth/data/datasources/auth-data-source';
import { createObserveSession } from '../features/auth/domain/use-cases/observe-session';
import { createAuthUseCases } from '../features/auth/domain/use-cases/auth-use-cases';
export function createApplication(authSource: AuthDataSource) {
  const auth = new DataAuthRepository(authSource);
  return { observeSession: createObserveSession(auth), auth: createAuthUseCases(auth) };
}
export type Application = ReturnType<typeof createApplication>;
