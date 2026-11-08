import type { WalkLocation } from '../../domain/entities/location';
import type { Unsubscribe } from '../../../shared/types/subscription';

export type LocationSnapshot<T> = Readonly<{ data: T; fromCache: boolean; pendingWrites: boolean }>;
export interface WalkLocationDataSource {
  getWalk(uid: string, id: string): Promise<unknown | null>;
  observeWalk(uid: string, id: string, next: (value: LocationSnapshot<unknown | null>) => void, error: (value: unknown) => void): Unsubscribe;
  observeCurrent(uid: string, id: string, next: (value: LocationSnapshot<unknown | null>) => void, error: (value: unknown) => void): Unsubscribe;
  observeHistory(uid: string, id: string, next: (value: LocationSnapshot<readonly unknown[]>) => void, error: (value: unknown) => void): Unsubscribe;
  publish(uid: string, id: string, location: WalkLocation): Promise<void>;
}
