import { failure } from '../../../../shared/types/result';
import type { AuthRepository, SignInCredentials } from '../repositories/auth-repository';
import { createRegisterUser } from './register-user';
function emailValid(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function createAuthUseCases(repository: AuthRepository) {
  return {
    register: createRegisterUser(repository),
    async signIn(input: SignInCredentials) {
      const email = input.email.trim();
      if (!emailValid(email) || !input.password) return failure('validation', 'Completá un correo válido y tu contraseña.');
      // Nunca recortar ni alterar la contraseña.
      return repository.signIn({ email, password: input.password });
    },
    signOut: () => repository.signOut(),
    refreshSession: () => repository.refreshSession(),
    async sendPasswordReset(input: string) {
      const email = input.trim();
      if (!emailValid(email)) return failure('validation', 'Ingresá un correo válido.');
      return repository.sendPasswordReset(email);
    },
    sendVerificationEmail: () => repository.sendVerificationEmail(),
  };
}
