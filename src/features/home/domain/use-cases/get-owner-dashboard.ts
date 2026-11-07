import { failure } from '../../../../shared/types/result';
import type { Session } from '../../../auth/domain/entities/session';
import type { OwnerDashboardRepository } from '../repositories/owner-dashboard-repository';

export function createGetOwnerDashboard(repository: OwnerDashboardRepository) {
  return (session: Session) => {
    if (session.status !== 'authenticated') return Promise.resolve(failure('unauthenticated', 'Iniciá sesión para ver tu inicio.'));
    if (session.role !== 'OWNER') return Promise.resolve(failure('forbidden', 'Este espacio es para cuentas de dueño.'));
    return repository.getByOwner(session.uid);
  };
}
