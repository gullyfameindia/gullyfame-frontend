import type { ApiResponse } from './apiTypes';
import { apiRequest } from './http';

export interface NewUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export interface LatestCompetition {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

export interface ContestJoined {
  _id?: string;
  userId?: string;
  competitionId?: string;
  joinedAt?: string;
  [key: string]: any;
}

export interface NewCompetitionHeld {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface RecentActivityResponse {
  newUsers: NewUser[];
  latestCompetitions: LatestCompetition[];
  contestJoined: ContestJoined[];
  totalCompleted: number;
  newCompetitionHeld: NewCompetitionHeld;
}

export interface QuickStatsResponse {
  totalUsers: number;
  activeCompetitions: number;
  totalCompetitions: number;
  activeSponsors: number;
  tipsGiven: number;
  totalReels: number;
}

/** GET through lib/http.ts (base URL, admin token, timeout, JSON guard, normalized errors). */
async function makeGetRequest<T>(apiName: string, endpoint: string): Promise<ApiResponse<T>> {
  const result = await apiRequest<T>('GET', endpoint);
  return result.success
    ? { success: true, message: result.message || `${apiName} fetched successfully`, data: result.data }
    : { success: false, message: result.message, error: result.error, data: result.data };
}

export async function getRecentActivity(): Promise<ApiResponse<RecentActivityResponse>> {
  return makeGetRequest<RecentActivityResponse>('Recent Activity', 'admin/dashboard/recent-activity');
}

export async function getQuickStats(): Promise<ApiResponse<QuickStatsResponse>> {
  return makeGetRequest<QuickStatsResponse>('Quick Stats', 'admin/dashboard/quick-stats');
}

export const dashboardApi = {
  getRecentActivity,
  getQuickStats,
};

