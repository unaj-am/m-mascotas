import { failure, type Result } from '../../../shared/types/result';
export function authFailure(error: unknown): Result<never> {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'auth/email-already-in-use') return failure('conflict', 'No pudimos crear la cuenta con ese correo. Probá iniciar sesión o recuperar la contraseña.');
  if (['auth/weak-password', 'auth/password-does-not-meet-requirements'].includes(code)) return failure('validation', 'La contraseña no cumple los requisitos de seguridad. Probá una más larga con letras, números y símbolos.');
  if (code === 'auth/operation-not-allowed') return failure('forbidden', 'El registro con correo y contraseña no está habilitado en Firebase.');
  if (code === 'registration/profile-exists') return failure('conflict', 'Ya existe un perfil para esa cuenta. No se reemplazó.');
  if (['auth/invalid-credential','auth/invalid-login-credentials','auth/wrong-password','auth/user-not-found','auth/invalid-email'].includes(code)) {
    return failure('unauthenticated', 'No pudimos iniciar sesión. Revisá el correo y la contraseña.');
  }
  if (code === 'auth/user-disabled') return failure('forbidden', 'Tu cuenta está deshabilitada.');
  if (code === 'auth/too-many-requests') return failure('unavailable', 'Hubo demasiados intentos. Esperá un momento y volvé a probar.');
  if (['auth/network-request-failed','firestore/unavailable','unavailable','firestore/deadline-exceeded'].includes(code)) {
    return failure('unavailable', 'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.');
  }
  if (['firestore/permission-denied','permission-denied'].includes(code)) {
    return failure('forbidden', 'Firebase no permite consultar tu perfil. Revisá los permisos de tu cuenta.');
  }
  return failure('unexpected', 'No pudimos completar la operación. Intentá nuevamente.');
}
