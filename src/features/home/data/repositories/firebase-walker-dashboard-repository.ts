import { failure, success, type Result } from '../../../../shared/types/result';
import type { WalkerDashboardRepository } from '../../domain/repositories/walker-dashboard-repository';
import type { WalkerDashboard, WalkerRequestSummary, WalkerWalkSummary } from '../../domain/entities/walker-dashboard';
import type { WalkerDashboardDataSource } from '../datasources/walker-dashboard-data-source';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { imageUrl, nonnegative, record, strings, text, timestamp } from '../mappers/dashboard-values';

function walkerData(document: DashboardDocument, uid: string) {
  const data = record(document.data);
  if (data.walkerId !== uid) throw new Error('Walker mismatch');
  return data;
}
function authorizedProfile(value: unknown) {
  const profile = record(value);
  if (profile.role !== 'WALKER' || (profile.active !== undefined && profile.active !== true)) throw { code: 'permission-denied' };
  return profile;
}
function dataFailure(error: unknown): Result<never> {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return failure('forbidden', 'No pudimos consultar o actualizar tus datos de paseador. Revisá los permisos de tu cuenta.');
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return failure('unavailable', 'No pudimos conectarnos. Revisá tu conexión y volvé a intentar.');
  if (code.includes('not-found')) return failure('not-found', 'Completá tu perfil de paseador antes de cambiar la disponibilidad.');
  return failure('unexpected', 'No pudimos completar la operación. Intentá nuevamente.');
}
function request(document: DashboardDocument, uid: string): WalkerRequestSummary {
  const data = walkerData(document, uid);
  if (!['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'].includes(String(data.status))) throw new Error('Invalid request status');
  return {
    id: document.id, ownerName: text(data.ownerName), petIds: strings(data.petIds), petNames: strings(data.petNames),
    status: data.status as WalkerRequestSummary['status'], scheduledAt: timestamp(data.scheduledAt),
    durationMinutes: nonnegative(data.durationMinutes), observations: text(data.observations),
  };
}
function walk(document: DashboardDocument, uid: string, requests: readonly WalkerRequestSummary[]): WalkerWalkSummary {
  const data = walkerData(document, uid);
  if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(String(data.status))) throw new Error('Invalid walk status');
  const petIds = strings(data.petIds);
  const petNames = petIds.map((id) => {
    const related = requests.find((item) => item.petIds.includes(id));
    return related?.petNames[related.petIds.indexOf(id)] ?? '';
  }).filter(Boolean);
  return {
    id: document.id, petIds, petNames, status: data.status as WalkerWalkSummary['status'],
    scheduledAt: timestamp(data.scheduledAt), durationMinutes: nonnegative(data.durationMinutes),
  };
}

export class FirebaseWalkerDashboardRepository implements WalkerDashboardRepository {
  constructor(private readonly source: WalkerDashboardDataSource) {}
  async getByWalker(uid: string): Promise<Result<WalkerDashboard>> {
    try {
      const [rawProfile, rawWalker, rawRequests, rawWalks] = await Promise.all([
        this.source.getProfile(uid), this.source.getWalker(uid), this.source.getRequests(uid), this.source.getWalks(uid),
      ]);
      const profile = authorizedProfile(rawProfile);
      const walker = rawWalker === null ? null : record(rawWalker);
      const rating = nonnegative(walker?.rating);
      const requests = rawRequests.map((document) => request(document, uid)).sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity));
      return success({
        name: text(profile.name), lastName: text(profile.lastName), email: text(profile.email), phone: text(profile.phone), profileImage: imageUrl(profile.profileImage),
        hasWalkerProfile: walker !== null, available: walker?.available === true, rating: rating !== null && rating <= 5 ? rating : null,
        serviceArea: text(walker?.serviceArea), description: text(walker?.description), pricePerWalk: nonnegative(walker?.pricePerWalk),
        requests, walks: rawWalks.map((document) => walk(document, uid, requests)).sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity)),
      });
    } catch (error) { return dataFailure(error); }
  }
  async updateAvailability(uid: string, available: boolean): Promise<Result<void>> {
    try {
      authorizedProfile(await this.source.getProfile(uid));
      if (await this.source.getWalker(uid) === null) return failure('not-found', 'Completá tu perfil de paseador antes de cambiar la disponibilidad.');
      await this.source.updateAvailability(uid, available);
      return success(undefined);
    } catch (error) { return dataFailure(error); }
  }
}
