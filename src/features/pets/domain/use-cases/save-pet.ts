import { failure } from '../../../../shared/types/result';
import type { Pet } from '../entities/pet';
import type { PetRepository } from '../repositories/pet-repository';

// Conserva las validaciones verificadas en SavePetUseCase de Kotlin.
export const createSavePet = (repository: PetRepository) => async (pet: Pet) => {
  if (!pet.id.trim() || !pet.ownerId.trim() || !pet.name.trim()) {
    return failure('validation', 'La mascota debe tener identificador, dueño y nombre.');
  }
  if (!Number.isFinite(pet.age) || pet.age < 0) {
    return failure('validation', 'La edad no puede ser negativa.');
  }
  if (!Number.isFinite(pet.weight) || pet.weight <= 0) {
    return failure('validation', 'El peso debe ser mayor que cero.');
  }
  return repository.save(pet);
};
