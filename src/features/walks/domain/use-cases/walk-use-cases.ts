import { failure, type Result } from '../../../../shared/types/result';
import type { Session } from '../../../auth/domain/entities/session';
import type { CreateWalkRequest } from '../entities/walk-request';
import type { WalkRequestRepository } from '../repositories/walk-request-repository';
import type { WalkRepository } from '../repositories/walk-repository';

export function createWalkUseCases(requests: WalkRequestRepository, walks: WalkRepository, session: () => Session | null) {
  async function authenticated<T>(work: (uid: string) => Promise<Result<T>>): Promise<Result<T>> {
    const current = session();
    if (current?.status !== 'authenticated') return failure('unauthenticated', 'Debés iniciar sesión.');
    return work(current.uid);
  }
  function validId(value: string) { return value.trim().length > 0 && !value.includes('/'); }
  async function command<T>(id: string, work: (id: string) => Promise<Result<T>>): Promise<Result<T>> {
    return authenticated(async () => validId(id) ? work(id) : failure('validation', 'Falta el identificador.'));
  }
  return {
    createRequest(input: CreateWalkRequest): Promise<Result<void>> {
      return authenticated(async (uid) => {
        if (input.ownerId !== uid) return failure('forbidden', 'Solo podés crear tus propias solicitudes.');
        if (!validId(input.id) || !validId(input.walkerId) || input.petIds.length < 1 || input.petIds.length > 5 ||
          input.petIds.some((id) => !validId(id)) || new Set(input.petIds).size !== input.petIds.length ||
          input.status !== 'PENDING' || !Number.isSafeInteger(input.scheduledAt) || input.scheduledAt <= 0 ||
          !Number.isSafeInteger(input.durationMinutes) || input.durationMinutes <= 0) {
          return failure('validation', 'Revisá las mascotas, la fecha, la duración y el estado de la solicitud.');
        }
        return requests.create(input);
      });
    },
    getRequest: (id: string) => command(id, requests.getById.bind(requests)),
    listRequests: (side: 'owner' | 'walker', cursor: string | null = null) =>
      authenticated((uid) => side === 'owner' ? requests.getByOwner(uid, cursor) : requests.getByWalker(uid, cursor)),
    acceptRequest: (id: string) => command(id, requests.accept.bind(requests)),
    rejectRequest: (id: string) => command(id, requests.reject.bind(requests)),
    cancelRequest: (id: string) => command(id, requests.cancel.bind(requests)),
    deleteRequest: (id: string) => command(id, requests.deletePending.bind(requests)),
    getWalk: (id: string) => command(id, walks.getById.bind(walks)),
    listWalks: (side: 'owner' | 'walker', cursor: string | null = null) =>
      authenticated((uid) => side === 'owner' ? walks.getByOwner(uid, cursor) : walks.getByWalker(uid, cursor)),
    startWalk: (id: string) => command(id, walks.start.bind(walks)),
    cancelWalk: (id: string) => command(id, walks.cancel.bind(walks)),
    completeWalk: (id: string) => command(id, walks.complete.bind(walks)),
  };
}
export type WalkUseCases = ReturnType<typeof createWalkUseCases>;
