import { failure, success, type Result } from '../../../shared/types/result';
import type { LiveList } from '../../../shared/types/live-list';
import type { Observer } from '../../../shared/types/subscription';
import type { Walk } from '../entities/walk';
import type { Session } from '../entities/session';
import type { RequestSide, WalkRequest } from '../entities/walk-request';
import type { WalkBookingRepository } from '../repositories/walk-booking-repository';

export type WalkAction = 'accept' | 'start' | 'complete';
export function createWalkExecutionUseCases(repository: WalkBookingRepository) {
  const pending = new Set<string>();
  async function act(session: Session, id: string, action: WalkAction): Promise<Result<Walk>> {
    if (session.status !== 'authenticated' || session.role !== 'WALKER') return failure('forbidden', 'Solo el paseador asignado puede aceptar, iniciar o finalizar el paseo.');
    if (!id.trim() || id.includes('/') || id.length > 128) return failure('validation', 'Falta un identificador válido para la operación.');
    const key = `${session.uid}:${id}`;
    if (pending.has(key)) return failure('conflict', 'Esperá a que termine la operación anterior.');
    pending.add(key);
    try {
      return await ({ accept: repository.acceptRequest, start: repository.startWalk, complete: repository.completeWalk }[action]).call(repository, session.uid, id);
    } finally { pending.delete(key); }
  }
  return {
    accept: (session: Session, id: string) => act(session, id, 'accept'),
    start: (session: Session, id: string) => act(session, id, 'start'),
    complete: (session: Session, id: string) => act(session, id, 'complete'),
    observeWalks(session: Session, side: RequestSide, observer: Observer<LiveList<Walk>>) {
      if (session.status !== 'authenticated' || session.role !== (side === 'owner' ? 'OWNER' : 'WALKER')) {
        observer(failure('forbidden', 'No tenés acceso a estos paseos.')); return () => {};
      }
      return repository.observeWalks(session.uid, side, observer);
    },
  };
}

export type WalkChange = Readonly<{ walk: Walk; changed: boolean }>;
export function planWalkAcceptance(uid: string, request: WalkRequest, existing: Walk | null): Result<WalkChange> {
  if (request.walkerId !== uid) return failure('forbidden', 'Solo el paseador destinatario puede aceptar esta solicitud.');
  if (request.status === 'ACCEPTED') {
    if (!existing || existing.id !== request.id || existing.ownerId !== request.ownerId || existing.walkerId !== uid ||
      existing.petIds.length !== request.petIds.length || existing.petIds.some((id, index) => id !== request.petIds[index])) {
      return failure('conflict', 'La solicitud aceptada no tiene un paseo asociado válido.');
    }
    return success({ walk: existing, changed: false });
  }
  if (request.status !== 'PENDING') return failure('conflict', 'La solicitud ya no está pendiente. Actualizá el listado.');
  if (existing) return failure('conflict', 'Ya existe un paseo asociado a esta solicitud.');
  if (!request.ownerId || request.ownerId === uid || !request.petIds.length || request.petIds.length > 5 ||
    new Set(request.petIds).size !== request.petIds.length || !Number.isFinite(request.scheduledAt) || request.scheduledAt <= 0 ||
    !Number.isInteger(request.durationMinutes) || request.durationMinutes <= 0) return failure('validation', 'La solicitud tiene datos incompletos. No se puede aceptar.');
  return success({ changed: true, walk: { id: request.id, ownerId: request.ownerId, walkerId: uid, petIds: [...request.petIds],
    scheduledAt: request.scheduledAt, durationMinutes: request.durationMinutes, observations: request.observations,
    status: 'SCHEDULED', startedAt: null, finishedAt: null, distanceKm: null } });
}
export function planWalkTransition(uid: string, walk: Walk, action: 'start' | 'complete', now: number): Result<WalkChange> {
  if (walk.walkerId !== uid) return failure('forbidden', 'Solo el paseador asignado puede realizar esta operación.');
  if (action === 'start' && walk.status === 'IN_PROGRESS') return success({ walk, changed: false });
  if (action === 'complete' && walk.status === 'COMPLETED') return success({ walk, changed: false });
  if (action === 'start' && walk.status !== 'SCHEDULED') return failure('conflict', 'Solo se pueden iniciar paseos programados.');
  if (action === 'complete' && walk.status !== 'IN_PROGRESS') return failure('conflict', 'Solo se pueden finalizar paseos en curso.');
  if (!Number.isFinite(now) || now <= 0 || (action === 'complete' && (walk.startedAt === null || now < walk.startedAt))) return failure('validation', 'No pudimos registrar un horario válido. Revisá la fecha y hora del dispositivo.');
  return success({ changed: true, walk: action === 'start' ? { ...walk, status: 'IN_PROGRESS', startedAt: now, finishedAt: null }
    : { ...walk, status: 'COMPLETED', finishedAt: now } });
}
