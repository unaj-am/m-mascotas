import type { WalkStatus } from './walk';
import type { RequestStatus } from './walk-request';

export type WalkerRequestSummary = Readonly<{
  id: string; ownerName: string; petIds: readonly string[]; petNames: readonly string[];
  scheduledAt: number | null; durationMinutes: number | null; status: RequestStatus; observations: string;
}>;
export type WalkerWalkSummary = Readonly<{
  id: string; petIds: readonly string[]; petNames: readonly string[];
  scheduledAt: number | null; durationMinutes: number | null; status: WalkStatus;
  startedAt?: number | null; finishedAt?: number | null;
  observations?: string;
}>;
export type WalkerDashboard = Readonly<{
  name: string; lastName: string; email: string; phone: string; profileImage: string | null;
  hasWalkerProfile: boolean; available: boolean; serviceArea: string;
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
  };
}
