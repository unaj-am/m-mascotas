import { createNativeAuthGateway } from '../core/data/firebase/native-auth-gateway';
import { createFirebaseAuthDataSource } from '../core/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createNativeOwnerDashboardSource } from '../core/data/firebase/native-owner-dashboard-source';
import { createNativeWalkerDashboardSource } from '../core/data/firebase/native-walker-dashboard-source';
import { createNativePetDataSource } from '../core/data/firebase/native-pet-data-source';
import { createNativeWalkBookingSource } from '../core/data/firebase/native-walk-booking-source';
import { createNativeWalkLocationSource } from '../core/data/firebase/native-walk-location-source';
import { WalkLocationRepositoryImpl } from '../core/data/repositories/walk-location-repository-impl';
import { createNativeLocationCapture } from '../core/data/location/native-location-capture';
export function createNativeApplication() {
  const auth = createFirebaseAuthDataSource(createNativeAuthGateway());
  const locations = new WalkLocationRepositoryImpl(createNativeWalkLocationSource());
  return createApplication(auth, createNativeOwnerDashboardSource(), createNativeWalkerDashboardSource(), createNativePetDataSource(), createNativeWalkBookingSource(), locations, createNativeLocationCapture());
}
