import type { WalkStatus } from '../../../../core/domain/entities/walk';
import type { WalkRequest } from '../../../../core/domain/entities/walk-request';

export const walkStatusLabels = { SCHEDULED: 'Confirmado', IN_PROGRESS: 'En curso', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado' } satisfies Record<WalkStatus, string>;

// Como en OwnerWalksViewModel.kt: una solicitud aceptada se muestra como paseo.
export const ownerVisibleRequests = (requests: readonly WalkRequest[]) => requests.filter((request) => request.status !== 'ACCEPTED');
