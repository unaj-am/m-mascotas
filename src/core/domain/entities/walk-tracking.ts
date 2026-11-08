import type { Walk } from './walk';
import type { WalkLocation } from './location';

export type WalkTracking = Readonly<{ walk: Walk; current: WalkLocation | null; history: readonly WalkLocation[];
  loadingLocations: boolean; fromCache: boolean; pendingWrites: boolean }>;
export type LocationCaptureStatus = Readonly<{ walkId: string | null; sharing: boolean; message: string | null }>;
