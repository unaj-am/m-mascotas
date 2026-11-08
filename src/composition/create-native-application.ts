import { createNativeAuthGateway } from '../core/data/firebase/native-auth-gateway';
import { createFirebaseAuthDataSource } from '../core/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createNativeOwnerDashboardSource } from '../core/data/firebase/native-owner-dashboard-source';
import { createNativeWalkerDashboardSource } from '../core/data/firebase/native-walker-dashboard-source';
import { createNativePetDataSource } from '../core/data/firebase/native-pet-data-source';
import { createNativeWalkBookingSource } from '../core/data/firebase/native-walk-booking-source';
export function createNativeApplication() {
  return createApplication(createFirebaseAuthDataSource(createNativeAuthGateway()), createNativeOwnerDashboardSource(), createNativeWalkerDashboardSource(), createNativePetDataSource(), createNativeWalkBookingSource());
}
