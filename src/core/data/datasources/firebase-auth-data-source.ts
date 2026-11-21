import { failure, success, type Result } from '../../../shared/types/result';
import type { AuthDataSource } from './auth-data-source';
import type { FirebaseAuthGateway } from './firebase-auth-gateway';
import { authFailure } from '../mappers/auth-error-mapper';
import { createFirebaseSessionObserver } from './observe-firebase-session';
import { registerFirebaseUser } from './firebase-registration';

export function createFirebaseAuthDataSource(gateway: FirebaseAuthGateway): AuthDataSource {
  let registering = false;
  let signingIn = false;
  const session = createFirebaseSessionObserver(gateway, () => registering);

  async function perform(work: () => Promise<void>): Promise<Result<void>> {
    try { await work(); return success(undefined); }
    catch (error) { return authFailure(error); }
  }
  return {
    subscribe: session.subscribe,
    async signIn({ email, password }) {
      if (registering || signingIn) return failure('unavailable', 'Esperá a que termine la operación actual.');
      signingIn = true;
      try { return await perform(() => gateway.signIn(email, password)); }
      finally { signingIn = false; }
    },
    async register(details) {
      if (registering || signingIn) return failure('unavailable', 'Esperá a que termine la operación actual.');
      if (gateway.currentUser()) return failure('conflict', 'Cerrá la sesión actual antes de crear otra cuenta.');
      registering = true;
      session.invalidateProfile();
      try { return await registerFirebaseUser(gateway, details); }
      finally {
        registering = false;
        await session.validate(gateway.currentUser());
      }
    },
    async signOut() {
      if (registering) return failure('unavailable', 'Esperá a que termine el registro.');
      let result: Result<void>;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          gateway.signOut(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject({ code: 'auth/sign-out-timeout' }), 10000);
          }),
        ]);
        result = success(undefined);
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'auth/sign-out-timeout') {
          return failure('unavailable', 'Firebase no confirmó el cierre de sesión en 10 segundos. Cerrá y volvé a abrir Mascotas antes de reintentar.');
        }
        result = authFailure(error);
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
      // El SDK puede resolver antes de entregar onAuthStateChanged.
      // Confirmar la salida sin depender de ese evento también cancela el perfil.
      if (result.ok) await session.validate(null);
      return result;
    },
    refreshSession: () => session.validate(gateway.currentUser()),
    sendPasswordReset: (email) => perform(() => gateway.sendPasswordReset(email)),
    sendVerificationEmail: () => perform(() => gateway.sendVerificationEmail()),
  };
}
