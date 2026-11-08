import { createWebAuthGateway } from '../core/data/firebase/web-auth-gateway';
import { createFirebaseAuthDataSource } from '../core/data/datasources/firebase-auth-data-source';
import { createApplication } from './create-application';
import { createWebOwnerDashboardSource } from '../core/data/firebase/web-owner-dashboard-source';
import { createWebWalkerDashboardSource } from '../core/data/firebase/web-walker-dashboard-source';
import { createWebPetDataSource } from '../core/data/firebase/web-pet-data-source';
import { createWebWalkBookingSource } from '../core/data/firebase/web-walk-booking-source';
import { createWebWalkLocationSource } from '../core/data/firebase/web-walk-location-source';
import { WalkLocationRepositoryImpl } from '../core/data/repositories/walk-location-repository-impl';
import { createWebLocationCapture } from '../core/data/location/web-location-capture';
export function createPlatformApplication() {
  // El gateway inicializa Firebase antes de construir fuentes que usan getApp().
  const auth = createFirebaseAuthDataSource(createWebAuthGateway());
  const locations = new WalkLocationRepositoryImpl(createWebWalkLocationSource());
  return createApplication(auth, createWebOwnerDashboardSource(), createWebWalkerDashboardSource(), createWebPetDataSource(), createWebWalkBookingSource(), locations, createWebLocationCapture(locations));
}
