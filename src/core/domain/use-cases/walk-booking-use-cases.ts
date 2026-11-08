import { failure } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { LiveList } from '../../../shared/types/live-list';
import type { Session } from '../entities/session';
import type { Walker } from '../entities/walker';
import type { WalkRequest, WalkRequestDraft, RequestSide } from '../entities/walk-request';
import type { WalkBookingRepository } from '../repositories/walk-booking-repository';

const owner = (session: Session) => session.status === 'authenticated' && session.role === 'OWNER';
const validId = (id: string) => !!id.trim() && id.length <= 128 && !id.includes('/');
export function validateWalkRequest(draft: WalkRequestDraft, now: number) {
  if (!validId(draft.id) || !validId(draft.walkerId)) return failure('validation', 'No pudimos identificar al paseador o la solicitud.');
  if (!draft.petIds.length || draft.petIds.length > 5 || draft.petIds.some((id) => !validId(id)) || new Set(draft.petIds).size !== draft.petIds.length) {
    return failure('validation', 'Seleccioná entre una y cinco mascotas, sin repetirlas.');
  }
  if (!Number.isSafeInteger(draft.scheduledAt) || draft.scheduledAt <= now || draft.scheduledAt > 8640000000000000) return failure('validation', 'Elegí una fecha y hora futuras para el paseo.');
  if (!Number.isSafeInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 1440) return failure('validation', 'Ingresá una duración válida, entre 1 y 1440 minutos.');
  if (draft.observations.trim().length > 1000) return failure('validation', 'Las observaciones admiten hasta 1000 caracteres.');
  return null;
}
export function createWalkBookingUseCases(repository: WalkBookingRepository, now = Date.now) {
  const sending = new Set<string>();
  return {
    observeWalkers(session: Session, observer: Observer<LiveList<Walker>>) {
      if (!owner(session)) { observer(failure('forbidden', 'Iniciá sesión como dueño para buscar paseadores.')); return () => {}; }
      return repository.observeAvailableWalkers(observer);
    },
    newRequestId(session: Session) {
      if (!owner(session)) return failure('forbidden', 'Solo un dueño puede solicitar paseos.');
      try { return { ok: true, value: repository.newRequestId() } as const; }
      catch { return failure('unexpected', 'No pudimos preparar la solicitud. Intentá nuevamente.'); }
    },
    async createRequest(session: Session, draft: WalkRequestDraft) {
      if (session.status !== 'authenticated' || session.role !== 'OWNER') return failure('forbidden', 'Solo un dueño puede solicitar paseos.');
      const invalid = validateWalkRequest(draft, now());
      if (invalid) return invalid;
      if (draft.walkerId === session.uid) return failure('validation', 'No podés enviarte una solicitud a vos mismo.');
      // El dueño y el estado inicial no se toman de datos enviados por la pantalla.
      if (sending.has(session.uid)) return failure('conflict', 'Esperá a que termine el envío de la solicitud.');
      sending.add(session.uid);
      try {
        return await repository.createRequest(session.uid, { id: draft.id, walkerId: draft.walkerId, petIds: [...draft.petIds], scheduledAt: draft.scheduledAt, durationMinutes: draft.durationMinutes, observations: draft.observations.trim() });
      } finally { sending.delete(session.uid); }
    },
    observeRequests(session: Session, side: RequestSide, observer: Observer<LiveList<WalkRequest>>) {
      if (session.status !== 'authenticated' || session.role !== (side === 'owner' ? 'OWNER' : 'WALKER')) {
        observer(failure('forbidden', 'No tenés acceso a estas solicitudes.')); return () => {};
      }
      return repository.observeRequests(session.uid, side, observer);
    },
  };
}
