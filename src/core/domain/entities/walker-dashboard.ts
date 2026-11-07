import type { WalkStatus } from './walk';
import type { RequestStatus } from './walk-request';

export type WalkerRequestSummary = Readonly<{
  id: string; ownerName: string; petIds: readonly string[]; petNames: readonly string[];
  scheduledAt: number | null; durationMinutes: number | null; status: RequestStatus; observations: string;
}>;
export type WalkerWalkSummary = Readonly<{
  id: string; petIds: readonly string[]; petNames: readonly string[];
  scheduledAt: number | null; durationMinutes: number | null; status: WalkStatus;
}>;
export type WalkerDashboard = Readonly<{
  name: string; lastName: string; email: string; phone: string; profileImage: string | null;
  hasWalkerProfile: boolean; available: boolean; rating: number | null; serviceArea: string;
  description: string; pricePerWalk: number | null;
  requests: readonly WalkerRequestSummary[]; walks: readonly WalkerWalkSummary[];
}>;
export function summarizeWalkerDashboard(data: WalkerDashboard) {
  const pending = data.requests.filter((request) => request.status === 'PENDING');
  return {
    pending,
    pendingCount: pending.length,
    scheduledCount: data.walks.filter((walk) => walk.status === 'SCHEDULED').length,
    activeCount: data.walks.filter((walk) => walk.status === 'IN_PROGRESS').length,
    rating: data.rating,
  };
}
