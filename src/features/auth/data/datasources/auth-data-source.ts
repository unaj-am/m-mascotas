import type { Result } from '../../../../shared/types/result';
import type { Observer, Unsubscribe } from '../../../../shared/types/subscription';
import type { UserRole } from '../../../users/domain/entities/user-role';
import type { SignInCredentials } from '../../domain/repositories/auth-repository';
import type { RegistrationDetails, RegistrationReceipt } from '../../domain/entities/registration';
export type AuthSessionDto =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'signed-out' }>
  | Readonly<{ kind: 'unverified'; uid: string; email: string }>
  | Readonly<{ kind: 'authorized'; uid: string; role: UserRole }>;
export interface AuthDataSource {
  subscribe(observer: Observer<AuthSessionDto>): Unsubscribe;
  signIn(credentials: SignInCredentials): Promise<Result<void>>;
  register(details: RegistrationDetails): Promise<Result<RegistrationReceipt>>;
  signOut(): Promise<Result<void>>;
  refreshSession(): Promise<Result<void>>;
  sendPasswordReset(email: string): Promise<Result<void>>;
  sendVerificationEmail(): Promise<Result<void>>;
}
