import { it } from 'node:test';
import assert from 'node:assert/strict';
import { WalkerDashboardRepositoryImpl } from '../src/core/data/repositories/walker-dashboard-repository-impl';
import type { WalkerDashboardDataSource } from '../src/core/data/datasources/walker-dashboard-data-source';
import { createWalkerDashboardUseCases } from '../src/core/domain/use-cases/walker-dashboard-use-cases';
import { summarizeWalkerDashboard } from '../src/core/domain/entities/walker-dashboard';

const session = { status: 'authenticated', uid: 'walker-123', role: 'WALKER' } as const;
function fixture() {
  const uids: string[] = [];
  const updates: { uid: string; available: boolean }[] = [];
  const source: WalkerDashboardDataSource = {
    async getProfile(uid) { uids.push(uid); return { name: 'Luis', role: 'WALKER', active: true, profileImage: 'https://example.com/profile.jpg' }; },
    async getWalker(uid) { uids.push(uid); return { available: true, serviceArea: 'Palermo', pricePerWalk: 5000 }; },
    async getRequests(uid) { uids.push(uid); return [
      { id: 'pending', data: { walkerId: uid, ownerName: 'Ana', petIds: ['pet-1'], petNames: ['Milo'], status: 'PENDING', scheduledAt: '2027-01-01T10:00:00Z', durationMinutes: 30 } },
      { id: 'accepted', data: { walkerId: uid, petIds: ['pet-1'], petNames: ['Milo'], status: 'ACCEPTED' } },
    ]; },
    async getWalks(uid) { uids.push(uid); return [
      { id: 'scheduled', data: { walkerId: uid, petIds: ['pet-1'], status: 'SCHEDULED', scheduledAt: 1800000000000 } },
      { id: 'active', data: { walkerId: uid, petIds: ['pet-1'], status: 'IN_PROGRESS' } },
      { id: 'completed', data: { walkerId: uid, petIds: [], status: 'COMPLETED' } },
    ]; },
    async updateAvailability(uid, available) { updates.push({ uid, available }); },
  };
  const repository = new WalkerDashboardRepositoryImpl(source);
  return { source, repository, actions: createWalkerDashboardUseCases(repository), uids, updates };
}

it('carga solo datos del paseador conectado y reproduce los indicadores del nativo', async () => {
  const f = fixture();
  const result = await f.actions.getDashboard(session);
  assert.deepEqual(f.uids, Array(4).fill(session.uid));
  assert.equal(result.ok, true);
  if (result.ok) {
    const summary = summarizeWalkerDashboard(result.value);
    assert.equal(result.value.name, 'Luis');
    assert.equal(result.value.available, true);
    assert.equal(summary.pendingCount, 1);
    assert.equal(summary.scheduledCount, 1);
    assert.equal(summary.activeCount, 1);
    assert.equal(result.value.requests[0]?.scheduledAt, Date.parse('2027-01-01T10:00:00Z'));
    assert.deepEqual(result.value.walks.find((walk) => walk.id === 'scheduled')?.petNames, ['Milo']);
  }
});

it('rechaza consultar o modificar el panel desde una cuenta de dueño o sin sesión', async () => {
  const f = fixture();
  for (const invalid of [{ status: 'signed-out' } as const, { status: 'authenticated', uid: 'owner', role: 'OWNER' } as const]) {
    assert.equal((await f.actions.getDashboard(invalid)).ok, false);
    assert.equal((await f.actions.updateAvailability(invalid, true)).ok, false);
  }
  assert.equal(f.uids.length, 0);
  assert.equal(f.updates.length, 0);
});

it('no devuelve solicitudes ni paseos de otro paseador aunque una fuente se equivoque', async () => {
  for (const name of ['getRequests', 'getWalks'] as const) {
    const f = fixture();
    f.source[name] = async () => [{ id: 'other', data: { walkerId: 'someone-else', status: 'PENDING', ownerName: 'private name' } }];
    const result = await f.actions.getDashboard(session);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /private name/);
  }
});

it('admite una cuenta nueva sin perfil profesional pero no permite activar su disponibilidad', async () => {
  const f = fixture();
  f.source.getWalker = async () => null;
  const result = await f.actions.getDashboard(session);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.hasWalkerProfile, false);
    assert.equal(result.value.available, false);
  }
  const update = await f.actions.updateAvailability(session, true);
  assert.equal(update.ok, false);
  if (!update.ok) assert.equal(update.error.code, 'not-found');
  assert.equal(f.updates.length, 0);
});

it('cambia exclusivamente la disponibilidad de la cuenta conectada', async () => {
  const f = fixture();
  assert.equal((await f.actions.updateAvailability(session, false)).ok, true);
  assert.deepEqual(f.updates, [{ uid: session.uid, available: false }]);
});

it('una cuenta desactivada o cuyo rol cambió no puede actualizar disponibilidad', async () => {
  for (const profile of [{ role: 'WALKER', active: false }, { role: 'OWNER', active: true }]) {
    const f = fixture();
    f.source.getProfile = async () => profile;
    assert.equal((await f.actions.getDashboard(session)).ok, false);
    assert.equal((await f.actions.updateAvailability(session, true)).ok, false);
    assert.equal(f.updates.length, 0);
  }
});

it('un fallo de permisos o conexión no se convierte en una confirmación de actualización', async () => {
  for (const code of ['firestore/permission-denied', 'firestore/unavailable']) {
    const f = fixture();
    f.source.updateAvailability = async () => { throw { code, message: 'private SDK detail' }; };
    const result = await f.actions.updateAvailability(session, false);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /private SDK/);
  }
});

it('no inventa contadores vacíos cuando falla la carga de las solicitudes', async () => {
  const f = fixture();
  f.source.getRequests = async () => { throw { code: 'firestore/unavailable' }; };
  const result = await f.actions.getDashboard(session);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'unavailable');
});

it('rechaza un valor de disponibilidad que no sea booleano sin guardar cambios', async () => {
  const f = fixture();
  assert.equal((await f.actions.updateAvailability(session, 'true' as unknown as boolean)).ok, false);
  assert.equal(f.updates.length, 0);
});
