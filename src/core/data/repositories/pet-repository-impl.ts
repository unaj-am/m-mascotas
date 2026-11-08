import { failure, success, type Result } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { Pet, PetList } from '../../domain/entities/pet';
import type { PetRepository } from '../../domain/repositories/pet-repository';
import type { PetDataSource } from '../datasources/pet-data-source';
import { toPet } from '../mappers/pet-mapper';

function petFailure(error: unknown): Result<never> {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return failure('forbidden', 'Firebase no permite consultar o registrar tus mascotas. Revisá los permisos de tu cuenta.');
  if (code.includes('unavailable') || code.includes('network') || code.includes('deadline-exceeded')) return failure('unavailable', 'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.');
  return failure('unexpected', 'No pudimos completar la operación con tus mascotas. Intentá nuevamente.');
}
/** Implementación del alta y el listado observable de mascotas. */
export class PetRepositoryImpl implements PetRepository {
  constructor(private readonly source: PetDataSource) {}
  newId() { return this.source.newId(); }
  async create(pet: Pet): Promise<Result<void>> {
    try { await this.source.create(pet); return success(undefined); }
    catch (error) { return petFailure(error); }
  }
  observeByOwner(ownerId: string, observer: Observer<PetList>) {
    let active = true;
    let confirmed = false;
    try {
      const stop = this.source.observeByOwner(ownerId, (snapshot) => {
        if (!active) return;
        // Una caché vacía inicial no confirma que el servidor no tenga mascotas.
        if (snapshot.fromCache && !confirmed && !snapshot.documents.length && !snapshot.pendingWrites) return;
        if (!snapshot.fromCache) confirmed = true;
        let result: Result<PetList>;
        try {
          const items = snapshot.documents.map((document) => toPet(document, ownerId))
            .sort((left, right) => left.name.localeCompare(right.name, 'es') || left.id.localeCompare(right.id));
          result = success({ items, fromCache: snapshot.fromCache, pendingWrites: snapshot.pendingWrites });
        } catch (error) { result = petFailure(error); }
        observer(result);
      }, (error) => { if (active) observer(petFailure(error)); });
      return () => { active = false; stop(); };
    } catch (error) {
      observer(petFailure(error));
      return () => { active = false; };
    }
  }
}
