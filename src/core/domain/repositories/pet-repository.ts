import type { Result } from '../../../shared/types/result';
import type { Pet } from '../entities/pet';

export interface PetRepository {
  getById(petId: string): Promise<Result<Pet | null>>;
  getByOwner(ownerId: string): Promise<Result<readonly Pet[]>>;
  save(pet: Pet): Promise<Result<void>>;
  delete(petId: string): Promise<Result<void>>;
}
