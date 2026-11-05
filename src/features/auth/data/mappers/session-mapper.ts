import type { AuthSessionDto } from '../datasources/auth-data-source';
import type { Session } from '../../domain/entities/session';
export function toSession(dto: AuthSessionDto): Session {
  switch (dto.kind) {
    case 'loading': return { status: 'loading' };
    case 'signed-out': return { status: 'signed-out' };
    case 'unverified': return { status: 'needs-verification', uid: dto.uid, email: dto.email };
    case 'authorized': return { status: 'authenticated', uid: dto.uid, role: dto.role };
  }
}
