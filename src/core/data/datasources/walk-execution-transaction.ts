import { planWalkAcceptance, planWalkTransition } from '../../domain/use-cases/walk-execution-use-cases';
import type { Result } from '../../../shared/types/result';
import type { DashboardDocument } from './dashboard-document';
import { toBookingRequest } from '../mappers/walk-booking-mapper';
import { toWalk, toWalkDocument, walkTime } from '../mappers/walk-mapper';
import { record } from '../mappers/dashboard-values';

type Collection = 'users' | 'walkRequests' | 'walks';
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
function authorize(value: unknown) {
  if (!value) throw { code: 'permission-denied' };
  const profile = record(value);
  if (profile.role !== 'WALKER' || (profile.active !== undefined && profile.active !== true)) throw { code: 'permission-denied' };
}
export async function acceptWalkTransaction(transaction: WalkExecutionTransaction, uid: string, id: string): Promise<DashboardDocument> {
  const [profile, request, walk] = await Promise.all([transaction.get('users', uid), transaction.get('walkRequests', id), transaction.get('walks', id)]);
  authorize(profile);
  if (!request) throw { code: 'not-found' };
  const plan = unwrap(planWalkAcceptance(uid, toBookingRequest({ id, data: request }, uid, 'walker'), walk === null ? null : toWalk({ id, data: walk }, uid, 'walker')));
  const data = toWalkDocument(plan.walk);
  if (plan.changed) {
    transaction.setWalk(id, data);
    transaction.update('walkRequests', id, { status: 'ACCEPTED' });
  }
  return { id, data };
}
export async function updateWalkTransaction(transaction: WalkExecutionTransaction, uid: string, id: string, action: 'start' | 'complete', now: () => number = Date.now): Promise<DashboardDocument> {
  const [profile, raw] = await Promise.all([transaction.get('users', uid), transaction.get('walks', id)]);
  authorize(profile);
  if (!raw) throw { code: 'not-found' };
  const plan = unwrap(planWalkTransition(uid, toWalk({ id, data: raw }, uid, 'walker'), action, now()));
  if (plan.changed) transaction.update('walks', id, action === 'start'
    ? { status: 'IN_PROGRESS', startedAt: walkTime(plan.walk.startedAt) }
    : { status: 'COMPLETED', finishedAt: walkTime(plan.walk.finishedAt) });
  return { id, data: toWalkDocument(plan.walk) };
}
