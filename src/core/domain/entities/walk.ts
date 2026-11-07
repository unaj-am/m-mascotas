export type WalkStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type Walk = Readonly<{
  id: string;
  ownerId: string;
  walkerId: string;
  petIds: readonly string[];
  scheduledAt: number;
  durationMinutes: number;
  status: WalkStatus;
  startedAt: number | null;
  finishedAt: number | null;
  distanceKm: number | null;
  observations: string;
}>;
