export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type WalkRequest = Readonly<{
  id: string; ownerId: string; walkerId: string; petIds: readonly string[];
  scheduledAt: number; durationMinutes: number; status: RequestStatus;
  observations: string; ownerName: string; petNames: readonly string[]; petPhotos: readonly string[];
}>;
export type WalkRequestDraft = Readonly<Pick<WalkRequest,
  'id' | 'walkerId' | 'petIds' | 'scheduledAt' | 'durationMinutes' | 'observations'
>>;
export type RequestSide = 'owner' | 'walker';
