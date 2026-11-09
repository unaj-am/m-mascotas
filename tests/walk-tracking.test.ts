import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { WalkLocation } from '../src/core/domain/entities/location';
import type { WalkTracking } from '../src/core/domain/entities/walk-tracking';
import type { Result } from '../src/shared/types/result';
import { success } from '../src/shared/types/result';
import type { WalkLocationDataSource, LocationSnapshot } from '../src/core/data/datasources/walk-location-data-source';
import type { LocationCaptureRepository } from '../src/core/domain/repositories/location-capture-repository';
import { WalkLocationRepositoryImpl } from '../src/core/data/repositories/walk-location-repository-impl';
import { createWalkTrackingUseCases, shouldPublishLocation, validWalkLocation } from '../src/core/domain/use-cases/walk-tracking-use-cases';
import { toLocationDocument, toWalkLocation } from '../src/core/data/mappers/walk-location-mapper';
import { trackingMapData } from '../src/features/tracking/presentation/state/tracking-map';
import { trackingMapHtml } from '../src/features/tracking/presentation/components/tracking-map-html';
import { createWebLocationCapture } from '../src/core/data/location/web-location-capture';

const point: WalkLocation = { latitude: -34.6037, longitude: -58.3816, accuracy: 10, bearing: null, speed: null, recordedAt: 1794132000000 };
const walker = { status: 'authenticated', uid: 'walker-1', role: 'WALKER' } as const;
const owner = { status: 'authenticated', uid: 'owner-1', role: 'OWNER' } as const;
const rawWalk = { ownerId: owner.uid, walkerId: walker.uid, petIds: ['pet-1'], scheduledAt: '2026-11-08T17:30:00Z', durationMinutes: 30,
  status: 'IN_PROGRESS', startedAt: '2026-11-08T17:30:00Z', finishedAt: null, distanceKm: null, observations: '' };

function fixture() {
  let walk = { ...rawWalk }, published: WalkLocation[] = [], childCalls = 0, stopped = 0;
  let nextWalk: (value: LocationSnapshot<unknown>) => void = () => {};
  let nextCurrent: (value: LocationSnapshot<unknown>) => void = () => {};
  let nextHistory: (value: LocationSnapshot<readonly unknown[]>) => void = () => {};
  let currentError: (error: unknown) => void = () => {};
  const source: WalkLocationDataSource = {
    async getWalk() { return walk; },
    observeWalk(uid, id, next) { nextWalk = next; next({ data: walk, fromCache: false, pendingWrites: false }); return () => { stopped++; }; },
    observeCurrent(uid, id, next, error) { childCalls++; nextCurrent = next; currentError = error; next({ data: null, fromCache: false, pendingWrites: false }); return () => { stopped++; }; },
    observeHistory(uid, id, next) { childCalls++; nextHistory = next; next({ data: [], fromCache: false, pendingWrites: false }); return () => { stopped++; }; },
    async publish(uid, id, value) { published.push(value); nextCurrent({ data: toLocationDocument(value), fromCache: false, pendingWrites: false }); nextHistory({ data: published.map(toLocationDocument), fromCache: false, pendingWrites: false }); },
  };
  const repository = new WalkLocationRepositoryImpl(source);
  let prepareCalls = 0, captureStarts = 0, captureStops = 0, captureWalk: string | null = null;
  const capture: LocationCaptureRepository = {
    async prepare() { prepareCalls++; return success(undefined); },
    async start(uid, id) { captureStarts++; captureWalk = id; return success(undefined); },
    async stop() { captureStops++; captureWalk = null; return success(undefined); },
    async status() { return success({ walkId: captureWalk, sharing: captureWalk !== null, message: null }); },
  };
  return { source, repository, capture, cases: createWalkTrackingUseCases(repository, capture),
    change(value: Partial<typeof rawWalk>) { walk = { ...walk, ...value }; nextWalk({ data: walk, fromCache: false, pendingWrites: false }); },
    current: (value: unknown) => nextCurrent({ data: value, fromCache: false, pendingWrites: false }),
    history: (value: readonly unknown[]) => nextHistory({ data: value, fromCache: false, pendingWrites: false }),
    get published() { return published; }, get childCalls() { return childCalls; }, get stopped() { return stopped; },
    get prepareCalls() { return prepareCalls; }, get captureStarts() { return captureStarts; }, get captureStops() { return captureStops; },
    oldCurrent: () => nextCurrent, oldError: () => currentError };
}

