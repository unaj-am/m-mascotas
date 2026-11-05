import { failure, success, type Result } from '../../../../shared/types/result';
import type { AuthSessionDto } from '../datasources/auth-data-source';

export function profileSession(uid: string, value: unknown): Result<AuthSessionDto> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return failure('not-found', 'Tu cuenta existe, pero no encontramos su perfil. No se creará uno nuevo automáticamente.');
  }
  const data = value as Record<string, unknown>;
  // Kotlin interpreta active ausente como true; false explícito siempre bloquea.
  if (data.active !== undefined && data.active !== true) return failure('forbidden', 'Tu cuenta está inactiva.');
  if (data.role !== 'OWNER' && data.role !== 'WALKER') return failure('forbidden', 'El perfil de tu cuenta no tiene un rol válido.');
  return success({ kind: 'authorized', uid, role: data.role });
}
