import type { WalkStatus } from '../../../walks/domain/entities/walk';

export type OwnerPetSummary = Readonly<{
  id: string; name: string; breed: string; photoUri: string | null; age: number | null;
}>;
export type OwnerWalkSummary = Readonly<{
  id: string; petIds: readonly string[]; status: WalkStatus; scheduledAt: number | null;
  durationMinutes: number | null;
}>;
export type OwnerDashboard = Readonly<{
  name: string; lastName: string; email: string; phone: string; profileImage?: string | null;
  pets: readonly OwnerPetSummary[]; walks: readonly OwnerWalkSummary[];
}>;

export function summarizeOwnerDashboard(data: OwnerDashboard, now = Date.now()) {
  const upcoming = data.walks.filter((walk) => walk.status === 'SCHEDULED' && walk.scheduledAt !== null && walk.scheduledAt >= now)
    .sort((left, right) => (left.scheduledAt ?? 0) - (right.scheduledAt ?? 0));
  const active = data.walks.filter((walk) => walk.status === 'IN_PROGRESS');
  return {
    petsCount: data.pets.length,
    upcomingCount: upcoming.length,
    completedCount: data.walks.filter((walk) => walk.status === 'COMPLETED').length,
    nextWalk: active[0] ?? upcoming[0] ?? null,
  };
}
