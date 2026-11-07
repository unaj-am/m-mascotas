import { failure } from '../../../shared/types/result';
import type { Session } from '../entities/session';
import type { WalkerDashboardRepository } from '../repositories/walker-dashboard-repository';

export function createWalkerDashboardUseCases(repository: WalkerDashboardRepository) {
  return {
    getDashboard(session: Session) {
      if (session.status !== 'authenticated') return Promise.resolve(failure('unauthenticated', 'Iniciá sesión para ver tu inicio.'));
      if (session.role !== 'WALKER') return Promise.resolve(failure('forbidden', 'Este espacio es para cuentas de paseador.'));
      return repository.getByWalker(session.uid);
    },
    updateAvailability(session: Session, available: boolean) {
      if (session.status !== 'authenticated' || session.role !== 'WALKER') return Promise.resolve(failure('forbidden', 'No podés cambiar la disponibilidad de un paseador.'));
      if (typeof available !== 'boolean') return Promise.resolve(failure('validation', 'Elegí una disponibilidad válida.'));
      return repository.updateAvailability(session.uid, available);
    },
  };
}
