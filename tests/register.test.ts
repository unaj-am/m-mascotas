import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../src/composition/create-application';
import { createFirebaseAuthDataSource } from '../src/features/auth/data/datasources/firebase-auth-data-source';
import type { FirebaseAuthGateway, AuthIdentity, RegistrationProfileDto } from '../src/features/auth/data/datasources/firebase-auth-gateway';
import type { RegistrationInput } from '../src/features/auth/domain/entities/registration';
import type { AuthSessionDto } from '../src/features/auth/data/datasources/auth-data-source';
import type { Result } from '../src/shared/types/result';
import { success } from '../src/shared/types/result';

const input: RegistrationInput = {
  name: ' Ana ', lastName: ' Pérez ', phone: ' +54 11 1234-5678 ',
  email: ' ana@example.com ', password: ' clave 123 ', confirmPassword: ' clave 123 ', role: 'OWNER',
};
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function fixture() {
  let current: AuthIdentity | null = null;
  let listener: (user: AuthIdentity | null) => void = () => {};
  let accountCalls = 0;
  let profileCalls = 0;
  let deleteCalls = 0;
  let verificationCalls = 0;
  let receivedPassword = '';
  let savedProfile: RegistrationProfileDto | undefined;
  let blockProfile: Promise<void> | undefined;
  let blockSignIn: Promise<void> | undefined;
  let accountError: unknown;
  let profileError: unknown;
  let deleteError: unknown;
  let emailError: unknown;
  const events: Result<AuthSessionDto>[] = [];
  const gateway: FirebaseAuthGateway = {
    currentUser: () => current,
    observeAuth(callback) { listener = callback; listener(current); return () => { listener = () => {}; }; },
    async reloadUser(uid) { return current?.uid === uid ? current : null; },
    async getProfileFromServer() { return savedProfile ?? null; },
    observeProfile() { return () => {}; },
    async signIn() { await blockSignIn; },
    async signOut() { current = null; listener(null); },
    async createAccount(email, password) {
      accountCalls++;
      if (accountError) throw accountError;
      receivedPassword = password;
      current = { uid: 'new-user', email, emailVerified: false };
      listener(current);
      return current;
    },
    async createRegistrationProfile(uid, profile) {
      profileCalls++;
      assert.equal(uid, 'new-user');
      await blockProfile;
      if (profileError) throw profileError;
      savedProfile = profile;
    },
    async deleteAccount(uid) {
      deleteCalls++;
      assert.equal(uid, 'new-user');
      if (deleteError) throw deleteError;
      current = null;
      listener(null);
    },
    async sendVerificationEmail() { verificationCalls++; if (emailError) throw emailError; },
    async sendPasswordReset() {},
  };
  const source = createFirebaseAuthDataSource(gateway);
  const app = createApplication(source);
  const stop = source.subscribe((value) => events.push(value));
  return {
    app, source, events, stop,
    get accountCalls() { return accountCalls; }, get profileCalls() { return profileCalls; },
    get deleteCalls() { return deleteCalls; }, get verificationCalls() { return verificationCalls; },
    get password() { return receivedPassword; }, get profile() { return savedProfile; },
    failAccount(value: unknown) { accountError = value; },
    failProfile(value: unknown) { profileError = value; },
    failDelete(value: unknown) { deleteError = value; },
    failEmail(value: unknown) { emailError = value; },
    waitForProfile(promise: Promise<void>) { blockProfile = promise; },
    waitForSignIn(promise: Promise<void>) { blockSignIn = promise; },
    changeUser(user: AuthIdentity) { current = user; listener(user); },
  };
}

it('registra ambos roles con el esquema Kotlin y sin guardar contraseñas en Firestore', async () => {
  for (const role of ['OWNER', 'WALKER'] as const) {
    const f = fixture();
    const result = await f.app.auth.register({ ...input, role });
    assert.deepEqual(result, success({ email: 'ana@example.com', verificationEmailSent: true }));
    assert.deepEqual(f.profile, {
      name: 'Ana', lastName: 'Pérez', phone: '+54 11 1234-5678', email: 'ana@example.com',
      profileImage: null, active: true, role,
    });
    assert.equal(f.password, input.password);
    assert.equal(f.verificationCalls, 1);
    assert.equal(f.deleteCalls, 0);
    assert.deepEqual(f.events.at(-1), success({ kind: 'unverified', uid: 'new-user', email: 'ana@example.com' }));
    assert.ok(!f.events.some((event) => event.ok && event.value.kind === 'authorized'));
    f.stop();
  }
});

it('valida los datos antes de crear una cuenta remota', async () => {
  for (const invalid of [
    { name: ' ' }, { lastName: '' }, { email: 'incorrecto' }, { phone: '123' }, { phone: 'abcdefgh12345678' },
    { password: '12345', confirmPassword: '12345' }, { password: '      ', confirmPassword: '      ' },
    { confirmPassword: 'otra' }, { role: 'ADMIN' as RegistrationInput['role'] },
  ]) {
    const f = fixture();
    const result = await f.app.auth.register({ ...input, ...invalid });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'validation');
    assert.equal(f.accountCalls, 0);
    f.stop();
  }
});

