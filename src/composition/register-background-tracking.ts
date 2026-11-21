import { registerNativeLocationTask } from '../core/data/location/native-location-task';
import { WalkLocationRepositoryImpl } from '../core/data/repositories/walk-location-repository-impl';
import { createNativeWalkLocationSource } from '../core/data/firebase/native-walk-location-source';

registerNativeLocationTask(() => new WalkLocationRepositoryImpl(createNativeWalkLocationSource()));
