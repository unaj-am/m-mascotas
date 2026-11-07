import { createWebAuthGateway } from '../features/auth/data/firebase/web-auth-gateway';
import { createFirebaseAuthDataSource } from '../features/auth/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createWebOwnerDashboardSource } from '../features/home/data/firebase/web-owner-dashboard-source';
import { createWebWalkerDashboardSource } from '../features/home/data/firebase/web-walker-dashboard-source';
export function createPlatformApplication() {
  return createApplication(createFirebaseAuthDataSource(createWebAuthGateway()), createWebOwnerDashboardSource(), createWebWalkerDashboardSource());
}
