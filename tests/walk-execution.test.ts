import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { Walk } from '../src/core/domain/entities/walk';
import type { RequestSide } from '../src/core/domain/entities/walk-request';
import type { Session } from '../src/core/domain/entities/session';
import type { Result } from '../src/shared/types/result';
import type { LiveList } from '../src/shared/types/live-list';
import type { WalkBookingDataSource } from '../src/core/data/datasources/walk-booking-data-source';
import { acceptWalkTransaction, updateWalkTransaction, type WalkExecutionTransaction } from '../src/core/data/datasources/walk-execution-transaction';
import { WalkBookingRepositoryImpl } from '../src/core/data/repositories/walk-booking-repository-impl';
import { createWalkExecutionUseCases } from '../src/core/domain/use-cases/walk-execution-use-cases';
import { createWalkBookingUseCases } from '../src/core/domain/use-cases/walk-booking-use-cases';
import { toWalk, toWalkDocument } from '../src/core/data/mappers/walk-mapper';
import { elapsedWalkSeconds, formatWalkElapsed } from '../src/features/walks/presentation/state/walk-timing';
import { ownerVisibleRequests, walkStatusLabels } from '../src/features/walks/presentation/state/walk-display';
import type { WalkRequest } from '../src/core/domain/entities/walk-request';

const walker: Session = { status: 'authenticated', uid: 'walker-1', role: 'WALKER' };
const owner: Session = { status: 'authenticated', uid: 'owner-1', role: 'OWNER' };
const request = { ownerId: 'owner-1', walkerId: 'walker-1', ownerName: 'Ana Pérez', petIds: ['pet-1'], petNames: ['Luna'], petPhotos: [''],
  scheduledAt: '2026-11-10T14:00:00.000Z', durationMinutes: 30, status: 'PENDING', observations: 'Usar arnés' };
const start = Date.parse('2026-11-10T14:00:00.000Z');

function backend() {
  const documents = new Map<string, unknown>([['users/walker-1', { role: 'WALKER', active: true }], ['users/owner-1', { role: 'OWNER', active: true }],
    ['users/walker-2', { role: 'WALKER', active: true }], ['walkRequests/request-1', { ...request }]]);
  let version = 0, writes = 0, clock = start, commandCalls = 0;
  let commitError: unknown;
  let conflict: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const clone = (value: unknown) => value === undefined ? null : structuredClone(value);
  function put(key: string, value: unknown) { documents.set(key, clone(value)); version++; }
  async function transaction<T>(work: (port: WalkExecutionTransaction) => Promise<T>): Promise<T> {
    commandCalls++;
    // Modelo de transacción optimista: escrituras atómicas y reintento ante cambios concurrentes.
    for (let attempt = 0; attempt < 8; attempt++) {
      const readVersion = version;
      const snapshot = new Map(documents);
      const pending: (() => void)[] = [];
      const port: WalkExecutionTransaction = {
        async get(name, id) { return clone(snapshot.get(`${name}/${id}`)); },
        setWalk(id, data) { pending.push(() => { documents.set(`walks/${id}`, clone(data)); }); },
        update(name, id, data) {
          const key = `${name}/${id}`;
          if (!snapshot.has(key)) throw { code: 'not-found' };
          pending.push(() => { documents.set(key, { ...documents.get(key) as object, ...clone(data) as object }); });
        },
      };
      const result = await work(port);
      if (conflict) { const change = conflict; conflict = null; change(); }
      if (version !== readVersion) continue;
      if (commitError) throw commitError;
      if (pending.length) { pending.forEach((write) => write()); writes += pending.length; version++; listeners.forEach((notify) => notify()); }
      return result;
    }
    throw { code: 'unavailable' };
  }
  function client() {
    function observe(name: string, uid: string, side: RequestSide, next: Parameters<WalkBookingDataSource['observeWalks']>[2]) {
      const notify = () => next({ documents: [...documents.entries()].filter(([key, value]) => key.startsWith(`${name}/`) && (value as Record<string, unknown>)[side === 'owner' ? 'ownerId' : 'walkerId'] === uid)
        .map(([key, data]) => ({ id: key.slice(name.length + 1), data: clone(data) })), fromCache: false, pendingWrites: false });
      listeners.add(notify); notify(); return () => { listeners.delete(notify); };
    }
    const source: WalkBookingDataSource = {
      newRequestId: () => 'unused', observeAvailableWalkers: () => () => {},
      async createRequest() { throw new Error('Creation covered by booking tests'); },
      observeRequests: (uid, side, next) => observe('walkRequests', uid, side, next),
      observeWalks: (uid, side, next) => observe('walks', uid, side, next),
      acceptRequest: (uid, id) => transaction((port) => acceptWalkTransaction(port, uid, id)),
      updateWalk: (uid, id, action) => transaction((port) => updateWalkTransaction(port, uid, id, action, () => clock)),
    };
    const repository = new WalkBookingRepositoryImpl(source);
    return { source, repository, execution: createWalkExecutionUseCases(repository), booking: createWalkBookingUseCases(repository) };
  }
  return { client, documents, put, get: (key: string) => clone(documents.get(key)) as Record<string, unknown> | null,
    get writes() { return writes; }, get calls() { return commandCalls; }, get listeners() { return listeners.size; },
    time: (value: number) => { clock = value; }, fail: (error: unknown) => { commitError = error; },
    race: (change: () => void) => { conflict = change; } };
}

