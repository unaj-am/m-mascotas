import { failure, success, type Result } from '../../../shared/types/result';
import type { RegistrationDetails, RegistrationReceipt } from '../../domain/entities/registration';
import type { FirebaseAuthGateway } from './firebase-auth-gateway';
import { authFailure } from '../mappers/auth-error-mapper';

export async function registerFirebaseUser(
  gateway: FirebaseAuthGateway, details: RegistrationDetails,
): Promise<Result<RegistrationReceipt>> {
  let uid: string;
  try {
    const user = await gateway.createAccount(details.email, details.password);
    uid = user.uid;
  } catch (error) { return authFailure(error); }

  try {
    await gateway.createRegistrationProfile(uid, {
      name: details.name, lastName: details.lastName, phone: details.phone,
      email: details.email, role: details.role, profileImage: null, active: true,
    });
  } catch (error) {
    // Compensar solo la cuenta recién creada, nunca una cuenta preexistente.
    try { await gateway.deleteAccount(uid); }
    catch {
      return failure('unexpected', 'La cuenta se creó, pero no pudimos completar el perfil ni revertir el registro. No vuelvas a crearla con el mismo correo; contactá al administrador.');
    }
    if (typeof error === 'object' && error && 'code' in error &&
        ['permission-denied', 'firestore/permission-denied'].includes(String(error.code))) {
      return failure('forbidden', 'No se completó el registro porque Firebase no permite crear tu perfil. La cuenta nueva fue revertida.');
    }
    return authFailure(error);
  }

  let verificationEmailSent = true;
  try {
    if (gateway.currentUser()?.uid !== uid) throw new Error('La sesión cambió durante el registro.');
    await gateway.sendVerificationEmail();
  }
  catch { verificationEmailSent = false; }
  // Un fallo del correo no elimina una cuenta cuyo perfil ya fue guardado.
  return success({ email: details.email, verificationEmailSent });
}
