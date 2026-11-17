import type { UserRole } from './user-role';

export type User = Readonly<{
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  role: UserRole;
  active: boolean;
}>;
