import type { Result } from '../../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../../shared/types/subscription';
import type { Session } from '../entities/session';
export type SignInCredentials = Readonly<{ email: string; password: string }>;
export interface AuthRepository {
  observeSession(observer: Observer<Session>): Unsubscribe;
  signIn(credentials: SignInCredentials): Promise<Result<void>>;
  signOut(): Promise<Result<void>>;
  refreshSession(): Promise<Result<void>>;
  sendPasswordReset(email: string): Promise<Result<void>>;
  sendVerificationEmail(): Promise<Result<void>>;
}
