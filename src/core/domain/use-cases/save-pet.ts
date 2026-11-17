import { failure, success, type Result } from '../../../shared/types/result';
import type { Pet, PetDraft } from '../entities/pet';
import type { Session } from '../entities/session';
import type { PetRepository } from '../repositories/pet-repository';

export function validatePetDraft(draft: PetDraft): Result<PetDraft> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(draft.id) || !draft.name.trim() || draft.name.trim().length > 80) {
    return failure('validation', 'Ingresá el nombre de la mascota, con un máximo de 80 caracteres.');
  }
  if (!Number.isInteger(draft.age) || draft.age < 0) {
    return failure('validation', 'Ingresá una edad válida en años completos, mayor o igual a cero.');
  }
  if (!Number.isFinite(draft.weight) || draft.weight <= 0) {
    return failure('validation', 'El peso debe ser mayor que cero.');
  }
  if (draft.breed.trim().length > 80 || draft.behavior.trim().length > 200 || draft.specialNeeds.trim().length > 1000 || draft.observations.trim().length > 1000) {
    return failure('validation', 'La raza, el comportamiento o las observaciones superan el largo permitido.');
  }
  if (!['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'UNKNOWN'].includes(draft.size)) {
    return failure('validation', 'Elegí un tamaño válido para la mascota.');
  }
  return success({
    id: draft.id, name: draft.name.trim(), breed: draft.breed.trim(),
    age: draft.age, weight: draft.weight, size: draft.size, behavior: draft.behavior.trim(),
    observations: draft.observations.trim(), specialNeeds: draft.specialNeeds.trim(),
  });
}

export const createSavePet = (repository: PetRepository) => async (session: Session, draft: PetDraft) => {
  if (session.status !== 'authenticated' || session.role !== 'OWNER') {
    return failure('forbidden', 'Solo una cuenta de dueño puede registrar mascotas.');
  }
  const validated = validatePetDraft(draft);
  if (!validated.ok) return validated;
  const pet: Pet = { ...validated.value, ownerId: session.uid, photoUri: null };
  return repository.create(pet);
};
