import { createWebAuthGateway } from '../core/data/firebase/web-auth-gateway';
import { createFirebaseAuthDataSource } from '../core/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createWebOwnerDashboardSource } from '../core/data/firebase/web-owner-dashboard-source';
import { createWebWalkerDashboardSource } from '../core/data/firebase/web-walker-dashboard-source';
export function createPlatformApplication() {
  return createApplication(createFirebaseAuthDataSource(createWebAuthGateway()), createWebOwnerDashboardSource(), createWebWalkerDashboardSource());
}
