import { failure } from '../../../shared/types/result';
import type { RegistrationInput } from '../entities/registration';
import type { AuthRepository } from '../repositories/auth-repository';

export function createRegisterUser(repository: AuthRepository) {
  return (input: RegistrationInput) => {
    const name = input.name.trim();
    const lastName = input.lastName.trim();
    const phone = input.phone.trim();
    const email = input.email.trim();
    if (!name || !lastName || name.length > 80 || lastName.length > 80) {
      return Promise.resolve(failure('validation', 'Completá nombre y apellido, con un máximo de 80 caracteres cada uno.'));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return Promise.resolve(failure('validation', 'Ingresá un correo electrónico válido.'));
    }
    if (!/^\+?[\d\s().-]+$/.test(phone) || !/^\d{8,15}$/.test(phone.replace(/\D/g, ''))) {
      return Promise.resolve(failure('validation', 'Ingresá un teléfono válido de entre 8 y 15 dígitos.'));
    }
    if (!input.password.trim() || input.password.length < 6 || input.password.length > 128) {
      return Promise.resolve(failure('validation', 'La contraseña debe tener entre 6 y 128 caracteres.'));
    }
    if (input.password !== input.confirmPassword) {
      return Promise.resolve(failure('validation', 'Las contraseñas no coinciden.'));
    }
    if (input.role !== 'OWNER' && input.role !== 'WALKER') {
      return Promise.resolve(failure('validation', 'Elegí si querés registrarte como dueño o paseador.'));
    }
    // La contraseña conserva sus espacios y nunca forma parte del perfil.
    return repository.register({ name, lastName, phone, email, password: input.password, role: input.role });
  };
}
