export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type WalkRequest = Readonly<{
  id: string; ownerId: string; walkerId: string; petIds: readonly string[];
  scheduledAt: number; durationMinutes: number; status: RequestStatus;
  observations: string; ownerName: string; petNames: readonly string[]; petPhotos: readonly string[];
}>;
export type CreateWalkRequest = Pick<WalkRequest,
  'id' | 'ownerId' | 'walkerId' | 'petIds' | 'scheduledAt' | 'durationMinutes' | 'observations' | 'status'
>;