it('aceptar crea un paseo programado y cambia la solicitud en una sola transacción', async () => {
  const db = backend(), client = db.client();
  const result = await client.execution.accept(walker, 'request-1');
  assert.ok(result.ok);
  assert.equal(db.get('walkRequests/request-1')?.status, 'ACCEPTED');
  assert.deepEqual(result.value, { id: 'request-1', ownerId: 'owner-1', walkerId: 'walker-1', petIds: ['pet-1'], scheduledAt: start,
    durationMinutes: 30, status: 'SCHEDULED', startedAt: null, finishedAt: null, distanceKm: null, observations: 'Usar arnés' });
  assert.deepEqual(db.get('walks/request-1'), toWalkDocument(result.value));
  assert.equal(db.writes, 2);
});

it('aceptar reproduce el contrato Kotlin sin lecturas de perfil ni cambios en los datos de la solicitud', async () => {
  const legacy = { ...request, scheduledAt: '2026-11-08T17:30', observations: '  Prueba 2 Franco  ' };
  const reads: string[] = [];
  let created: unknown;
  let update: unknown;
  const port: WalkExecutionTransaction = {
    async get(collection, id) {
      reads.push(`${collection}/${id}`);
      if (collection === 'walkRequests') return legacy;
      if (collection === 'walks') return null;
      throw { code: 'permission-denied' };
    },
    setWalk(id, data) {
      assert.equal(id, 'request-1');
      // Contrato de WalkRequestRemoteDataSource.kt, no el de WalkRemoteDataSource.kt.
      assert.equal(data.startedAt, null);
      assert.equal(data.finishedAt, null);
      assert.equal(data.distanceKm, null);
      assert.equal(data.scheduledAt, legacy.scheduledAt);
      assert.equal(data.observations, legacy.observations);
      created = data;
    },
    update(collection, id, data) { update = { collection, id, data }; },
  };
  await acceptWalkTransaction(port, 'walker-1', 'request-1');
  assert.deepEqual(reads, ['walkRequests/request-1', 'walks/request-1']);
  assert.deepEqual(created, { ownerId: legacy.ownerId, walkerId: legacy.walkerId, petIds: legacy.petIds,
    scheduledAt: legacy.scheduledAt, durationMinutes: legacy.durationMinutes, status: 'SCHEDULED',
    startedAt: null, finishedAt: null, distanceKm: null, observations: legacy.observations });
  assert.deepEqual(update, { collection: 'walkRequests', id: 'request-1', data: { status: 'ACCEPTED' } });
});

