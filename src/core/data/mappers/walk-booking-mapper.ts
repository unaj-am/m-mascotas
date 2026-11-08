import type { Walker } from '../../domain/entities/walker';
import type { WalkRequest, WalkRequestDraft, RequestSide } from '../../domain/entities/walk-request';
import { validateWalkRequest } from '../../domain/use-cases/walk-booking-use-cases';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { imageUrl, nonnegative, record, strings, text, timestamp } from './dashboard-values';

export function toPublicWalker(document: DashboardDocument): Walker {
  const data = record(document.data);
  const rating = nonnegative(data.rating);
  const capacity = nonnegative(data.maxPets);
  return { userId: document.id, description: text(data.description), serviceArea: text(data.serviceArea),
    experienceYears: Math.floor(nonnegative(data.experienceYears) ?? 0), available: data.available === true,
    pricePerWalk: nonnegative(data.pricePerWalk) ?? 0, maxPets: capacity !== null && Number.isInteger(capacity) && capacity >= 1 ? capacity : 1,
    rating: rating !== null && rating <= 5 ? rating : null };
}
export function toBookingRequest(document: DashboardDocument, uid: string, side: RequestSide): WalkRequest {
  const data = record(document.data);
  if (data[side === 'owner' ? 'ownerId' : 'walkerId'] !== uid) throw { code: 'permission-denied' };
  if (!['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'].includes(String(data.status))) throw new Error('Invalid request status');
  return { id: document.id, ownerId: text(data.ownerId), walkerId: text(data.walkerId), petIds: strings(data.petIds),
    ownerName: text(data.ownerName), petNames: strings(data.petNames), petPhotos: strings(data.petPhotos).map((uri) => imageUrl(uri) ?? ''),
    scheduledAt: timestamp(data.scheduledAt) ?? 0, durationMinutes: nonnegative(data.durationMinutes) ?? 0,
    status: data.status as WalkRequest['status'], observations: text(data.observations) };
}

/** Valida documentos leídos en la transacción y arma el esquema compatible con Kotlin. */
export function toNewBookingDocument(ownerId: string, draft: WalkRequestDraft, rawOwner: unknown, rawWalker: unknown, pets: readonly DashboardDocument[], now = Date.now()) {
  const invalid = validateWalkRequest(draft, now);
  if (invalid && !invalid.ok) throw { code: 'validation', publicMessage: invalid.error.message };
  if (!rawOwner) throw { code: 'permission-denied' };
  const profile = record(rawOwner);
  if (profile.role !== 'OWNER' || (profile.active !== undefined && profile.active !== true)) throw { code: 'permission-denied' };
  const ownerName = [text(profile.name), text(profile.lastName)].filter(Boolean).join(' ');
  if (!ownerName) throw { code: 'validation', publicMessage: 'El perfil del dueño necesita un nombre válido para enviar solicitudes.' };
  if (rawWalker === null) throw { code: 'not-found' };
  const walker = toPublicWalker({ id: draft.walkerId, data: rawWalker });
  if (walker.userId === ownerId) throw { code: 'permission-denied' };
  if (!walker.available) throw { code: 'failed-precondition', publicMessage: 'El paseador ya no está disponible. Elegí otro paseador.' };
  if (draft.petIds.length > walker.maxPets) throw { code: 'validation', publicMessage: `Este paseador admite hasta ${walker.maxPets} mascota${walker.maxPets === 1 ? '' : 's'} por paseo.` };
  const selected = draft.petIds.map((id) => {
    const document = pets.find((pet) => pet.id === id);
    if (!document || !document.data) throw { code: 'not-found' };
    const pet = record(document.data);
    if (pet.ownerId !== ownerId) throw { code: 'permission-denied' };
    if (!text(pet.name)) throw { code: 'validation', publicMessage: 'Una de las mascotas no tiene un nombre válido.' };
    return pet;
  });
  return { ownerId, walkerId: draft.walkerId, ownerName,
    petIds: [...draft.petIds], petNames: selected.map((pet) => text(pet.name)), petPhotos: selected.map((pet) => imageUrl(pet.photoUri) ?? ''),
    scheduledAt: new Date(draft.scheduledAt).toISOString(), durationMinutes: draft.durationMinutes, status: 'PENDING', observations: draft.observations.trim() };
}
