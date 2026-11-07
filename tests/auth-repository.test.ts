import { it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthRepositoryImpl } from '../src/core/data/repositories/auth-repository-impl';
import type { AuthDataSource } from '../src/core/data/datasources/auth-data-source';
import { success } from '../src/shared/types/result';

it('el repositorio de Auth transforma DTOs y permite cancelar la suscripción', () => {
  let stopped = false;
  const source: AuthDataSource = {
    subscribe(observer) { observer(success({ kind: 'unverified', uid: 'u1', email: 'a@example.com' })); return () => { stopped = true; }; },
    async signIn() { return success(undefined); },
    async register(details) { return success({ email: details.email, verificationEmailSent: true }); },
    async signOut() { return success(undefined); },
    async refreshSession() { return success(undefined); },
    async sendPasswordReset() { return success(undefined); },
    async sendVerificationEmail() { return success(undefined); },
  };
  let actual: unknown;
  const unsubscribe = new AuthRepositoryImpl(source).observeSession((result) => { actual = result; });
  assert.deepEqual(actual, success({ status: 'needs-verification', uid: 'u1', email: 'a@example.com' }));
  unsubscribe();
  assert.equal(stopped, true);
});
