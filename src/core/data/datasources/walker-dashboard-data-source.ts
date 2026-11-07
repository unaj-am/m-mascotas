import type { DashboardDocument } from './dashboard-document';

export interface WalkerDashboardDataSource {
  getProfile(uid: string): Promise<unknown>;
  getWalker(uid: string): Promise<unknown | null>;
  getRequests(uid: string): Promise<readonly DashboardDocument[]>;
  getWalks(uid: string): Promise<readonly DashboardDocument[]>;
  updateAvailability(uid: string, available: boolean): Promise<void>;
}
