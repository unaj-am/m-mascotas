import type { Unsubscribe } from '../../../shared/types/subscription';
import type { Pet, PetDraft } from '../../domain/entities/pet';
import type { DashboardDocument } from './dashboard-document';

export type PetSnapshot = Readonly<{
  documents: readonly DashboardDocument[]; fromCache: boolean; pendingWrites: boolean;
}>;
export interface PetDataSource {
  newId(): string;
  create(pet: Pet): Promise<void>;
  update(ownerId: string, draft: PetDraft): Promise<void>;
  observeByOwner(uid: string, listener: (snapshot: PetSnapshot) => void, onError: (error: unknown) => void): Unsubscribe;
}
