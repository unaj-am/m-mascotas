import { createNativeAuthGateway } from '../core/data/firebase/native-auth-gateway';
import { createFirebaseAuthDataSource } from '../core/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createNativeOwnerDashboardSource } from '../core/data/firebase/native-owner-dashboard-source';
import { createNativeWalkerDashboardSource } from '../core/data/firebase/native-walker-dashboard-source';
export function createNativeApplication() {
  return createApplication(createFirebaseAuthDataSource(createNativeAuthGateway()), createNativeOwnerDashboardSource(), createNativeWalkerDashboardSource());
}