it('iniciar y finalizar leen solamente el paseo y actualizan los mismos campos que Kotlin', async () => {
  let data: Record<string, unknown> = { ...request, status: 'SCHEDULED', startedAt: null, finishedAt: null, distanceKm: null };
  const reads: string[] = [], updates: Record<string, unknown>[] = [];
  const port: WalkExecutionTransaction = {
    async get(collection, id) { reads.push(`${collection}/${id}`); if (collection !== 'walks') throw { code: 'permission-denied' }; return data; },
    setWalk() { assert.fail('El paseo existente no se debe reemplazar'); },
    update(collection, id, fields) { assert.equal(collection, 'walks'); updates.push(fields); data = { ...data, ...fields }; },
  };
  await updateWalkTransaction(port, 'walker-1', 'request-1', 'start', () => start);
  await updateWalkTransaction(port, 'walker-1', 'request-1', 'complete', () => start + 1800000);
  assert.deepEqual(reads, ['walks/request-1', 'walks/request-1']);
  assert.deepEqual(updates, [{ status: 'IN_PROGRESS', startedAt: new Date(start).toISOString() },
    { status: 'COMPLETED', finishedAt: new Date(start + 1800000).toISOString() }]);
});

it('una aceptación repetida o concurrente no crea otro paseo ni reinicia el existente', async () => {
  const db = backend(), first = db.client(), second = db.client();
  const results = await Promise.all([first.execution.accept(walker, 'request-1'), second.execution.accept(walker, 'request-1')]);
  assert.ok(results.every((result) => result.ok));
  assert.equal([...db.documents.keys()].filter((key) => key.startsWith('walks/')).length, 1);
  assert.equal(db.writes, 2);
  assert.equal((await first.execution.start(walker, 'request-1')).ok, true);
  const active = db.get('walks/request-1');
  assert.equal((await second.execution.accept(walker, 'request-1')).ok, true);
  assert.deepEqual(db.get('walks/request-1'), active);
});

it('un fallo al confirmar la aceptación no deja un paseo o una solicitud parcialmente actualizados', async () => {
  const db = backend(); db.fail({ code: 'unavailable', message: 'private SDK detail' });
  const result = await db.client().execution.accept(walker, 'request-1');
  assert.ok(!result.ok); assert.equal(result.error.code, 'unavailable');
  assert.equal(db.get('walks/request-1'), null);
  assert.equal(db.get('walkRequests/request-1')?.status, 'PENDING');
  assert.equal(db.writes, 0);
  assert.doesNotMatch(JSON.stringify(result), /private SDK/);
});

it('una cancelación concurrente impide aceptar una solicitud que dejó de estar pendiente', async () => {
  const db = backend();
  db.race(() => db.put('walkRequests/request-1', { ...request, status: 'CANCELLED' }));
  const result = await db.client().execution.accept(walker, 'request-1');
  assert.ok(!result.ok); assert.equal(result.error.code, 'conflict');
  assert.equal(db.get('walks/request-1'), null);
  assert.equal(db.get('walkRequests/request-1')?.status, 'CANCELLED');
});

it('iniciar y finalizar guardan horarios ISO y los reintentos conservan los horarios originales', async () => {
  const db = backend(), client = db.client();
  await client.execution.accept(walker, 'request-1');
  assert.equal((await client.execution.complete(walker, 'request-1')).ok, false);
  const started = await client.execution.start(walker, 'request-1');
  assert.ok(started.ok); assert.equal(started.value.startedAt, start);
  db.time(start + 60000);
  assert.equal((await client.execution.start(walker, 'request-1')).ok, true);
  assert.equal(db.get('walks/request-1')?.startedAt, new Date(start).toISOString());
  db.time(start + 1800000);
  const completed = await client.execution.complete(walker, 'request-1');
  assert.ok(completed.ok); assert.equal(completed.value.status, 'COMPLETED');
  assert.equal(completed.value.finishedAt, start + 1800000);
  const final = db.get('walks/request-1');
  db.time(start + 1900000);
  assert.equal((await client.execution.complete(walker, 'request-1')).ok, true);
  assert.deepEqual(db.get('walks/request-1'), final);
  assert.equal((await client.execution.start(walker, 'request-1')).ok, false);
});

