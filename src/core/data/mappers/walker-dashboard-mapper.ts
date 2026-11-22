import type { WalkerDashboard, WalkerRequestSummary, WalkerWalkSummary } from '../../domain/entities/walker-dashboard';
import type { DashboardDocument } from '../datasources/dashboard-document';
import { imageUrl, nonnegative, record, strings, text, timestamp } from './dashboard-values';

function walkerData(document: DashboardDocument, uid: string) {
  const data = record(document.data);
  if (data.walkerId !== uid) throw new Error('Walker mismatch');
  return data;
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
    startedAt: timestamp(data.startedAt), finishedAt: timestamp(data.finishedAt), observations: text(data.observations),
  };
}

export function toWalkerDashboard(
  uid: string,
  profile: Record<string, unknown>,
  rawWalker: unknown,
  rawRequests: readonly DashboardDocument[],
  rawWalks: readonly DashboardDocument[],
): WalkerDashboard {
  const walker = rawWalker === null ? null : record(rawWalker);
  const requests = rawRequests.map((document) => request(document, uid)).sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity));
  return {
    name: text(profile.name), lastName: text(profile.lastName), email: text(profile.email), phone: text(profile.phone), profileImage: imageUrl(profile.profileImage),
    hasWalkerProfile: walker !== null, available: walker?.available === true,
    serviceArea: text(walker?.serviceArea), description: text(walker?.description), pricePerWalk: nonnegative(walker?.pricePerWalk),
    requests, walks: rawWalks.map((document) => walk(document, uid, requests)).sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity)),
  };
}
