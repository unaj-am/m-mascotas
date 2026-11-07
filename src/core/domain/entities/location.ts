export type WalkLocation = Readonly<{
  latitude: number;
  longitude: number;
  accuracy: number;
  bearing: number | null;
  speed: number | null;
  recordedAt: number;
}>;

export type TrackingPoint = Readonly<{
  pointId: string;
  uid: string;
  walkId: string;
  sessionId: string;
  sequence: number;
  location: WalkLocation;
}>;

export type MatchedRoute = Readonly<{
  segments: readonly Readonly<{
    coordinates: readonly Readonly<{ latitude: number; longitude: number }>[];
    confidence: number | null;
  }>[];
}>;