it('el dueño u otra cuenta no pueden ejecutar paseos ajenos', async () => {
  const db = backend(), client = db.client();
  for (const session of [owner, { status: 'signed-out' }] as const) {
    assert.equal((await client.execution.accept(session, 'request-1')).ok, false);
    assert.equal((await client.execution.start(session, 'request-1')).ok, false);
    assert.equal((await client.execution.complete(session, 'request-1')).ok, false);
  }
  assert.equal(db.calls, 0);
  const other: Session = { status: 'authenticated', uid: 'walker-2', role: 'WALKER' };
  assert.equal((await client.execution.accept(other, 'request-1')).ok, false);
  await client.execution.accept(walker, 'request-1');
  assert.equal((await client.execution.start(other, 'request-1')).ok, false);
  assert.equal((await client.execution.start(owner, 'request-1')).ok, false);
  assert.equal(db.get('walks/request-1')?.status, 'SCHEDULED');
});

it('no sobrescribe paseos existentes ni acepta solicitudes rechazadas, canceladas o incompletas', async () => {
  for (const status of ['CANCELLED', 'REJECTED', 'ACCEPTED']) {
    const db = backend(); db.put('walkRequests/request-1', { ...request, status });
    assert.equal((await db.client().execution.accept(walker, 'request-1')).ok, false);
    assert.equal(db.writes, 0);
  }
  const db = backend(), client = db.client();
  await client.execution.accept(walker, 'request-1');
  const existing = db.get('walks/request-1');
  db.put('walkRequests/request-1', request);
  assert.equal((await client.execution.accept(walker, 'request-1')).ok, false);
  assert.deepEqual(db.get('walks/request-1'), existing);
  db.documents.delete('walks/request-1');
  db.put('walkRequests/request-1', { ...request, petIds: [] });
  assert.equal((await client.execution.accept(walker, 'request-1')).ok, false);
});

it('un paseo cancelado o terminado no puede volver al estado en curso', async () => {
  for (const status of ['CANCELLED', 'COMPLETED']) {
    const db = backend(), client = db.client(); await client.execution.accept(walker, 'request-1');
    db.put('walks/request-1', { ...db.get('walks/request-1'), status });
    assert.equal((await client.execution.start(walker, 'request-1')).ok, false);
    if (status === 'CANCELLED') assert.equal((await client.execution.complete(walker, 'request-1')).ok, false);
  }
});

it('un error al iniciar o finalizar conserva el estado confirmado y permite reintentar', async () => {
  const db = backend(), client = db.client(); await client.execution.accept(walker, 'request-1');
  db.fail({ code: 'permission-denied', message: 'private detail' });
  assert.equal((await client.execution.start(walker, 'request-1')).ok, false);
  assert.equal(db.get('walks/request-1')?.status, 'SCHEDULED');
  db.fail(null); await client.execution.start(walker, 'request-1');
  db.fail({ code: 'unavailable' });
  assert.equal((await client.execution.complete(walker, 'request-1')).ok, false);
  assert.equal(db.get('walks/request-1')?.status, 'IN_PROGRESS');
  db.fail(null); db.time(start + 1000);
  assert.equal((await client.execution.complete(walker, 'request-1')).ok, true);
});

it('bloquea operaciones simultáneas desde la misma app y libera el bloqueo después del error', async () => {
  const db = backend(), client = db.client();
  const original = client.source.acceptRequest;
  let release!: () => void;
  client.source.acceptRequest = async () => { await new Promise<void>((resolve) => { release = resolve; }); throw { code: 'unavailable' }; };
  const first = client.execution.accept(walker, 'request-1');
  assert.equal((await client.execution.accept(walker, 'request-1')).ok, false);
  assert.equal((await client.execution.start(walker, 'request-1')).ok, false);
  release(); assert.equal((await first).ok, false);
  client.source.acceptRequest = original;
  assert.equal((await client.execution.accept(walker, 'request-1')).ok, true);
  assert.equal((await client.execution.accept(walker, '../invalid')).ok, false);
});

