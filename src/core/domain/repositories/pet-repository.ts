import type { Result } from '../../../shared/types/result';
import type { Pet, PetList } from '../entities/pet';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';

/** Contrato para el alta y la observación del listado de mascotas. */
export interface PetRepository {
  newId(): string;
  create(pet: Pet): Promise<Result<void>>;
  observeByOwner(ownerId: string, observer: Observer<PetList>): Unsubscribe;
}
