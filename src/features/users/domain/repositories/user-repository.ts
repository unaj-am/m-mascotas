import type { Result } from '../../../../shared/types/result';
import type { UpdateUserProfile, User } from '../entities/user';

export interface UserRepository {
  getCurrentProfile(): Promise<Result<User>>;
  updateCurrentProfile(profile: UpdateUserProfile): Promise<Result<User>>;
}
