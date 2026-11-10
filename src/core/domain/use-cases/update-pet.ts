import { failure } from '../../../shared/types/result';
import type { PetDraft } from '../entities/pet';
import type { Session } from '../entities/session';
import type { PetRepository } from '../repositories/pet-repository';
import { validatePetDraft } from './save-pet';

export const createUpdatePet = (repository: PetRepository) => async (session: Session, draft: PetDraft) => {
  if (session.status !== 'authenticated' || session.role !== 'OWNER') {
    return failure('forbidden', 'Solo una cuenta de dueño puede editar mascotas.');
  }
  const validated = validatePetDraft(draft);
  if (!validated.ok) return validated;
  return repository.update(session.uid, validated.value);
};
