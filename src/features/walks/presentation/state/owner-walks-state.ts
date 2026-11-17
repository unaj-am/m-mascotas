import type { OwnerWalkSummary } from '../../../../core/domain/entities/owner-dashboard';
import type { WalkRequest } from '../../../../core/domain/entities/walk-request';
import { ownerVisibleRequests } from './walk-display';

// Mismos filtros y secciones que OwnerWalksUiState.kt y OwnerWalksFilterBar.kt.
export const ownerWalkFilters = [
  { id: 'ALL', label: 'Todas' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'REJECTED', label: 'Rechazadas' },
  { id: 'SCHEDULED', label: 'Confirmados' },
  { id: 'IN_PROGRESS', label: 'En curso' },
  { id: 'COMPLETED', label: 'Finalizados' },
  { id: 'CANCELLED', label: 'Cancelados' },
] as const;
export type OwnerWalkFilter = typeof ownerWalkFilters[number]['id'];

export function selectOwnerWalks(walks: readonly OwnerWalkSummary[], requests: readonly WalkRequest[], filter: OwnerWalkFilter) {
  const visibleRequests = ownerVisibleRequests(requests);
  const counts: Record<OwnerWalkFilter, number> = {
    ALL: walks.length + visibleRequests.length,
    PENDING: visibleRequests.filter((item) => item.status === 'PENDING').length,
    REJECTED: visibleRequests.filter((item) => item.status === 'REJECTED').length,
    SCHEDULED: walks.filter((item) => item.status === 'SCHEDULED').length,
    IN_PROGRESS: walks.filter((item) => item.status === 'IN_PROGRESS').length,
    COMPLETED: walks.filter((item) => item.status === 'COMPLETED').length,
    CANCELLED: walks.filter((item) => item.status === 'CANCELLED').length + visibleRequests.filter((item) => item.status === 'CANCELLED').length,
  };
  const newestFirst = (a: { scheduledAt: number | null }, b: { scheduledAt: number | null }) => (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0);
  const filteredWalks = walks.filter((item) => filter === 'ALL' || item.status === filter).sort(newestFirst);
  return {
    counts,
    requests: visibleRequests.filter((item) => filter === 'ALL' || item.status === filter).sort(newestFirst),
    upcoming: filteredWalks.filter((item) => item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS'),
    history: filteredWalks.filter((item) => item.status === 'COMPLETED' || item.status === 'CANCELLED'),
  };
}
