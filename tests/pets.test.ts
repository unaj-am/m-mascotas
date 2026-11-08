import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { Pet, PetDraft, PetList } from '../src/core/domain/entities/pet';
import type { Session } from '../src/core/domain/entities/session';
import { createPetUseCases } from '../src/core/domain/use-cases/pet-use-cases';
import type { PetDataSource, PetSnapshot } from '../src/core/data/datasources/pet-data-source';
import { PetRepositoryImpl } from '../src/core/data/repositories/pet-repository-impl';
import { toPet, toPetDocument } from '../src/core/data/mappers/pet-mapper';
import type { Result } from '../src/shared/types/result';

const owner: Session = { status: 'authenticated', uid: 'owner-1', role: 'OWNER' };
const draft: PetDraft = { id: 'pet-1', name: ' Luna ', breed: ' Mestiza ', age: 0, weight: 12.5, size: 'MEDIUM', behavior: ' Sociable ', specialNeeds: ' Ninguna ', observations: ' Usa arnés ' };
const pet: Pet = { ...draft, ownerId: 'owner-1', name: 'Luna', breed: 'Mestiza', behavior: 'Sociable', specialNeeds: 'Ninguna', observations: 'Usa arnés', photoUri: null };

function fixture() {
  let next: (snapshot: PetSnapshot) => void = () => {};
  let error: (value: unknown) => void = () => {};
  let saved: Pet | undefined;
  let stopped = false;
  let idCalls = 0;
  let observeCalls = 0;
  const events: Result<PetList>[] = [];
  const source: PetDataSource = {
    newId() { idCalls++; return 'generated-id'; },
    async create(value) { saved = value; },
    observeByOwner(uid, listener, onError) {
      assert.equal(uid, 'owner-1');
      observeCalls++;
      next = listener; error = onError;
      return () => { stopped = true; };
    },
  };
  const repository = new PetRepositoryImpl(source);
  return { source, repository, actions: createPetUseCases(repository), events,
    next: (documents: PetSnapshot['documents'], fromCache = false, pendingWrites = false) => next({ documents, fromCache, pendingWrites }),
    fail: (value: unknown) => error(value),
    get saved() { return saved; }, get stopped() { return stopped; },
    get idCalls() { return idCalls; }, get observeCalls() { return observeCalls; } };
}

it('el alta toma el dueño de la sesión y guarda únicamente los campos del formulario', async () => {
  const f = fixture();
  const injected = { ...draft, ownerId: 'other-owner', photoUri: 'https://example.com/injected.jpg', admin: true };
  assert.equal((await f.actions.create(owner, injected)).ok, true);
  assert.deepEqual(f.saved, pet);
  assert.deepEqual(f.actions.newId(owner), { ok: true, value: 'generated-id' });
});

it('valida nombre, edad, peso y campos opcionales antes de escribir en Firebase', async () => {
  for (const invalid of [
    { name: ' ' }, { name: 'x'.repeat(81) }, { age: NaN }, { age: -1 }, { age: 1.5 },
    { weight: 0 }, { weight: -1 }, { weight: Infinity }, { weight: NaN },
    { id: '../invalid' }, { size: 'invalid' as PetDraft['size'] }, { breed: 'x'.repeat(81) },
    { behavior: 'x'.repeat(201) }, { observations: 'x'.repeat(1001) }, { specialNeeds: 'x'.repeat(1001) },
  ]) {
    const f = fixture();
    const result = await f.actions.create(owner, { ...draft, ...invalid });
    assert.equal(result.ok, false, JSON.stringify(invalid));
    if (!result.ok) assert.equal(result.error.code, 'validation');
    assert.equal(f.saved, undefined);
  }
});

it('un paseador o una sesión sin autenticar no puede crear ni observar mascotas', async () => {
  for (const session of [{ status: 'signed-out' }, { status: 'authenticated', uid: 'walker-1', role: 'WALKER' }] as const) {
    const f = fixture();
    assert.equal((await f.actions.create(session, draft)).ok, false);
    assert.equal(f.actions.newId(session).ok, false);
    f.actions.observe(session, (result) => f.events.push(result))();
    assert.equal(f.events.at(-1)?.ok, false);
    assert.equal(f.saved, undefined);
    assert.equal(f.idCalls, 0);
    assert.equal(f.observeCalls, 0);
  }
});

it('conserva el esquema de la app nativa y admite tamaños antiguos y nuevos', () => {
  const document = toPetDocument(pet);
  assert.deepEqual(document, { ownerId: 'owner-1', name: 'Luna', breed: 'Mestiza', age: 0, weight: 12.5,
    observations: 'Usa arnés', photoUri: null, size: 'Mediano', behavior: 'Sociable', specialNeeds: 'Ninguna' });
  assert.deepEqual(toPet({ id: pet.id, data: document }, pet.ownerId), pet);
  for (const [stored, expected] of [['Pequeño', 'SMALL'], ['SMALL', 'SMALL'], ['MEDIUM', 'MEDIUM'], ['Grande', 'LARGE'], ['Extra grande', 'EXTRA_LARGE'], ['', 'UNKNOWN']] as const) {
    assert.equal(toPet({ id: 'legacy', data: { ...document, size: stored } }, pet.ownerId).size, expected);
  }
  assert.equal(toPet({ id: 'legacy', data: { ...document, photoUri: 'content://local/pet' } }, pet.ownerId).photoUri, null);
  assert.equal(toPet({ id: 'legacy', data: { ...document, photoUri: 'https://example.com/pet.jpg' } }, pet.ownerId).photoUri, 'https://example.com/pet.jpg');
});

