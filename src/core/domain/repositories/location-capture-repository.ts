import type { Result } from '../../../shared/types/result';
import type { LocationCaptureStatus } from '../entities/walk-tracking';

export interface LocationCaptureRepository {
  prepare(): Promise<Result<void>>;
  start(uid: string, walkId: string): Promise<Result<void>>;
  stop(uid?: string): Promise<Result<void>>;
  status(uid: string): Promise<Result<LocationCaptureStatus>>;
}
