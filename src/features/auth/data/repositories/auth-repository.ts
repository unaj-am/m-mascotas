import { success } from '../../../../shared/types/result';
import type { Observer } from '../../../../shared/types/subscription';
import type { Session } from '../../domain/entities/session';
import type { AuthRepository, SignInCredentials } from '../../domain/repositories/auth-repository';
import type { AuthDataSource } from '../datasources/auth-data-source';
import type { RegistrationDetails } from '../../domain/entities/registration';
import { toSession } from '../mappers/session-mapper';
export class DataAuthRepository implements AuthRepository {
  constructor(private readonly source: AuthDataSource) {}
  observeSession(observer: Observer<Session>) {
    return this.source.subscribe((result) => { observer(result.ok ? success(toSession(result.value)) : result); });
  }
  signIn(credentials: SignInCredentials) { return this.source.signIn(credentials); }
  register(details: RegistrationDetails) { return this.source.register(details); }
  signOut() { return this.source.signOut(); }
  refreshSession() { return this.source.refreshSession(); }
  sendPasswordReset(email: string) { return this.source.sendPasswordReset(email); }
  sendVerificationEmail() { return this.source.sendVerificationEmail(); }
}