it('solo confirma un listado vacío después de recibir datos del servidor', () => {
  const f = fixture();
  const stop = f.actions.observe(owner, (result) => f.events.push(result));
  f.next([], true);
  assert.equal(f.events.length, 0);
  f.next([]);
  assert.deepEqual(f.events.at(-1), { ok: true, value: { items: [], fromCache: false, pendingWrites: false } });
  f.next([], true);
  const cached = f.events.at(-1);
  assert.equal(cached?.ok && cached.value.fromCache, true);
  stop();
});

it('muestra una copia local con sus metadatos y luego recibe los cambios ordenados', () => {
  const f = fixture();
  const stop = f.actions.observe(owner, (result) => f.events.push(result));
  f.next([{ id: 'z', data: { ...toPetDocument(pet), name: 'Zoe' } }], true);
  const cached = f.events.at(-1);
  assert.equal(cached?.ok && cached.value.fromCache, true);
  f.next([{ id: 'z', data: { ...toPetDocument(pet), name: 'Zoe' } }, { id: 'a', data: toPetDocument(pet) }]);
  const live = f.events.at(-1);
  assert.ok(live?.ok);
  assert.equal(live.value.fromCache, false);
  assert.deepEqual(live.value.items.map((value) => value.name), ['Luna', 'Zoe']);
  stop();
});

it('cancela la escucha e ignora respuestas tardías al salir de la cuenta', () => {
  const f = fixture();
  const stop = f.actions.observe(owner, (result) => f.events.push(result));
  f.next([]);
  stop();
  assert.equal(f.stopped, true);
  f.next([{ id: pet.id, data: toPetDocument(pet) }]);
  f.fail({ code: 'permission-denied' });
  assert.equal(f.events.length, 1);
});

it('no expone mascotas ajenas ni detalles internos de errores del SDK', async () => {
  const f = fixture();
  const stop = f.actions.observe(owner, (result) => f.events.push(result));
  f.next([{ id: 'private', data: { ownerId: 'other-owner', name: 'private pet' } }]);
  assert.equal(f.events.at(-1)?.ok, false);
  assert.doesNotMatch(JSON.stringify(f.events), /private pet/);
  for (const [code, expected] of [['firestore/permission-denied', 'forbidden'], ['unavailable', 'unavailable'], ['unknown', 'unexpected']] as const) {
    f.source.create = async () => { throw { code, message: 'private SDK detail' }; };
    const result = await f.actions.create(owner, draft);
    assert.ok(!result.ok);
    assert.equal(result.error.code, expected);
    assert.doesNotMatch(result.error.message, /private SDK/);
    f.fail({ code, message: 'private SDK detail' });
    assert.doesNotMatch(JSON.stringify(f.events), /private SDK/);
  }
  stop();
});

it('dos clientes reciben el alta de la misma cuenta en tiempo real y aíslan a otros dueños', async () => {
  // Backend compartido simulado; cada cliente tiene su repositorio y su suscripción.
  const documents = new Map<string, Pet>();
  const listeners = new Set<() => void>();
  function source(): PetDataSource {
    return {
      newId: () => 'shared-pet',
      async create(value) { documents.set(value.id, value); listeners.forEach((notify) => notify()); },
      observeByOwner(uid, listener) {
        const notify = () => listener({ documents: [...documents.values()].filter((value) => value.ownerId === uid).map((value) => ({ id: value.id, data: toPetDocument(value) })), fromCache: false, pendingWrites: false });
        listeners.add(notify); notify(); return () => { listeners.delete(notify); };
      },
    };
  }
  const web = createPetUseCases(new PetRepositoryImpl(source()));
  const android = createPetUseCases(new PetRepositoryImpl(source()));
  const webEvents: Result<PetList>[] = [], androidEvents: Result<PetList>[] = [], otherEvents: Result<PetList>[] = [];
  const stops = [web.observe(owner, (value) => webEvents.push(value)), android.observe(owner, (value) => androidEvents.push(value)),
    web.observe({ status: 'authenticated', uid: 'other', role: 'OWNER' }, (value) => otherEvents.push(value))];
  assert.equal((await web.create(owner, draft)).ok, true);
  assert.deepEqual(webEvents.at(-1), androidEvents.at(-1));
  const received = androidEvents.at(-1);
  assert.ok(received?.ok);
  assert.deepEqual(received.value.items, [pet]);
  const other = otherEvents.at(-1);
  assert.ok(other?.ok);
  assert.deepEqual(other.value.items, []);
  assert.equal((await android.create(owner, { ...draft, id: 'pet-2', name: 'Milo' })).ok, true);
  assert.deepEqual(webEvents.at(-1), androidEvents.at(-1));
  assert.equal(documents.size, 2);
  stops.forEach((stop) => stop());
  assert.equal(listeners.size, 0);
});
