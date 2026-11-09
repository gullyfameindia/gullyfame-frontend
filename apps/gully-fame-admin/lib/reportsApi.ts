import { apiRequest } from './http';
import type { ApiResponse } from './apiTypes';




export interface Report {
  id: string;
  _id?: string;
  userId?: string;
  reportedUserId?: string;
  reportedContentId?: string;
  type: 'USER' | 'CONTENT' | 'COMPETITION' | string;
  reason?: string;
  description?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED' | string;
  resolutionNotes?: string;
  reportedBy?: {
    id: string;
    name?: string;
    email?: string;
  };
  reportedUser?: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface UpdateReportStatusRequest {
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  resolutionNotes?: string;
}

export interface ReportsListParams {
  page?: number;
  limit?: number;
  type?: 'USER' | 'CONTENT' | 'COMPETITION';
  status?: 'PENDING' | 'RESOLVED' | 'REJECTED';
  userId?: string;
}

export interface ReportsListResponse {
  reports: Report[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}








/**
 * Every request goes through lib/http.ts: base URL from lib/config.ts, admin token, timeout,
 * JSON guard and normalized errors. A success with no `data` (e.g. a DELETE) is still a success.
 */
async function makeRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  const result = await apiRequest<T>(method, endpoint, { body });
  return result.success
    ? { success: true, data: result.data as T, message: result.message }
    : { success: false, message: result.message, error: result.error };
}

export async function getReports(
  params?: ReportsListParams
): Promise<ApiResponse<ReportsListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.userId) queryParams.append('userId', params.userId);

  const endpoint = `admin/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await makeRequest<any>('GET', endpoint);

  if (response.success && response.data) {
    const reportsData = response.data.reports || response.data.items || (Array.isArray(response.data) ? response.data : []);
    const reports = reportsData.map((report: any) => ({
      ...report,
      id: report.id || report._id || '',
      userId: report.userId || report.reportedBy?._id || report.reportedBy?.id,
      reportedUserId: report.reportedUserId || report.reportedUser?._id || report.reportedUser?.id,
    }));

    const pagination = response.data.pagination || {
      total: reports.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: Math.ceil(reports.length / (params?.limit || 20)),
    };

    return {
      success: true,
      data: {
        reports,
        pagination,
      },
      message: response.message || 'Reports fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch reports',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function updateReportStatus(
  reportId: string,
  data: UpdateReportStatusRequest
): Promise<ApiResponse<Report>> {
  const endpoint = `admin/reports/${reportId}/status`;
  const response = await makeRequest<Report>('PUT', endpoint, data);

  if (response.success) {
    // The server may answer without the updated report; fall back to what was sent.
    const updated: Partial<Report> = response.data ?? {};
    return {
      success: true,
      data: {
        ...updated,
        id: updated.id || updated._id || reportId,
        type: updated.type ?? '',
        status: updated.status ?? data.status,
      } as Report,
      message: response.message || 'Report status updated successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to update report status',
    error: response.error || 'API returned unsuccessful response',
  };
}

