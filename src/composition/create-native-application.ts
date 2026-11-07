import { createNativeAuthGateway } from '../features/auth/data/firebase/native-auth-gateway';
import { createFirebaseAuthDataSource } from '../features/auth/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createNativeOwnerDashboardSource } from '../features/home/data/firebase/native-owner-dashboard-source';
import { createNativeWalkerDashboardSource } from '../features/home/data/firebase/native-walker-dashboard-source';
export function createNativeApplication() {
  return createApplication(createFirebaseAuthDataSource(createNativeAuthGateway()), createNativeOwnerDashboardSource(), createNativeWalkerDashboardSource());
}
