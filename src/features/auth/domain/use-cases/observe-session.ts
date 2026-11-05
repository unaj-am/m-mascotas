import type { Observer } from '../../../../shared/types/subscription';
import type { Session } from '../entities/session';
import type { AuthRepository } from '../repositories/auth-repository';

export const createObserveSession = (repository: AuthRepository) =>
  (observer: Observer<Session>) => repository.observeSession(observer);