it('el GPS usa exactamente los siete campos de WalkLocationRemoteDataSource.kt', () => {
  assert.deepEqual(toLocationDocument({ ...point, uid: 'injected' } as WalkLocation), point);
  assert.deepEqual(toWalkLocation(point), point);
  assert.equal(toLocationDocument(point).bearing, null);
  for (const invalid of [{ latitude: NaN }, { longitude: Infinity }, { latitude: 91 }, { longitude: -181 }, { accuracy: -1 },
    { bearing: 361 }, { speed: -1 }, { recordedAt: 0 }]) {
    assert.equal(validWalkLocation({ ...point, ...invalid }), false);
    assert.throws(() => toWalkLocation({ ...point, ...invalid }));
  }
});

it('filtra ruido, precisión deficiente y puntos fuera de orden con los umbrales Kotlin', () => {
  assert.equal(shouldPublishLocation(null, point), true);
  assert.equal(shouldPublishLocation(null, { ...point, accuracy: 36 }), false);
  assert.equal(shouldPublishLocation(point, { ...point, recordedAt: point.recordedAt + 5000 }), false);
  assert.equal(shouldPublishLocation(point, { ...point, latitude: point.latitude + 0.0001, recordedAt: point.recordedAt + 5000 }), true);
  assert.equal(shouldPublishLocation(point, { ...point, recordedAt: point.recordedAt + 30000 }), true);
  assert.equal(shouldPublishLocation(point, { ...point, recordedAt: point.recordedAt - 1 }), false);
});

it('solo el paseador asignado publica durante el paseo en curso', async () => {
  const f = fixture();
  assert.equal((await f.repository.publish(owner.uid, 'walk-1', point)).ok, false);
  assert.equal((await f.repository.publish('other', 'walk-1', point)).ok, false);
  assert.equal((await f.repository.publish(walker.uid, 'walk-1', { ...point, accuracy: -1 })).ok, false);
  assert.equal(f.published.length, 0);
  assert.equal((await f.repository.publish(walker.uid, 'walk-1', point)).ok, true);
  f.change({ status: 'COMPLETED' });
  assert.equal((await f.repository.publish(walker.uid, 'walk-1', point)).ok, false);
  assert.equal(f.published.length, 1);
});

it('el dueño observa ubicación e historial sin pedir su GPS y conserva la ruta al finalizar', async () => {
  const f = fixture(), events: Result<WalkTracking>[] = [];
  const stop = f.cases.observe(owner, 'walk-1', (value) => events.push(value));
  assert.equal(f.prepareCalls, 0);
  assert.equal((await f.repository.publish(walker.uid, 'walk-1', point)).ok, true);
  const current = events.at(-1); assert.ok(current?.ok); assert.deepEqual(current.value.current, point); assert.deepEqual(current.value.history, [point]);
  const oldCurrent = f.oldCurrent(), oldError = f.oldError();
  f.change({ status: 'COMPLETED' }); f.history([point]);
  oldCurrent({ data: { ...point, latitude: 0 }, fromCache: false, pendingWrites: false }); oldError({ code: 'permission-denied' });
  const completed = events.at(-1); assert.ok(completed?.ok); assert.equal(completed.value.walk.status, 'COMPLETED');
  assert.equal(completed.value.current, null); assert.deepEqual(completed.value.history, [point]);
  stop(); const count = events.length; f.current(point); f.history([point]); assert.equal(events.length, count);
});

it('un paseo confirmado espera el inicio sin inventar ubicaciones y luego conecta el GPS', () => {
  const f = fixture(); f.change({ status: 'SCHEDULED' }); const events: Result<WalkTracking>[] = [];
  const stop = f.cases.observe(owner, 'walk-1', (value) => events.push(value));
  assert.equal(f.childCalls, 0);
  const scheduled = events.at(-1); assert.ok(scheduled?.ok); assert.equal(scheduled.value.current, null); assert.deepEqual(scheduled.value.history, []);
  f.change({ status: 'IN_PROGRESS' }); assert.equal(f.childCalls, 2);
  stop();
});

