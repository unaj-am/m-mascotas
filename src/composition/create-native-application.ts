import { createNativeAuthGateway } from '../features/auth/data/firebase/native-auth-gateway';
import { createFirebaseAuthDataSource } from '../features/auth/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
export function createNativeApplication() {
  return createApplication(createFirebaseAuthDataSource(createNativeAuthGateway()));
}
