import type { UserRole } from '../../../users/domain/entities/user-role';

export type Session =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'signed-out' }>
  | Readonly<{ status: 'needs-verification'; uid: string; email: string }>
  | Readonly<{ status: 'authenticated'; uid: string; role: UserRole }>;