it('una cuenta ajena no abre las suscripciones privadas del GPS', () => {
  const f = fixture(); const events: Result<WalkTracking>[] = [];
  const stop = f.cases.observe({ status: 'authenticated', uid: 'other', role: 'OWNER' }, 'walk-1', (value) => events.push(value));
  assert.equal(events.at(-1)?.ok, false); assert.equal(f.childCalls, 0); stop();
});

it('los errores de publicación no confirman el envío ni revelan detalles del SDK', async () => {
  const f = fixture(); f.source.publish = async () => { throw { code: 'firestore/permission-denied', message: 'private' }; };
  const result = await f.repository.publish(walker.uid, 'walk-1', point); assert.ok(!result.ok); assert.equal(result.error.code, 'forbidden');
  assert.doesNotMatch(result.error.message, /private/);
});

it('la captura requiere rol paseador y un paseo propio en curso; la reconciliación verifica el servidor', async () => {
  const f = fixture();
  assert.equal((await f.cases.prepare(owner)).ok, false);
  assert.equal((await f.cases.start(owner, 'walk-1')).ok, false); assert.equal(f.prepareCalls, 0); assert.equal(f.captureStarts, 0);
  f.change({ status: 'SCHEDULED' }); assert.equal((await f.cases.start(walker, 'walk-1')).ok, false);
  f.change({ status: 'IN_PROGRESS' }); assert.equal((await f.cases.start(walker, 'walk-1')).ok, true);
  await f.cases.reconcile(walker); assert.equal(f.captureStops, 0);
  f.change({ status: 'COMPLETED' }); await f.cases.reconcile(walker); assert.equal(f.captureStops, 1);
  await f.cases.stopAll(); assert.equal(f.captureStops, 2);
});

it('el mapa no crea posiciones falsas y separa tramos sin señal', () => {
  assert.equal(trackingMapData(null, []).target, null);
  const second = { ...point, latitude: point.latitude + 0.0001, recordedAt: point.recordedAt + 5000 };
  const gap = { ...second, recordedAt: point.recordedAt + 200000 };
  const fourth = { ...gap, latitude: gap.latitude + 0.0001, recordedAt: gap.recordedAt + 5000 };
  const map = trackingMapData(fourth, [fourth, point, second, gap]);
  assert.deepEqual(map.target, [fourth.longitude, fourth.latitude]); assert.equal(map.segments.length, 2);
  assert.deepEqual(trackingMapData({ ...point, latitude: 0, longitude: 0 }, []).target, [0, 0]);
  const script = /<script type="module">([\s\S]*?)<\/script>/.exec(trackingMapHtml)?.[1]; assert.ok(script);
  assert.doesNotThrow(() => new Function(`return async function(){${script}}`));
});

it('el navegador publica solo después del permiso y deja de escuchar al detener la captura', async () => {
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator'), secure = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext');
  let callback: PositionCallback = () => {}, clears = 0;
  const f = fixture();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: {
    getCurrentPosition(next: PositionCallback) { next({ coords: { latitude: point.latitude, longitude: point.longitude, accuracy: 10 }, timestamp: point.recordedAt } as GeolocationPosition); },
    watchPosition(next: PositionCallback) { callback = next; return 7; }, clearWatch(id: number) { assert.equal(id, 7); clears++; },
  } } });
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
  try {
    const capture = createWebLocationCapture(f.repository); assert.equal((await capture.start(walker.uid, 'walk-1')).ok, true);
    callback({ coords: { latitude: point.latitude, longitude: point.longitude, accuracy: 10, heading: null, speed: null }, timestamp: point.recordedAt } as GeolocationPosition);
    await new Promise((resolve) => setImmediate(resolve)); assert.equal(f.published.length, 1);
    await capture.stop(walker.uid); assert.equal(clears, 1);
    const status = await capture.status(walker.uid); assert.ok(status.ok); assert.equal(status.value.sharing, false);
  } finally {
    if (nav) Object.defineProperty(globalThis, 'navigator', nav); else Reflect.deleteProperty(globalThis, 'navigator');
    if (secure) Object.defineProperty(globalThis, 'isSecureContext', secure); else Reflect.deleteProperty(globalThis, 'isSecureContext');
  }
});
