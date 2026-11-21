import { failure, success, type Result } from '../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../shared/types/subscription';
import type { AuthDataSource, AuthSessionDto } from './auth-data-source';
import type { AuthIdentity, FirebaseAuthGateway } from './firebase-auth-gateway';
import { authFailure } from '../mappers/auth-error-mapper';
import { profileSession } from '../mappers/profile-session-mapper';

export function createFirebaseSessionObserver(gateway: FirebaseAuthGateway, isRegistering: () => boolean) {
  const observers = new Set<Observer<AuthSessionDto>>();
  let authSubscription: Unsubscribe | undefined;
  let profileSubscription: Unsubscribe | undefined;
  let version = 0;
  let latest: Result<AuthSessionDto> = success({ kind: 'loading' });
  function emit(value: Result<AuthSessionDto>) {
    latest = value;
    for (const observer of observers) observer(value);
  }
  async function validate(identity: AuthIdentity | null): Promise<Result<void>> {
    // createUser autentica automáticamente: esperar a que termine el perfil.
    if (isRegistering()) return success(undefined);
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
  const subscribe: AuthDataSource['subscribe'] = (observer) => {
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
  };

  function invalidateProfile() {
    ++version;
    profileSubscription?.();
    profileSubscription = undefined;
  }

  return { subscribe, validate, invalidateProfile };
}
