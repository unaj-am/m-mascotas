import { it } from 'node:test';
import assert from 'node:assert/strict';
import { OwnerDashboardRepositoryImpl } from '../src/core/data/repositories/owner-dashboard-repository-impl';
import { createGetOwnerDashboard } from '../src/core/domain/use-cases/get-owner-dashboard';
import { summarizeOwnerDashboard, type OwnerDashboard } from '../src/core/domain/entities/owner-dashboard';
import type { OwnerDashboardDataSource } from '../src/core/data/datasources/owner-dashboard-data-source';

function fixture() {
  const uids: string[] = [];
  const source: OwnerDashboardDataSource = {
    async getProfile(uid) { uids.push(uid); return { role: 'OWNER', name: 'Ana', lastName: 'Pérez', email: 'ana@example.com', phone: '1122334455' }; },
    async getPets(uid) { uids.push(uid); return [{ id: 'pet-1', data: { ownerId: uid, name: 'Milo', breed: 'Mestizo', age: 3, photoUri: 'https://example.com/milo.jpg' } }]; },
    async getWalks(uid) { uids.push(uid); return [{ id: 'walk-1', data: { ownerId: uid, petIds: ['pet-1'], status: 'SCHEDULED', scheduledAt: '2027-01-01T10:00:00Z', durationMinutes: 30 } }]; },
  };
  const repository = new OwnerDashboardRepositoryImpl(source);
  return { source, repository, get: createGetOwnerDashboard(repository), uids };
}

it('el panel consulta exclusivamente el UID de la sesión de dueño y acepta fechas ISO de Kotlin', async () => {
  const f = fixture();
  const result = await f.get({ status: 'authenticated', uid: 'owner-123', role: 'OWNER' });
  assert.deepEqual(f.uids, ['owner-123', 'owner-123', 'owner-123']);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, 'Ana');
    assert.equal(result.value.pets[0]?.name, 'Milo');
    assert.equal(result.value.walks[0]?.scheduledAt, Date.parse('2027-01-01T10:00:00Z'));
  }
});

it('no consulta datos de dueño sin sesión o con rol paseador', async () => {
  const f = fixture();
  assert.equal((await f.get({ status: 'signed-out' })).ok, false);
  assert.equal((await f.get({ status: 'authenticated', uid: 'walker', role: 'WALKER' })).ok, false);
  assert.equal(f.uids.length, 0);
});

it('descarta documentos de otra cuenta aunque una fuente devuelva datos incorrectos', async () => {
  for (const collection of ['getPets', 'getWalks'] as const) {
    const f = fixture();
    f.source[collection] = async () => [{ id: 'private', data: { ownerId: 'other', name: 'private detail', status: 'SCHEDULED' } }];
    const result = await f.repository.getByOwner('owner');
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /private detail/);
  }
});

it('rechaza perfiles desactivados o cuyo rol cambió en el servidor', async () => {
  for (const profile of [{ role: 'OWNER', active: false }, { role: 'WALKER', active: true }]) {
    const f = fixture();
    f.source.getProfile = async () => profile;
    assert.equal((await f.repository.getByOwner('owner')).ok, false);
  }
});

it('un fallo de permisos o red muestra un error y no estadísticas vacías ficticias', async () => {
  for (const code of ['permission-denied', 'firestore/unavailable']) {
    const f = fixture();
    f.source.getPets = async () => { throw { code, message: 'private SDK detail' }; };
    const result = await f.repository.getByOwner('owner');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, code === 'permission-denied' ? 'forbidden' : 'unavailable');
      assert.doesNotMatch(result.error.message, /private/);
    }
  }
});

it('distingue datos vacíos confirmados de una carga fallida y admite Timestamp', async () => {
  const f = fixture();
  f.source.getPets = async () => [];
  f.source.getWalks = async () => [{ id: 'w', data: { ownerId: 'owner', status: 'SCHEDULED', petIds: [], scheduledAt: { toMillis: () => 1800000000000 } } }];
  const result = await f.repository.getByOwner('owner');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.pets.length, 0);
    assert.equal(result.value.walks[0]?.scheduledAt, 1800000000000);
  }
});

it('las imágenes locales de Kotlin no se publican como URLs del navegador', async () => {
  const f = fixture();
  f.source.getProfile = async () => ({ role: 'OWNER', name: 'Ana', profileImage: 'file:///private/avatar.jpg' });
  f.source.getPets = async () => [{ id: 'pet', data: { ownerId: 'owner', name: 'Milo', photoUri: 'content://local/photo' } }];
  const result = await f.repository.getByOwner('owner');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.profileImage, null);
    assert.equal(result.value.pets[0]?.photoUri, null);
  }
});

it('el resumen excluye paseos vencidos/cancelados y prioriza un paseo en curso', () => {
  const walk = (id: string, status: OwnerDashboard['walks'][number]['status'], scheduledAt: number) => ({ id, status, scheduledAt, petIds: [], durationMinutes: 30 });
  const dashboard: OwnerDashboard = {
    name: 'Ana', lastName: '', phone: '', email: '', pets: [],
    walks: [walk('late', 'SCHEDULED', 1), walk('later', 'SCHEDULED', 300), walk('soon', 'SCHEDULED', 200), walk('cancelled', 'CANCELLED', 400), walk('done', 'COMPLETED', 1)],
  };
  const summary = summarizeOwnerDashboard(dashboard, 100);
  assert.equal(summary.upcomingCount, 2);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.nextWalk?.id, 'soon');
  assert.equal(summarizeOwnerDashboard({ ...dashboard, walks: [...dashboard.walks, walk('active', 'IN_PROGRESS', 0)] }, 100).nextWalk?.id, 'active');
});
