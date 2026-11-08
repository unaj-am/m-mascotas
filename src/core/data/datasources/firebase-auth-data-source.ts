import { failure, success, type Result } from '../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';
import type { AuthDataSource, AuthSessionDto } from './auth-data-source';
import type { AuthIdentity, FirebaseAuthGateway } from './firebase-auth-gateway';
import { authFailure } from '../mappers/auth-error-mapper';
import { profileSession } from '../mappers/profile-session-mapper';
import { registerFirebaseUser } from './firebase-registration';

export function createFirebaseAuthDataSource(gateway: FirebaseAuthGateway): AuthDataSource {
  const observers = new Set<Observer<AuthSessionDto>>();
  let authSubscription: Unsubscribe | undefined;
  let profileSubscription: Unsubscribe | undefined;
  let version = 0;
  let registering = false;
  let signingIn = false;
  let latest: Result<AuthSessionDto> = success({ kind: 'loading' });
  function emit(value: Result<AuthSessionDto>) {
    latest = value;
    for (const observer of observers) observer(value);
  }
  async function validate(identity: AuthIdentity | null): Promise<Result<void>> {
    // createUser autentica automáticamente: esperar a que termine el perfil.
    if (registering) return success(undefined);
    const current = ++version;
    profileSubscription?.();
    profileSubscription = undefined;
    const alive = () => current === version && observers.size > 0;
    if (!identity) { emit(success({ kind: 'signed-out' })); return success(undefined); }
    // Revalidar al volver de Ajustes de GPS no debe desmontar el paseo activo.
    // Una cuenta distinta sigue entrando en loading para no mostrar datos del usuario anterior.
    if (!latest.ok || latest.value.kind !== 'authorized' || latest.value.uid !== identity.uid) emit(success({ kind: 'loading' }));
    try {
      const user = await gateway.reloadUser(identity.uid);
      if (!alive()) return success(undefined);
      if (!user || user.uid !== identity.uid) {
        const result = failure('unauthenticated', 'La sesión cambió. Volvé a iniciar sesión.');
        emit(result);
        return result;
      }
      if (!user.emailVerified) {
        emit(success({ kind: 'unverified', uid: user.uid, email: user.email ?? '' }));
        return success(undefined);
      }
      const profile = await gateway.getProfileFromServer(user.uid);
      if (!alive()) return success(undefined);
      const result = profileSession(user.uid, profile);
      emit(result);
      // Se observa incluso una cuenta inactiva/perfil ausente para recuperar cambios autorizados.
      const unsubscribe = gateway.observeProfile(user.uid, (data) => {
        if (alive()) emit(profileSession(user.uid, data));
      }, (error) => { if (alive()) emit(authFailure(error)); });
      if (alive()) profileSubscription = unsubscribe;
      else unsubscribe();
      return result.ok ? success(undefined) : result;
    } catch (error) {
      const result = authFailure(error);
      if (alive()) emit(result);
      return result;
    }
  }
  async function perform(work: () => Promise<void>): Promise<Result<void>> {
    try { await work(); return success(undefined); }
    catch (error) { return authFailure(error); }
  }
  return {
    subscribe(observer) {
      observers.add(observer);
      observer(latest);
      if (!authSubscription) authSubscription = gateway.observeAuth((user) => { void validate(user); });
      return () => {
        observers.delete(observer);
        if (!observers.size) {
          version++;
          authSubscription?.();
          profileSubscription?.();
          authSubscription = profileSubscription = undefined;
          latest = success({ kind: 'loading' });
        }
      };
    },
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
      ++version;
      profileSubscription?.();
      profileSubscription = undefined;
      try { return await registerFirebaseUser(gateway, details); }
      finally {
        registering = false;
        await validate(gateway.currentUser());
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
      if (result.ok) await validate(null);
      return result;
    },
    refreshSession: () => validate(gateway.currentUser()),
    sendPasswordReset: (email) => perform(() => gateway.sendPasswordReset(email)),
    sendVerificationEmail: () => perform(() => gateway.sendVerificationEmail()),
  };
}
