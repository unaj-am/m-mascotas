import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { Session } from '../src/core/domain/entities/session';
import type { Walker } from '../src/core/domain/entities/walker';
import type { WalkRequest, WalkRequestDraft } from '../src/core/domain/entities/walk-request';
import type { LiveList } from '../src/shared/types/live-list';
import type { Result } from '../src/shared/types/result';
import type { WalkBookingDataSource, BookingListener } from '../src/core/data/datasources/walk-booking-data-source';
import { WalkBookingRepositoryImpl } from '../src/core/data/repositories/walk-booking-repository-impl';
import { createWalkBookingUseCases } from '../src/core/domain/use-cases/walk-booking-use-cases';
import { toNewBookingDocument, toBookingRequest, toPublicWalker } from '../src/core/data/mappers/walk-booking-mapper';
import { parseRequestSchedule } from '../src/features/walks/presentation/state/request-schedule';

const now = Date.parse('2026-11-08T12:00:00Z');
const owner: Session = { status: 'authenticated', uid: 'owner-1', role: 'OWNER' };
const walker: Session = { status: 'authenticated', uid: 'walker-1', role: 'WALKER' };
const draft: WalkRequestDraft = { id: 'request-1', walkerId: 'walker-1', petIds: ['pet-1'], scheduledAt: now + 86400000, durationMinutes: 30, observations: ' Usa arnés ' };
const ownerProfile = { role: 'OWNER', active: true, name: 'Ana', lastName: 'Pérez' };
const walkerProfile = { available: true, serviceArea: 'Quilmes', description: 'Paseos responsables', maxPets: 2, pricePerWalk: 8000, experienceYears: 3, rating: 4.8 };
const pets = [{ id: 'pet-1', data: { ownerId: 'owner-1', name: 'Luna', photoUri: 'content://local/photo' } }];
const document = () => toNewBookingDocument('owner-1', draft, ownerProfile, walkerProfile, pets, now);

function fixture() {
  let walkNext: BookingListener = () => {}, requestNext: BookingListener = () => {};
  let requestError: (error: unknown) => void = () => {};
  let saved: { uid: string; draft: WalkRequestDraft } | null = null;
  let calls = 0, stops = 0;
  const source: WalkBookingDataSource = {
    async acceptRequest() { throw new Error('Not used in booking tests'); },
    async updateWalk() { throw new Error('Not used in booking tests'); },
    observeWalks() { return () => {}; },
    newRequestId() { calls++; return 'generated-id'; },
    observeAvailableWalkers(next) { calls++; walkNext = next; return () => { stops++; }; },
    async createRequest(uid, value) { calls++; saved = { uid, draft: value }; },
    observeRequests(_uid, _side, next, error) { calls++; requestNext = next; requestError = error; return () => { stops++; }; },
  };
  const repository = new WalkBookingRepositoryImpl(source);
  return { source, repository, actions: createWalkBookingUseCases(repository, () => now),
    walkers: (documents: Parameters<BookingListener>[0]['documents'], fromCache = false) => walkNext({ documents, fromCache, pendingWrites: false }),
    requests: (documents: Parameters<BookingListener>[0]['documents'], fromCache = false) => requestNext({ documents, fromCache, pendingWrites: false }),
    fail: (error: unknown) => requestError(error), get calls() { return calls; }, get stops() { return stops; }, get saved() { return saved; } };
}

it('el directorio muestra perfiles públicos disponibles sin necesitar documentos privados de usuarios', () => {
  const f = fixture(), events: Result<LiveList<Walker>>[] = [];
  const stop = f.actions.observeWalkers(owner, (value) => events.push(value));
  f.walkers([{ id: 'walker-1', data: walkerProfile }, { id: 'offline', data: { ...walkerProfile, available: false } }]);
  const result = events.at(-1);
  assert.ok(result?.ok);
  assert.deepEqual(result.value.items, [{ userId: 'walker-1', ...walkerProfile }]);
  assert.equal(toPublicWalker({ id: 'legacy', data: { available: true, maxPets: -1, rating: 8 } }).maxPets, 1);
  assert.equal(toPublicWalker({ id: 'legacy', data: { available: true, rating: 8 } }).rating, null);
  stop();
});

it('solo el dueño busca y solicita; cada rol observa únicamente su lado de las solicitudes', async () => {
  const f = fixture();
  for (const session of [{ status: 'signed-out' }, walker] as const) {
    assert.equal((await f.actions.createRequest(session, draft)).ok, false);
    assert.equal(f.actions.newRequestId(session).ok, false);
    f.actions.observeWalkers(session, (result) => assert.equal(result.ok, false))();
  }
  f.actions.observeRequests(owner, 'walker', (result) => assert.equal(result.ok, false))();
  f.actions.observeRequests(walker, 'owner', (result) => assert.equal(result.ok, false))();
  assert.equal(f.calls, 0);
});

