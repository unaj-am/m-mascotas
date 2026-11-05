import type { Result } from '../../../../shared/types/result';
import type { Page } from '../../../../shared/types/page';
import type { Walk } from '../entities/walk';
export interface WalkRepository {
  getById(walkId: string): Promise<Result<Walk | null>>;
  getByOwner(ownerId: string, cursor?: string | null): Promise<Result<Page<Walk>>>;
  getByWalker(walkerId: string, cursor?: string | null): Promise<Result<Page<Walk>>>;
  start(walkId: string): Promise<Result<Walk>>;
  cancel(walkId: string): Promise<Result<Walk>>;
  complete(walkId: string): Promise<Result<Walk>>;
}
