import { planWalkAcceptance, planWalkTransition } from '../../domain/use-cases/walk-execution-use-cases';
import type { Result } from '../../../shared/types/result';
import type { DashboardDocument } from './dashboard-document';
import { toBookingRequest } from '../mappers/walk-booking-mapper';
import { toWalk, toWalkDocument, walkTime } from '../mappers/walk-mapper';

type Collection = 'walkRequests' | 'walks';
/** Puerto pequeño de transacción: permite verificar el flujo sin depender del SDK. */
export interface WalkExecutionTransaction {
  get(collection: Collection, id: string): Promise<unknown | null>;
  setWalk(id: string, data: ReturnType<typeof toWalkDocument>): void;
  update(collection: 'walkRequests' | 'walks', id: string, data: Record<string, unknown>): void;
}
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw { code: result.error.code, publicMessage: result.error.message };
  return result.value;
}
export async function acceptWalkTransaction(transaction: WalkExecutionTransaction, uid: string, id: string): Promise<DashboardDocument> {
  // Mismas lecturas y orden que WalkRequestRemoteDataSource.kt.
  const request = await transaction.get('walkRequests', id);
  const walk = await transaction.get('walks', id);
  if (!request) throw { code: 'not-found' };
  const plan = unwrap(planWalkAcceptance(uid, toBookingRequest({ id, data: request }, uid, 'walker'), walk === null ? null : toWalk({ id, data: walk }, uid, 'walker')));
  if (!plan.changed && walk !== null) return { id, data: walk };
  const raw = request as Record<string, unknown>;
  // Kotlin copia estos valores literalmente. Normalizarlos puede incumplir
  // reglas que comparan el paseo nuevo con su solicitud de origen.
  const data = { ...toWalkDocument(plan.walk),
    scheduledAt: typeof raw.scheduledAt === 'string' ? raw.scheduledAt : walkTime(plan.walk.scheduledAt),
    observations: typeof raw.observations === 'string' ? raw.observations : plan.walk.observations };
  if (plan.changed) {
    transaction.setWalk(id, data);
    transaction.update('walkRequests', id, { status: 'ACCEPTED' });
  }
  return { id, data };
}
export async function updateWalkTransaction(transaction: WalkExecutionTransaction, uid: string, id: string, action: 'start' | 'complete', now: () => number = Date.now): Promise<DashboardDocument> {
  const raw = await transaction.get('walks', id);
  if (!raw) throw { code: 'not-found' };
  const plan = unwrap(planWalkTransition(uid, toWalk({ id, data: raw }, uid, 'walker'), action, now()));
  if (plan.changed) transaction.update('walks', id, action === 'start'
    ? { status: 'IN_PROGRESS', startedAt: walkTime(plan.walk.startedAt) }
    : { status: 'COMPLETED', finishedAt: walkTime(plan.walk.finishedAt) });
  return { id, data: toWalkDocument(plan.walk) };
}
