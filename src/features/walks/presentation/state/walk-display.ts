import type { WalkStatus } from '../../../../core/domain/entities/walk';
import type { WalkRequest } from '../../../../core/domain/entities/walk-request';
import type { OwnerWalkSummary } from '../../../../core/domain/entities/owner-dashboard';

export const walkStatusLabels = { SCHEDULED: 'Confirmado', IN_PROGRESS: 'En curso', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado' } satisfies Record<WalkStatus, string>;

// Como en OwnerWalksViewModel.kt: una solicitud aceptada se muestra como paseo.
export const ownerVisibleRequests = (requests: readonly WalkRequest[]) => requests.filter((request) => request.status !== 'ACCEPTED');

export function orderOwnerWalks<T extends OwnerWalkSummary>(walks: readonly T[]): T[] {
  const priority = { IN_PROGRESS: 0, SCHEDULED: 1, COMPLETED: 2, CANCELLED: 3 };
  return [...walks].sort((a, b) => priority[a.status] - priority[b.status] ||
    (a.status === 'COMPLETED' || a.status === 'CANCELLED' ? (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0) : (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity)) || a.id.localeCompare(b.id));
}
