import type { Pet, PetSize } from '../../domain/entities/pet';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { imageUrl, nonnegative, record, text } from './dashboard-values';

const sizes: Record<PetSize, string> = { SMALL: 'Pequeño', MEDIUM: 'Mediano', LARGE: 'Grande', EXTRA_LARGE: 'Extra grande', UNKNOWN: '' };
function petSize(value: unknown): PetSize {
  const normalized = text(value).toLocaleUpperCase('es');
  if (normalized === 'SMALL' || normalized === 'PEQUEÑO') return 'SMALL';
  if (normalized === 'MEDIUM' || normalized === 'MEDIANO') return 'MEDIUM';
  if (normalized === 'LARGE' || normalized === 'GRANDE') return 'LARGE';
  if (['EXTRA_LARGE', 'EXTRA GRANDE', 'GIGANTE'].includes(normalized)) return 'EXTRA_LARGE';
  return 'UNKNOWN';
}
export function toPet(document: DashboardDocument, ownerId: string): Pet {
  const data = record(document.data);
  if (data.ownerId !== ownerId) throw new Error('Pet owner mismatch');
  return {
    id: document.id, ownerId, name: text(data.name) || 'Sin nombre', breed: text(data.breed),
    age: nonnegative(data.age) ?? 0, weight: nonnegative(data.weight) ?? 0,
    size: petSize(data.size), photoUri: imageUrl(data.photoUri),
    observations: text(data.observations), behavior: text(data.behavior), specialNeeds: text(data.specialNeeds),
  };
}
export function toPetDocument(pet: Pet) {
  // Mismo esquema que Kotlin; no guardar id ni datos ajenos al formulario.
  return {
    ownerId: pet.ownerId, name: pet.name, breed: pet.breed, age: pet.age, weight: pet.weight,
    observations: pet.observations, photoUri: pet.photoUri, size: sizes[pet.size],
    behavior: pet.behavior, specialNeeds: pet.specialNeeds,
  };
}
