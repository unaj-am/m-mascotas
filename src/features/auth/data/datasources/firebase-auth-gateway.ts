import type { Unsubscribe } from '../../../../shared/types/subscription';
export type AuthIdentity = Readonly<{ uid: string; email: string | null; emailVerified: boolean }>;

// Puerto del SDK nativo: permite probar la coordinación sin cargar módulos móviles.
export interface FirebaseAuthGateway {
  currentUser(): AuthIdentity | null;
  observeAuth(listener: (user: AuthIdentity | null) => void): Unsubscribe;
  reloadUser(uid: string): Promise<AuthIdentity | null>;
  getProfileFromServer(uid: string): Promise<unknown>;
  observeProfile(uid: string, listener: (data: unknown) => void, error: (cause: unknown) => void): Unsubscribe;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  sendVerificationEmail(): Promise<void>;
}
