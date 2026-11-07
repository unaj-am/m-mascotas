import type { DashboardDocument } from './dashboard-document';
export interface OwnerDashboardDataSource {
  getProfile(uid: string): Promise<unknown>;
  getPets(uid: string): Promise<readonly DashboardDocument[]>;
  getWalks(uid: string): Promise<readonly DashboardDocument[]>;
}
