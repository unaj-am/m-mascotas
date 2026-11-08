import { failure, success, type Result } from '../../../shared/types/result';
import type { Observer } from '../../../shared/types/subscription';
import type { LiveList } from '../../../shared/types/live-list';
import type { Walker } from '../../domain/entities/walker';
import type { WalkRequest, WalkRequestDraft, RequestSide } from '../../domain/entities/walk-request';
import type { WalkBookingRepository } from '../../domain/repositories/walk-booking-repository';
import type { WalkBookingDataSource, BookingListener } from '../datasources/walk-booking-data-source';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { toBookingRequest, toPublicWalker } from '../mappers/walk-booking-mapper';
import { toWalk } from '../mappers/walk-mapper';
import type { Walk } from '../../domain/entities/walk';

function bookingFailure(error: unknown): Result<never> {
  const value = error && typeof error === 'object' ? error as { code?: unknown; publicMessage?: unknown } : {};
  const code = String(value.code ?? '');
  if (code.includes('permission-denied') || code === 'forbidden') return failure('forbidden', 'No tenés permiso para gestionar estas solicitudes o paseos. Revisá los permisos de tu cuenta.');
  if (code.includes('unavailable') || code.includes('network') || code.includes('deadline-exceeded')) return failure('unavailable', 'No pudimos conectarnos. Revisá tu conexión y volvé a intentar.');
  if (code.includes('not-found')) return failure('not-found', 'No encontramos uno de los datos necesarios. Actualizá el listado e intentá nuevamente.');
  if ((code === 'validation' || code === 'failed-precondition' || code === 'conflict') && typeof value.publicMessage === 'string') return failure(code === 'validation' ? 'validation' : 'conflict', value.publicMessage);
  return failure('unexpected', 'No pudimos completar la operación. Intentá nuevamente.');
}
function observe<T>(start: (next: BookingListener, error: (error: unknown) => void) => () => void, map: (documents: readonly DashboardDocument[]) => readonly T[], observer: Observer<LiveList<T>>) {
  let active = true, confirmed = false;
  try {
    const stop = start((snapshot) => {
      if (!active || (snapshot.fromCache && !confirmed && !snapshot.documents.length && !snapshot.pendingWrites)) return;
      if (!snapshot.fromCache) confirmed = true;
      try { observer(success({ items: map(snapshot.documents), fromCache: snapshot.fromCache, pendingWrites: snapshot.pendingWrites })); }
      catch (error) { observer(bookingFailure(error)); }
    }, (error) => { if (active) observer(bookingFailure(error)); });
    return () => { active = false; stop(); };
  } catch (error) { observer(bookingFailure(error)); return () => { active = false; }; }
}
export class WalkBookingRepositoryImpl implements WalkBookingRepository {
  constructor(private readonly source: WalkBookingDataSource) {}
  newRequestId() { return this.source.newRequestId(); }
  observeAvailableWalkers(observer: Observer<LiveList<Walker>>) {
    return observe(this.source.observeAvailableWalkers.bind(this.source), (documents) => documents.map(toPublicWalker).filter((walker) => walker.available)
      .sort((a, b) => a.serviceArea.localeCompare(b.serviceArea, 'es') || a.userId.localeCompare(b.userId)), observer);
  }
  async createRequest(ownerId: string, draft: WalkRequestDraft): Promise<Result<void>> {
    try { await this.source.createRequest(ownerId, draft); return success(undefined); }
    catch (error) { return bookingFailure(error); }
  }
  observeRequests(uid: string, side: RequestSide, observer: Observer<LiveList<WalkRequest>>) {
    return observe((next, error) => this.source.observeRequests(uid, side, next, error),
      (documents) => documents.map((document) => toBookingRequest(document, uid, side)).sort((a, b) => b.scheduledAt - a.scheduledAt || a.id.localeCompare(b.id)), observer);
  }
  async acceptRequest(uid: string, id: string): Promise<Result<Walk>> {
    try { return success(toWalk(await this.source.acceptRequest(uid, id), uid, 'walker')); }
    catch (error) { return bookingFailure(error); }
  }
  private async updateWalk(uid: string, id: string, action: 'start' | 'complete'): Promise<Result<Walk>> {
    try { return success(toWalk(await this.source.updateWalk(uid, id, action), uid, 'walker')); }
    catch (error) { return bookingFailure(error); }
  }
  startWalk(uid: string, id: string) { return this.updateWalk(uid, id, 'start'); }
  completeWalk(uid: string, id: string) { return this.updateWalk(uid, id, 'complete'); }
  observeWalks(uid: string, side: RequestSide, observer: Observer<LiveList<Walk>>) {
    return observe((next, error) => this.source.observeWalks(uid, side, next, error),
      (documents) => documents.map((document) => toWalk(document, uid, side)).sort((a, b) => a.scheduledAt - b.scheduledAt || a.id.localeCompare(b.id)), observer);
  }
}
