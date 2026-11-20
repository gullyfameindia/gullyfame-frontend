import { apiRequest } from './http';

/** Reports about users, comments and chat conversations (backend B4). Reel reports: lib/reportsApi.ts. */

export type UserReportType = 'user' | 'comment' | 'chat';
export type UserReportStatus = 'open' | 'dismissed' | 'actioned';
export type UserReportAction = 'dismiss' | 'remove_comment' | 'deactivate_user';

export interface ReportPerson {
  id: string;
  name: string;
  username: string;
  profileImage: string;
}

export interface UserReport {
  id: string;
  targetType: UserReportType;
  targetId: string;
  reason: string;
  details: string;
  /** Copy of the reported text (comment, latest chat messages, profile name). */
  snapshot: string;
  reviewStatus: UserReportStatus;
  reviewNote: string;
  reportedBy: ReportPerson | null;
  reportedUser: ReportPerson | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface UserReportsPage {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  reports: UserReport[];
}

export async function listUserReports(params: {
  status?: UserReportStatus | 'all';
  type?: UserReportType | 'all';
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  q.set('status', params.status || 'open');
  if (params.type && params.type !== 'all') q.set('type', params.type);
  q.set('page', String(params.page || 1));
  q.set('limit', String(params.limit || 20));
  return apiRequest<UserReportsPage>('GET', `admin/user-reports?${q.toString()}`);
}

export async function reviewUserReport(reportId: string, action: UserReportAction, note?: string) {
  return apiRequest<{ status: UserReportStatus; alsoClosed: number }>('PATCH', `admin/user-reports/${reportId}`, {
    body: { action, ...(note ? { note } : {}) },
  });
}