it('dueño y paseador reciben aceptación, inicio y finalización desde clientes web/Android independientes', async () => {
  const db = backend(), walkerWeb = db.client(), walkerAndroid = db.client(), ownerWeb = db.client(), ownerAndroid = db.client();
  const streams: Result<LiveList<Walk>>[][] = [[], [], [], [], []];
  let ownerRequests: readonly WalkRequest[] = [];
  const stopRequests = ownerWeb.booking.observeRequests(owner, 'owner', (result) => { if (result.ok) ownerRequests = result.value.items; });
  assert.equal(ownerVisibleRequests(ownerRequests).length, 1);
  const stops = [walkerWeb.execution.observeWalks(walker, 'walker', (value) => streams[0]!.push(value)), walkerAndroid.execution.observeWalks(walker, 'walker', (value) => streams[1]!.push(value)),
    ownerWeb.execution.observeWalks(owner, 'owner', (value) => streams[2]!.push(value)), ownerAndroid.execution.observeWalks(owner, 'owner', (value) => streams[3]!.push(value)),
    ownerWeb.execution.observeWalks({ status: 'authenticated', uid: 'other', role: 'OWNER' }, 'owner', (value) => streams[4]!.push(value))];
  for (const [action, status, label] of [['accept', 'SCHEDULED', 'Confirmado'], ['start', 'IN_PROGRESS', 'En curso'], ['complete', 'COMPLETED', 'Finalizado']] as const) {
    assert.equal((await walkerWeb.execution[action](walker, 'request-1')).ok, true);
    const value = streams[0]!.at(-1); assert.ok(value?.ok); assert.equal(value.value.items[0]?.status, status);
    for (const stream of streams.slice(1, 4)) assert.deepEqual(stream.at(-1), value);
    // La solicitud permanece aceptada, pero la pantalla del dueño muestra el paseo actualizado.
    assert.equal(ownerRequests[0]?.status, 'ACCEPTED');
    assert.equal(ownerVisibleRequests(ownerRequests).length, 0);
    const ownerWalks = streams[2]!.at(-1); assert.ok(ownerWalks?.ok);
    assert.equal(walkStatusLabels[ownerWalks.value.items[0]!.status], label);
    const other = streams[4]!.at(-1); assert.ok(other?.ok); assert.equal(other.value.items.length, 0);
    db.time(start + 1800000);
  }
  stopRequests(); stops.forEach((stop) => stop()); assert.equal(db.listeners, 0);
});

it('las suscripciones respetan el rol y dejan de publicar al cerrar la cuenta', async () => {
  const db = backend(), client = db.client(), events: Result<LiveList<Walk>>[] = [];
  client.execution.observeWalks(owner, 'walker', (result) => assert.equal(result.ok, false))();
  assert.equal(db.listeners, 0);
  const stop = client.execution.observeWalks(owner, 'owner', (value) => events.push(value));
  stop(); await client.execution.accept(walker, 'request-1');
  assert.equal(events.length, 1);
  assert.throws(() => toWalk({ id: 'private', data: { ...db.get('walks/request-1'), ownerId: 'other' } }, 'owner-1', 'owner'));
});

it('el mapper admite ISO y Timestamp, y el contador se recupera sin reiniciarse al abrir la app', async () => {
  const db = backend(), client = db.client(); await client.execution.accept(walker, 'request-1');
  const started = await client.execution.start(walker, 'request-1'); assert.ok(started.ok);
  assert.equal(elapsedWalkSeconds(started.value, start + 65000), 65);
  assert.equal(formatWalkElapsed(65), '01:05'); assert.equal(formatWalkElapsed(3665), '01:01:05');
  const reloaded = toWalk({ id: 'request-1', data: db.get('walks/request-1') }, 'owner-1', 'owner');
  assert.equal(elapsedWalkSeconds(reloaded, start + 120000), 120);
  const timestamp = toWalk({ id: 'request-1', data: { ...db.get('walks/request-1'), startedAt: { toMillis: () => start } } }, 'owner-1', 'owner');
  assert.equal(timestamp.startedAt, start);
  db.time(start + 1800000); const completed = await client.execution.complete(walker, 'request-1'); assert.ok(completed.ok);
  assert.equal(elapsedWalkSeconds(completed.value, start + 7200000), 1800);
  assert.equal(elapsedWalkSeconds({ status: 'IN_PROGRESS' }, start), null);
});