it('no publica la autenticación automática del SDK hasta terminar el perfil', async () => {
  const f = fixture();
  const pending = deferred();
  f.waitForProfile(pending.promise);
  const registration = f.app.auth.register(input);
  await tick();
  assert.equal(f.profileCalls, 1);
  assert.equal(f.verificationCalls, 0);
  assert.deepEqual(f.events.at(-1), success({ kind: 'signed-out' }));
  await f.app.auth.refreshSession();
  assert.deepEqual(f.events.at(-1), success({ kind: 'signed-out' }));
  pending.resolve();
  assert.equal((await registration).ok, true);
  f.stop();
});

it('impide envíos simultáneos y cambios de sesión mientras se guarda el registro', async () => {
  const f = fixture();
  const pending = deferred();
  f.waitForProfile(pending.promise);
  const first = f.app.auth.register(input);
  await tick();
  assert.equal((await f.app.auth.register(input)).ok, false);
  assert.equal((await f.app.auth.signOut()).ok, false);
  assert.equal((await f.app.auth.signIn({ email: input.email, password: input.password })).ok, false);
  assert.equal(f.accountCalls, 1);
  pending.resolve();
  await first;
  f.stop();
});

it('un correo duplicado no escribe perfiles ni elimina cuentas existentes', async () => {
  const f = fixture();
  f.failAccount({ code: 'auth/email-already-in-use', message: 'private SDK detail' });
  const result = await f.app.auth.register(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'conflict');
    assert.doesNotMatch(result.error.message, /private/);
  }
  assert.equal(f.profileCalls, 0);
  assert.equal(f.deleteCalls, 0);
  f.stop();
});

it('si Firestore rechaza el perfil revierte únicamente la cuenta nueva', async () => {
  const f = fixture();
  f.failProfile({ code: 'firestore/permission-denied' });
  const result = await f.app.auth.register(input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'forbidden');
  assert.equal(f.deleteCalls, 1);
  assert.equal(f.verificationCalls, 0);
  assert.deepEqual(f.events.at(-1), success({ kind: 'signed-out' }));
  f.stop();
});

it('un fallo del correo conserva la cuenta creada y permite reenviar la verificación', async () => {
  const f = fixture();
  f.failEmail({ code: 'auth/too-many-requests' });
  const result = await f.app.auth.register(input);
  assert.deepEqual(result, success({ email: 'ana@example.com', verificationEmailSent: false }));
  assert.ok(f.profile);
  assert.equal(f.deleteCalls, 0);
  f.failEmail(undefined);
  assert.equal((await f.app.auth.sendVerificationEmail()).ok, true);
  assert.equal(f.verificationCalls, 2);
  f.stop();
});

it('informa una creación parcial cuando tampoco puede revertir la cuenta', async () => {
  const f = fixture();
  f.failProfile({ code: 'firestore/unavailable' });
  f.failDelete({ code: 'auth/network-request-failed' });
  const result = await f.app.auth.register(input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.message, /No vuelvas a crearla/);
  assert.equal(f.verificationCalls, 0);
  assert.ok(!f.events.some((event) => event.ok && event.value.kind === 'authorized'));
  f.stop();
});

it('no crea otra cuenta si ya existe una sesión', async () => {
  const f = fixture();
  f.changeUser({ uid: 'existing', email: 'old@example.com', emailVerified: false });
  await tick();
  assert.equal((await f.app.auth.register(input)).ok, false);
  assert.equal(f.accountCalls, 0);
  assert.equal(f.deleteCalls, 0);
  f.stop();
});

it('no registra una cuenta mientras el ingreso anterior está pendiente', async () => {
  const f = fixture();
  const pending = deferred();
  f.waitForSignIn(pending.promise);
  const signingIn = f.app.auth.signIn({ email: 'old@example.com', password: '123456' });
  assert.equal((await f.app.auth.register(input)).ok, false);
  assert.equal(f.accountCalls, 0);
  pending.resolve();
  await signingIn;
  f.stop();
});

it('no envía un correo a otra cuenta si la sesión cambia durante el registro', async () => {
  const f = fixture();
  const pending = deferred();
  f.waitForProfile(pending.promise);
  const registration = f.app.auth.register(input);
  await tick();
  f.changeUser({ uid: 'other-account', email: 'other@example.com', emailVerified: false });
  pending.resolve();
  assert.deepEqual(await registration, success({ email: 'ana@example.com', verificationEmailSent: false }));
  assert.equal(f.verificationCalls, 0);
  assert.equal(f.deleteCalls, 0);
  f.stop();
});

it('respeta una política de contraseñas del servidor más estricta que la validación local', async () => {
  const f = fixture();
  f.failAccount({ code: 'auth/password-does-not-meet-requirements', message: 'private SDK detail' });
  const result = await f.app.auth.register(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'validation');
    assert.doesNotMatch(result.error.message, /private/);
  }
  assert.equal(f.profileCalls, 0);
  f.stop();
});
