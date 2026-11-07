import type { Result } from '../../../shared/types/result';
import type { Walker } from '../entities/walker';

export interface WalkerRepository {
  getById(uid: string): Promise<Result<Walker | null>>;
  getAll(): Promise<Result<readonly Walker[]>>;
  updateCurrentProfile(profile: Omit<Walker, 'userId' | 'rating'>): Promise<Result<void>>;
  updateAvailability(available: boolean): Promise<Result<void>>;
}
