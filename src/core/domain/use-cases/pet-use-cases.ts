import { failure, success } from '../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';
import type { PetList } from '../entities/pet';
import type { Session } from '../entities/session';
import type { PetRepository } from '../repositories/pet-repository';
import { createSavePet } from './save-pet';
import { createUpdatePet } from './update-pet';

export function createPetUseCases(repository: PetRepository) {
  return {
    create: createSavePet(repository),
    update: createUpdatePet(repository),
    newId(session: Session) {
      if (session.status !== 'authenticated' || session.role !== 'OWNER') return failure('forbidden', 'Iniciá sesión como dueño para registrar mascotas.');
      try { return success(repository.newId()); }
      catch { return failure('unexpected', 'No pudimos preparar el registro de la mascota. Intentá nuevamente.'); }
    },
    observe(session: Session, observer: Observer<PetList>): Unsubscribe {
      if (session.status !== 'authenticated' || session.role !== 'OWNER') {
        observer(failure('forbidden', 'Iniciá sesión como dueño para ver tus mascotas.'));
        return () => {};
      }
      return repository.observeByOwner(session.uid, observer);
    },
  };
}
