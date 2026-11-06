import type { UserRole } from '../../../users/domain/entities/user-role';

export type RegistrationInput = Readonly<{
  name: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}>;

export type RegistrationDetails = Omit<RegistrationInput, 'confirmPassword'>;
export type RegistrationReceipt = Readonly<{ email: string; verificationEmailSent: boolean }>;