it('valida mascotas, fecha futura, duración y observaciones antes de enviar', async () => {
  for (const invalid of [
    { id: '' }, { walkerId: '../walker' }, { walkerId: 'owner-1' }, { petIds: [] }, { petIds: ['pet-1', 'pet-1'] },
    { petIds: ['a', 'b', 'c', 'd', 'e', 'f'] }, { petIds: ['invalid/id'] }, { scheduledAt: now }, { scheduledAt: NaN },
    { scheduledAt: 9e15 }, { durationMinutes: 0 }, { durationMinutes: 1.5 }, { durationMinutes: NaN },
    { durationMinutes: 1441 }, { observations: 'x'.repeat(1001) },
  ]) {
    const f = fixture();
    const result = await f.actions.createRequest(owner, { ...draft, ...invalid });
    assert.equal(result.ok, false, JSON.stringify(invalid));
    assert.equal(f.calls, 0);
  }
});

it('toma el dueño de la sesión e ignora un estado o nombres inyectados desde la pantalla', async () => {
  const f = fixture();
  assert.equal((await f.actions.createRequest(owner, { ...draft, ownerId: 'other', status: 'ACCEPTED', ownerName: 'Injected' } as WalkRequestDraft)).ok, true);
  assert.deepEqual(f.saved, { uid: 'owner-1', draft: { ...draft, observations: 'Usa arnés' } });
});

it('el documento nuevo usa fecha ISO, estado pendiente y nombres reales del servidor', () => {
  assert.deepEqual(document(), { ownerId: 'owner-1', walkerId: 'walker-1', ownerName: 'Ana Pérez', petIds: ['pet-1'], petNames: ['Luna'], petPhotos: [''],
    scheduledAt: '2026-11-09T12:00:00.000Z', durationMinutes: 30, status: 'PENDING', observations: 'Usa arnés' });
  const mapped = toBookingRequest({ id: draft.id, data: document() }, 'owner-1', 'owner');
  assert.equal(mapped.scheduledAt, draft.scheduledAt);
  assert.equal(mapped.status, 'PENDING');
  assert.equal(mapped.ownerName, 'Ana Pérez');
});

it('verifica pertenencia, existencia, disponibilidad y capacidad con los documentos del guardado', () => {
  const rejects = [
    () => toNewBookingDocument('owner-1', draft, { ...ownerProfile, active: false }, walkerProfile, pets, now),
    () => toNewBookingDocument('owner-1', draft, { ...ownerProfile, role: 'WALKER' }, walkerProfile, pets, now),
    () => toNewBookingDocument('owner-1', draft, ownerProfile, null, pets, now),
    () => toNewBookingDocument('owner-1', draft, ownerProfile, { ...walkerProfile, available: false }, pets, now),
    () => toNewBookingDocument('owner-1', { ...draft, petIds: ['pet-1', 'pet-2', 'pet-3'] }, ownerProfile, walkerProfile, pets, now),
    () => toNewBookingDocument('owner-1', draft, ownerProfile, walkerProfile, [], now),
    () => toNewBookingDocument('owner-1', draft, ownerProfile, walkerProfile, [{ id: 'pet-1', data: undefined }], now),
    () => toNewBookingDocument('owner-1', draft, ownerProfile, walkerProfile, [{ id: 'pet-1', data: { ownerId: 'other', name: 'Private' } }], now),
    () => toNewBookingDocument('owner-1', draft, ownerProfile, walkerProfile, pets, draft.scheduledAt + 1),
  ];
  rejects.forEach((operation) => assert.throws(operation));
});

it('no confirma un listado vacío desde caché y cancela respuestas tardías al salir', () => {
  const f = fixture(), events: Result<LiveList<WalkRequest>>[] = [];
  const stop = f.actions.observeRequests(owner, 'owner', (value) => events.push(value));
  f.requests([], true); assert.equal(events.length, 0);
  f.requests([]); assert.equal(events.length, 1);
  f.requests([{ id: draft.id, data: document() }]);
  const result = events.at(-1); assert.ok(result?.ok); assert.equal(result.value.items.length, 1);
  stop();
  f.requests([]); f.fail({ code: 'permission-denied' });
  assert.equal(events.length, 2); assert.equal(f.stops, 1);
});

it('rechaza documentos de otra cuenta sin revelar sus datos', () => {
  const f = fixture(), events: Result<LiveList<WalkRequest>>[] = [];
  const stop = f.actions.observeRequests(owner, 'owner', (value) => events.push(value));
  f.requests([{ id: 'private', data: { ...document(), ownerId: 'other', ownerName: 'Private name' } }]);
  assert.equal(events.at(-1)?.ok, false);
  assert.doesNotMatch(JSON.stringify(events), /Private name/);
  stop();
});

