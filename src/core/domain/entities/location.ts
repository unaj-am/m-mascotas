export type WalkLocation = Readonly<{
  latitude: number;
  longitude: number;
  accuracy: number;
  bearing: number | null;
  speed: number | null;
  recordedAt: number;
}>;
