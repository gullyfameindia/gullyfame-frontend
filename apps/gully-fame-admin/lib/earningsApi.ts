import { apiRequest } from './http';
import type { ApiResponse } from './apiTypes';




export interface Earnings {
  id: string;
  _id?: string;
  userId?: string | null;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category: string;
  competitionId?: {
    _id: string;
    title: string;
  } | string;
  description?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Winner {
  id: string;
  _id?: string;
  userId: string;
  userName?: string;
  userImage?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  totalEarnings?: number;
  totalWinnings?: number;
  competitionsWon?: number;
  rank?: number;
  [key: string]: any;
}

export interface TopEarner extends Winner {
  totalEarnings: number;
  competitionsWon: number;
}

export interface EarningsListParams {
  page?: number;
  limit?: number;
  userId?: string;
  type?: 'CREDIT' | 'DEBIT';
  category?: string;
  status?: string;
  competitionId?: string;
}

export interface EarningsListResponse {
  items: Earnings[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
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

export async function getEarnings(
  params?: EarningsListParams
): Promise<ApiResponse<EarningsListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.competitionId) queryParams.append('competitionId', params.competitionId);

  const endpoint = `admin/earnings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await makeRequest<any>('GET', endpoint);

  if (response.success && response.data) {
    const items = (Array.isArray(response.data) ? response.data : response.data.reports || response.data.items || []).map((earning: any) => ({
      ...earning,
      id: earning.id || earning._id || '',
      userId: earning.userId || null,
      competitionId: earning.competitionId || undefined,
    }));

    const pagination = response.data.pagination || {
      total: items.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: Math.ceil(items.length / (params?.limit || 20)),
    };

    return {
      success: true,
      data: {
        items,
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      },
      message: response.message || 'Earnings fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch earnings',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function getUserEarnings(
  userId: string,
  params?: { page?: number; limit?: number }
): Promise<ApiResponse<EarningsListResponse>> {
  return getEarnings({
    ...params,
    userId,
  });
}





export async function getWinners(): Promise<ApiResponse<Winner[]>> {
  const endpoint = 'admin/winners';
  const response = await makeRequest<Winner[]>('GET', endpoint);

  if (response.success && response.data) {
    const winners = (Array.isArray(response.data) ? response.data : []).map((winner: any) => ({
      ...winner,
      id: winner.id || winner._id || '',
      userId: winner.userId || winner.user?._id || winner.user?.id || '',
      userName: winner.userName || (winner.user?.firstName && winner.user?.lastName 
        ? `${winner.user.firstName} ${winner.user.lastName}` 
        : winner.user?.email || ''),
      userImage: winner.userImage || winner.user?.profileImage || winner.profileImage,
    }));

    return {
      success: true,
      data: winners,
      message: response.message || 'Winners fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch winners',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function getTopEarners(): Promise<ApiResponse<TopEarner[]>> {
  const endpoint = 'admin/winners/top-earners';
  const response = await makeRequest<TopEarner[]>('GET', endpoint);

  if (response.success && response.data) {
    const topEarners = (Array.isArray(response.data) ? response.data : []).map((earner: any, index: number) => ({
      ...earner,
      id: earner.id || earner._id || '',
      userId: earner.userId || earner.user?._id || earner.user?.id || '',
      userName: earner.userName || (earner.user?.firstName && earner.user?.lastName 
        ? `${earner.user.firstName} ${earner.user.lastName}` 
        : earner.user?.email || ''),
      userImage: earner.userImage || earner.user?.profileImage || earner.profileImage,
      totalEarnings: earner.totalEarnings || 0,
      competitionsWon: earner.competitionsWon || 0,
      rank: earner.rank || index + 1,
    }));

    return {
      success: true,
      data: topEarners,
      message: response.message || 'Top earners fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch top earners',
    error: response.error || 'API returned unsuccessful response',
  };
}