it('un rechazo del guardado conserva un error y no confirma el envío', async () => {
  for (const [code, expected] of [['firestore/permission-denied', 'forbidden'], ['unavailable', 'unavailable'], ['not-found', 'not-found'], ['unknown', 'unexpected']] as const) {
    const f = fixture();
    f.source.createRequest = async () => { throw { code, message: 'private SDK detail' }; };
    const result = await f.actions.createRequest(owner, draft);
    assert.ok(!result.ok); assert.equal(result.error.code, expected);
    assert.doesNotMatch(result.error.message, /private SDK/);
  }
});

it('espera la confirmación y bloquea un segundo envío mientras el primero está pendiente', async () => {
  const f = fixture();
  let finish!: () => void, completed = false, calls = 0;
  f.source.createRequest = () => { calls++; return new Promise<void>((resolve) => { finish = resolve; }); };
  const first = f.actions.createRequest(owner, draft).then((result) => { completed = true; return result; });
  assert.equal(completed, false);
  assert.equal((await f.actions.createRequest(owner, draft)).ok, false);
  assert.equal(calls, 1);
  finish(); assert.equal((await first).ok, true);
  f.source.createRequest = async () => { calls++; };
  assert.equal((await f.actions.createRequest(owner, { ...draft, id: 'request-2' })).ok, true);
  assert.equal(calls, 2);
});

it('el dueño y el paseador reciben la solicitud desde clientes independientes sin recargar', async () => {
  // Simula un backend compartido, con una fuente y repositorio por cliente.
  const records = new Map<string, ReturnType<typeof document>>();
  const subscribers = new Set<() => void>();
  function client() {
    const source: WalkBookingDataSource = {
      async acceptRequest() { throw new Error('Not used in booking tests'); },
      async updateWalk() { throw new Error('Not used in booking tests'); },
      observeWalks() { return () => {}; },
      newRequestId: () => 'new-id',
      observeAvailableWalkers(next) { next({ documents: [{ id: 'walker-1', data: walkerProfile }], fromCache: false, pendingWrites: false }); return () => {}; },
      async createRequest(uid, input) { records.set(input.id, toNewBookingDocument(uid, input, ownerProfile, walkerProfile, pets, now)); subscribers.forEach((notify) => notify()); },
      observeRequests(uid, side, next) {
        const notify = () => next({ documents: [...records.entries()].filter(([, data]) => data[side === 'owner' ? 'ownerId' : 'walkerId'] === uid).map(([id, data]) => ({ id, data })), fromCache: false, pendingWrites: false });
        subscribers.add(notify); notify(); return () => { subscribers.delete(notify); };
      },
    };
    return createWalkBookingUseCases(new WalkBookingRepositoryImpl(source), () => now);
  }
  const ownerWeb = client(), ownerAndroid = client(), walkerWeb = client(), walkerAndroid = client();
  const streams: Result<LiveList<WalkRequest>>[][] = [[], [], [], [], []];
  const stops = [ownerWeb.observeRequests(owner, 'owner', (value) => streams[0]!.push(value)), ownerAndroid.observeRequests(owner, 'owner', (value) => streams[1]!.push(value)),
    walkerWeb.observeRequests(walker, 'walker', (value) => streams[2]!.push(value)), walkerAndroid.observeRequests(walker, 'walker', (value) => streams[3]!.push(value)),
    ownerWeb.observeRequests({ status: 'authenticated', uid: 'other', role: 'OWNER' }, 'owner', (value) => streams[4]!.push(value))];
  assert.equal((await ownerWeb.createRequest(owner, draft)).ok, true);
  const received = streams[0]!.at(-1); assert.ok(received?.ok); assert.equal(received.value.items[0]?.status, 'PENDING');
  for (const stream of streams.slice(1, 4)) assert.deepEqual(stream.at(-1), received);
  const other = streams[4]!.at(-1); assert.ok(other?.ok); assert.equal(other.value.items.length, 0);
  stops.forEach((stop) => stop()); assert.equal(subscribers.size, 0);
});

it('interpreta el horario local y rechaza fechas inexistentes o formatos ambiguos', () => {
  const valid = parseRequestSchedule('09/11/2026', '17:30');
  assert.equal(valid, new Date(2026, 10, 9, 17, 30).getTime());
  assert.ok(Number.isFinite(parseRequestSchedule('29/02/2028', '09:15')));
  for (const [date, time] of [['31/02/2027', '17:30'], ['29/02/2027', '17:30'], ['01/13/2027', '12:00'], ['08/11/2026', '24:00'], ['08/11/2026', '12:60'], ['2026-11-08', '12:00'], ['', '']]) {
    assert.ok(Number.isNaN(parseRequestSchedule(date!, time!)), `${date} ${time}`);
  }
});
