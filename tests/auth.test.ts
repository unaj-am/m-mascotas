import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createFirebaseAuthDataSource } from '../src/core/data/datasources/firebase-auth-data-source';
import type { AuthIdentity, FirebaseAuthGateway } from '../src/core/data/datasources/firebase-auth-gateway';
import type { AuthSessionDto } from '../src/core/data/datasources/auth-data-source';
import type { Result } from '../src/shared/types/result';
import { success } from '../src/shared/types/result';
import { createApplication } from '../src/composition/create-application';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const user = (uid = 'owner', verified = true): AuthIdentity => ({ uid, email: uid + '@example.com', emailVerified: verified });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function fixture(initial: AuthIdentity | null = user()) {
  let current = initial;
  let authListener: (identity: AuthIdentity | null) => void = () => {};
  let profileListener: (value: unknown) => void = () => {};
  let profileStops = 0;
  let authStops = 0;
  let profileReads = 0;
  const profiles = new Map<string, unknown>([['owner', { role: 'OWNER', active: true }], ['walker', { role: 'WALKER', active: true }]]);
  const gateway: FirebaseAuthGateway = {
    currentUser: () => current,
    observeAuth(listener) { authListener = listener; listener(current); return () => { authStops++; }; },
    async reloadUser(uid) { return current?.uid === uid ? current : null; },
    async getProfileFromServer(uid) { profileReads++; return profiles.get(uid) ?? null; },
    observeProfile(_uid, listener) { profileListener = listener; return () => { profileStops++; }; },
    async signIn() {}, async signOut() { current = null; authListener(null); },
    async createAccount() { throw new Error('Registro no utilizado en esta prueba.'); },
    async createRegistrationProfile() {}, async deleteAccount() {},
    async sendPasswordReset() {}, async sendVerificationEmail() {},
  };
  const source = createFirebaseAuthDataSource(gateway);
  const events: Result<AuthSessionDto>[] = [];
  const stop = source.subscribe((event) => events.push(event));
  return {
    source, gateway, events, stop, profiles,
    get reads() { return profileReads; }, get profileStops() { return profileStops; }, get authStops() { return authStops; },
    changeUser(identity: AuthIdentity | null) { current = identity; authListener(identity); },
    profileChanged(value: unknown) { profileListener(value); },
  };
}
function last<T>(values: readonly T[]) { return values[values.length - 1]; }

it('una salida que no responde termina con un aviso sin fingir que la sesión se cerró', async (t) => {
  const f = fixture();
  await tick();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  f.gateway.signOut = () => new Promise<void>(() => {});
  const pending = f.source.signOut();
  t.mock.timers.tick(10000);
  const result = await pending;
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.message, /10 segundos/);
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'owner', role: 'OWNER' }));
  f.stop();
});

it('cerrar sesión sale de ambos roles aunque el SDK no entregue el evento de Auth', async () => {
  for (const role of ['owner', 'walker']) {
    const f = fixture(user(role));
    await tick();
    f.gateway.signOut = async () => {};
    const result = await f.source.signOut();
    assert.equal(result.ok, true);
    assert.deepEqual(last(f.events), success({ kind: 'signed-out' }));
    assert.equal(f.profileStops, 1);
    f.profileChanged({ role: 'OWNER', active: true });
    assert.deepEqual(last(f.events), success({ kind: 'signed-out' }));
    f.stop();
  }
});

it('un cierre rechazado por el SDK informa el error y conserva la sesión', async () => {
  const f = fixture();
  await tick();
  f.gateway.signOut = async () => { throw { code: 'auth/network-request-failed' }; };
  const result = await f.source.signOut();
  assert.equal(result.ok, false);
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'owner', role: 'OWNER' }));
  f.stop();
});

