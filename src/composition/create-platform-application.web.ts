import { createWebAuthGateway } from '../features/auth/data/firebase/web-auth-gateway';
import { createFirebaseAuthDataSource } from '../features/auth/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
export function createPlatformApplication() {
  return createApplication(createFirebaseAuthDataSource(createWebAuthGateway()));
}
