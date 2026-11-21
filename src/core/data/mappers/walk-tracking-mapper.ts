import { failure, type Result } from '../../../shared/types/result';
import { record } from './dashboard-values';
import { toWalk } from './walk-mapper';

export function trackingFailure(error: unknown): Result<never> {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return failure('forbidden', 'No tenés acceso al seguimiento de este paseo.');
  if (code.includes('not-found')) return failure('not-found', 'No encontramos el paseo.');
  if (code.includes('unavailable') || code.includes('network') || code.includes('deadline')) return failure('unavailable', 'No pudimos conectar el seguimiento. Revisá tu conexión.');
  return failure('unexpected', 'No pudimos consultar o compartir la ubicación. Intentá nuevamente.');
}
export function participant(id: string, raw: unknown, uid: string) {
  if (!raw) throw { code: 'not-found' };
  const data = record(raw);
  if (data.ownerId !== uid && data.walkerId !== uid) throw { code: 'permission-denied' };
  return toWalk({ id, data }, uid, data.ownerId === uid ? 'owner' : 'walker');
}
