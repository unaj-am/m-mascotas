import type { PetDraft } from '../../domain/entities/pet';
import { toPetUpdateDocument } from '../mappers/pet-mapper';

export interface PetUpdateTransaction {
  get(collection: 'users' | 'pets', id: string): Promise<Record<string, unknown> | null>;
  updatePet(id: string, data: ReturnType<typeof toPetUpdateDocument>): void;
}

export async function updatePetTransaction(transaction: PetUpdateTransaction, ownerId: string, draft: PetDraft): Promise<void> {
  const profile = await transaction.get('users', ownerId);
  if (!ownerId || profile?.role !== 'OWNER' || (profile.active !== undefined && profile.active !== true)) {
    throw { code: 'permission-denied' };
  }
  const existing = await transaction.get('pets', draft.id);
  if (!existing) throw { code: 'not-found' };
  if (existing.ownerId !== ownerId) throw { code: 'permission-denied' };
  transaction.updatePet(draft.id, toPetUpdateDocument(draft));
}
