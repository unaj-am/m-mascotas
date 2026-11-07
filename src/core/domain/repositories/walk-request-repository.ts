import type { Result } from '../../../shared/types/result';
import type { Page } from '../../../shared/types/page';
import type { Walk } from '../entities/walk';
import type { CreateWalkRequest, WalkRequest } from '../entities/walk-request';
export interface WalkRequestRepository {
  getById(requestId: string): Promise<Result<WalkRequest | null>>;
  getByOwner(ownerId: string, cursor?: string | null): Promise<Result<Page<WalkRequest>>>;
  getByWalker(walkerId: string, cursor?: string | null): Promise<Result<Page<WalkRequest>>>;
  create(request: CreateWalkRequest): Promise<Result<void>>;
  accept(requestId: string): Promise<Result<Walk>>;
  reject(requestId: string): Promise<Result<void>>;
  cancel(requestId: string): Promise<Result<void>>;
  deletePending(requestId: string): Promise<Result<void>>;
}
