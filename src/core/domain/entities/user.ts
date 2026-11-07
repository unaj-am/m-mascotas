import type { UserRole } from './user-role';
export type { UserRole } from './user-role';

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

// El rol, el correo y el estado activo no se editan mediante el perfil.
export type UpdateUserProfile = Pick<User, 'name' | 'lastName' | 'phone' | 'profileImage'>;
