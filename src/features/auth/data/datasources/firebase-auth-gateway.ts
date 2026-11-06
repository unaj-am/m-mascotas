import type { Unsubscribe } from '../../../../shared/types/subscription';
import type { User } from '../../../users/domain/entities/user';
export type AuthIdentity = Readonly<{ uid: string; email: string | null; emailVerified: boolean }>;
export type RegistrationProfileDto = Omit<User, 'id'>;

// Puerto del SDK nativo: permite probar la coordinación sin cargar módulos móviles.
export interface FirebaseAuthGateway {
  currentUser(): AuthIdentity | null;
  observeAuth(listener: (user: AuthIdentity | null) => void): Unsubscribe;
  reloadUser(uid: string): Promise<AuthIdentity | null>;
  getProfileFromServer(uid: string): Promise<unknown>;
  observeProfile(uid: string, listener: (data: unknown) => void, error: (cause: unknown) => void): Unsubscribe;
  signIn(email: string, password: string): Promise<void>;
  createAccount(email: string, password: string): Promise<AuthIdentity>;
  createRegistrationProfile(uid: string, profile: RegistrationProfileDto): Promise<void>;
  deleteAccount(uid: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  sendVerificationEmail(): Promise<void>;
}
