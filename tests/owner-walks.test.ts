import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { WalkRequest } from '../src/core/domain/entities/walk-request';
import type { OwnerWalkSummary } from '../src/core/domain/entities/owner-dashboard';
import { ownerWalkFilters, selectOwnerWalks, type OwnerWalkFilter } from '../src/features/walks/presentation/state/owner-walks-state';

const walks: readonly OwnerWalkSummary[] = Object.freeze([
  { id: 'active', status: 'IN_PROGRESS', scheduledAt: 200, petIds: ['pet'], durationMinutes: 30 },
  { id: 'scheduled', status: 'SCHEDULED', scheduledAt: 300, petIds: ['pet'], durationMinutes: 30 },
  { id: 'completed', status: 'COMPLETED', scheduledAt: 100, petIds: ['pet'], durationMinutes: 30 },
  { id: 'cancelled', status: 'CANCELLED', scheduledAt: 400, petIds: ['pet'], durationMinutes: 30 },
]);
const request = { ownerId: 'owner', walkerId: 'walker', petIds: ['pet'], durationMinutes: 30, observations: '', ownerName: 'Dueño', petNames: ['Luna'], petPhotos: [] };
const requests: readonly WalkRequest[] = Object.freeze([
  { ...request, id: 'pending', status: 'PENDING', scheduledAt: 100 },
  { ...request, id: 'accepted', status: 'ACCEPTED', scheduledAt: 200 },
  { ...request, id: 'rejected', status: 'REJECTED', scheduledAt: 400 },
  { ...request, id: 'cancelled-request', status: 'CANCELLED', scheduledAt: 300 },
]);
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

it('reproduce los siete filtros con los contadores conjuntos de Kotlin sin duplicar aceptadas', () => {
  const selected = selectOwnerWalks(walks, requests, 'ALL');
  assert.deepEqual(ownerWalkFilters.map((item) => item.label), ['Todas', 'Pendientes', 'Rechazadas', 'Confirmados', 'En curso', 'Finalizados', 'Cancelados']);
  assert.deepEqual(selected.counts, { ALL: 7, PENDING: 1, REJECTED: 1, SCHEDULED: 1, IN_PROGRESS: 1, COMPLETED: 1, CANCELLED: 2 });
  assert.deepEqual(ids(selected.requests), ['rejected', 'cancelled-request', 'pending']);
});

it('cada filtro afecta solicitudes y paseos, y mantiene separados Confirmados y En curso', () => {
  const expected: Record<OwnerWalkFilter, string[]> = {
    ALL: ['rejected', 'cancelled-request', 'pending', 'scheduled', 'active', 'cancelled', 'completed'],
    PENDING: ['pending'], REJECTED: ['rejected'], SCHEDULED: ['scheduled'], IN_PROGRESS: ['active'],
    COMPLETED: ['completed'], CANCELLED: ['cancelled-request', 'cancelled'],
  };
  for (const filter of ownerWalkFilters) {
    const selected = selectOwnerWalks(walks, requests, filter.id);
    assert.deepEqual(ids([...selected.requests, ...selected.upcoming, ...selected.history]), expected[filter.id], filter.id);
    assert.equal(selected.counts[filter.id], expected[filter.id].length, filter.id);
  }
});

it('separa próximos e historial y ordena cada sección por fecha descendente sin mutar las listas', () => {
  const before = JSON.stringify({ walks, requests });
  const selected = selectOwnerWalks(walks, requests, 'ALL');
  assert.deepEqual(ids(selected.upcoming), ['scheduled', 'active']);
  assert.deepEqual(ids(selected.history), ['cancelled', 'completed']);
  assert.equal(JSON.stringify({ walks, requests }), before);
});

it('la aceptación quita la solicitud y suma un confirmado; inicio y finalización actualizan filtros y secciones', () => {
  const pending = requests.filter((item) => item.id === 'pending');
  const accepted = pending.map((item) => ({ ...item, status: 'ACCEPTED' as const }));
  const scheduled: OwnerWalkSummary = { ...walks[0]!, id: 'new', status: 'SCHEDULED' };
  assert.equal(selectOwnerWalks([], pending, 'PENDING').counts.PENDING, 1);
  const afterAccept = selectOwnerWalks([scheduled], accepted, 'ALL');
  assert.equal(afterAccept.counts.ALL, 1); assert.equal(afterAccept.counts.PENDING, 0); assert.equal(afterAccept.counts.SCHEDULED, 1);
  assert.deepEqual(afterAccept.requests, []);
  const afterStart = selectOwnerWalks([{ ...scheduled, status: 'IN_PROGRESS' }], accepted, 'IN_PROGRESS');
  assert.equal(afterStart.counts.SCHEDULED, 0); assert.deepEqual(ids(afterStart.upcoming), ['new']);
  const afterComplete = selectOwnerWalks([{ ...scheduled, status: 'COMPLETED' }], accepted, 'COMPLETED');
  assert.deepEqual(afterComplete.upcoming, []); assert.deepEqual(ids(afterComplete.history), ['new']);
});

it('distingue una cuenta sin datos de un filtro sin coincidencias', () => {
  const empty = selectOwnerWalks([], [], 'ALL');
  assert.equal(empty.counts.ALL, 0); assert.deepEqual(empty.requests, []); assert.deepEqual(empty.upcoming, []); assert.deepEqual(empty.history, []);
  const noMatch = selectOwnerWalks(walks, [], 'PENDING');
  assert.equal(noMatch.counts.ALL, 4); assert.equal(noMatch.counts.PENDING, 0);
  assert.deepEqual(noMatch.requests, []); assert.deepEqual(noMatch.upcoming, []); assert.deepEqual(noMatch.history, []);
});