it('usa el UID autenticado y el perfil OWNER/WALKER existente', async () => {
  const f = fixture();
  await tick();
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'owner', role: 'OWNER' }));
  f.changeUser(user('walker'));
  await tick();
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'walker', role: 'WALKER' }));
  assert.equal(f.profileStops, 1);
  f.stop();
});
it('correo no verificado no abre el panel ni consulta el perfil', async () => {
  const f = fixture(user('owner', false));
  await tick();
  assert.deepEqual(last(f.events), success({ kind: 'unverified', uid: 'owner', email: 'owner@example.com' }));
  assert.equal(f.reads, 0);
  f.stop();
});
it('la revalidación reconoce un correo verificado sin volver a ingresar', async () => {
  const f = fixture(user('owner', false));
  await tick();
  f.gateway.reloadUser = async () => user();
  await f.source.refreshSession();
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'owner', role: 'OWNER' }));
  f.stop();
});
it('rechaza perfiles ausentes, roles desconocidos y cuentas inactivas; no crea documentos', async () => {
  for (const profile of [null, { role: 'ADMIN', active: true }, { role: 'OWNER', active: false }, { role: 'OWNER', active: 'true' }]) {
    const f = fixture();
    f.profiles.set('owner', profile);
    await tick();
    const result = last(f.events);
    assert.equal(result?.ok, false);
    assert.ok(!f.events.some((event) => event.ok && event.value.kind === 'authorized'));
    f.stop();
  }
});
it('mantiene la compatibilidad Kotlin cuando active no está almacenado', async () => {
  const f = fixture();
  f.profiles.set('owner', { role: 'OWNER' });
  await tick();
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'owner', role: 'OWNER' }));
  f.stop();
});
it('una revocación de cuenta o cambio de rol del servidor actualiza la sesión', async () => {
  const f = fixture();
  await tick();
  f.profileChanged({ role: 'WALKER', active: true });
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'owner', role: 'WALKER' }));
  f.profileChanged({ role: 'WALKER', active: false });
  assert.equal(last(f.events)?.ok, false);
  f.stop();
});
it('cerrar sesión invalida una lectura de perfil que todavía está pendiente', async () => {
  const f = fixture();
  const pending = deferred<unknown>();
  f.gateway.getProfileFromServer = () => pending.promise;
  await tick();
  f.changeUser(null);
  pending.resolve({ role: 'OWNER', active: true });
  await tick();
  assert.deepEqual(last(f.events), success({ kind: 'signed-out' }));
  assert.ok(!f.events.some((event) => event.ok && event.value.kind === 'authorized'));
  f.stop();
});
it('una respuesta tardía de la cuenta anterior no autoriza al usuario nuevo', async () => {
  const f = fixture();
  const pending = deferred<unknown>();
  f.gateway.getProfileFromServer = async (uid) => uid === 'owner' ? pending.promise : { role: 'WALKER', active: true };
  await tick();
  f.changeUser(user('walker'));
  await tick();
  pending.resolve({ role: 'OWNER', active: true });
  await tick();
  assert.deepEqual(last(f.events), success({ kind: 'authorized', uid: 'walker', role: 'WALKER' }));
  f.stop();
});
it('limpia las suscripciones y descarta resultados posteriores al desmontar', async () => {
  const f = fixture();
  const pending = deferred<unknown>();
  f.gateway.getProfileFromServer = () => pending.promise;
  await tick();
  f.stop();
  const count = f.events.length;
  pending.resolve({ role: 'OWNER', active: true });
  await tick();
  assert.equal(f.events.length, count);
  assert.equal(f.authStops, 1);
});
it('un fallo de red nunca convierte una sesión en autenticada', async () => {
  const f = fixture();
  f.gateway.getProfileFromServer = async () => { throw { code: 'firestore/unavailable', message: 'private detail' }; };
  await tick();
  const result = last(f.events);
  assert.equal(result?.ok, false);
  if (result && !result.ok) { assert.equal(result.error.code, 'unavailable'); assert.doesNotMatch(result.error.message, /private/); }
  f.stop();
});
it('valida el correo, recorta sus espacios y conserva la contraseña exacta', async () => {
  const f = fixture(null);
  const app = createApplication(f.source);
  let received: unknown;
  f.gateway.signIn = async (email, password) => { received = { email, password }; };
  assert.equal((await app.auth.signIn({ email: 'invalid', password: 'secret' })).ok, false);
  assert.equal(received, undefined);
  assert.equal((await app.auth.signIn({ email: ' owner@example.com ', password: ' spaced password ' })).ok, true);
  assert.deepEqual(received, { email: 'owner@example.com', password: ' spaced password ' });
  f.stop();
});
it('errores de credenciales no revelan si el usuario existe ni detalles del SDK', async () => {
  const f = fixture(null);
  f.gateway.signIn = async () => { throw { code: 'auth/user-not-found', message: 'private detail' }; };
  const result = await f.source.signIn({ email: 'owner@example.com', password: 'secret' });
  assert.equal(result.ok, false);
  if (!result.ok) { assert.equal(result.error.code, 'unauthenticated'); assert.doesNotMatch(result.error.message, /private|no existe/); }
  f.stop();
});
