import { apiRequest } from './http';
import type { ApiResponse } from './apiTypes';




export interface User {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  role: string;
  status: 'active' | 'inactive' | 'banned' | 'pending';
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'completed';
  profileImage?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface UserDetail extends User {
  followers?: number;
  following?: number;
  totalEarnings?: number;
  totalTips?: number;
  bio?: string;
  dob?: string;
  gender?: string;
  [key: string]: any;
}

export interface KycDocument {
  documentType: string;
  documentNumber: string;
  frontImage?: string;
  backImage?: string;
  selfieImage?: string;
  [key: string]: any;
}

export interface KycStatus {
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejectionReason?: string;
  documents?: KycDocument[];
  submittedAt?: string;
  reviewedAt?: string;
  [key: string]: any;
}

export interface UserEarning {
  id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
  [key: string]: any;
}

export interface UserEarningsResponse {
  items: UserEarning[];
  total: number;
  totalEarnings?: number;
  [key: string]: any;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'inactive' | 'banned';
}

export interface ResetPasswordRequest {
  newPassword: string;
}

/** Collection: PUT admin/users/:id/kyc { status, reason }. */
export interface UpdateKycRequest {
  status: 'approved' | 'rejected';
  reason?: string;
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

/**
 * The backend stores `isActive` (boolean) on users; the panel shows a `status` label. Derive the
 * label when the server does not send one, so the table and the ban toggle reflect reality.
 */
function withStatus<T extends Record<string, any>>(user: T): T & { status: string } {
  const status = user?.status || (user?.isActive === false ? 'banned' : 'active');
  return { ...user, status };
}

export async function getUsers(params?: UserListParams): Promise<ApiResponse<UserListResponse>> {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  
  let queryParams = `page=${page}&limit=${limit}`;
  if (params?.search) queryParams += `&search=${encodeURIComponent(params.search)}`;
  if (params?.status) queryParams += `&status=${encodeURIComponent(params.status)}`;
  if (params?.role) queryParams += `&role=${encodeURIComponent(params.role)}`;
  
  const endpoint = `admin/users?${queryParams}`;
  const result = await makeRequest<any>('GET', endpoint);
  
  if (result.success && result.data) {
    const data = result.data;
    let items: User[] = [];
    
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data.users)) {
      items = data.users;
    }
    
    return {
      success: true,
      message: result.message || 'Users fetched successfully',
      data: {
        items: items.map(withStatus) as User[],
        total: data.total || items.length,
        page: data.page || page,
        limit: data.limit || limit,
        totalPages: data.totalPages || Math.ceil((data.total || items.length) / limit),
      },
    };
  }
  
  return result as ApiResponse<UserListResponse>;
}



export async function getUserById(userId: string): Promise<ApiResponse<UserDetail>> {
  const endpoint = `admin/users/${userId}`;
  const result = await makeRequest<any>('GET', endpoint);
  
  if (result.success && result.data) {
    const user = result.data.user || result.data;
    return {
      success: true,
      message: result.message || 'User fetched successfully',
      data: {
        ...withStatus(user),
        id: user.id || user._id,
      } as UserDetail,
    };
  }
  
  return result as ApiResponse<UserDetail>;
}



export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive' | 'banned'
): Promise<ApiResponse<User>> {
  // Collection: PUT admin/users/:id/status { isActive: boolean }.
  const endpoint = `admin/users/${userId}/status`;
  const result = await makeRequest<User>('PUT', endpoint, { isActive: status === 'active' });
  if (!result.success) return result;
  const updated: Record<string, any> = result.data ?? {};
  return {
    ...result,
    data: withStatus({ ...updated, isActive: updated.isActive ?? status === 'active' }) as unknown as User,
  };
}



export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  const endpoint = `admin/users/${userId}/reset-password`;
  return makeRequest<{ message: string }>('POST', endpoint, { newPassword });
}



export async function getUserKyc(userId: string): Promise<ApiResponse<KycStatus>> {
  const endpoint = `admin/users/${userId}/kyc`;
  const result = await makeRequest<any>('GET', endpoint);
  
  if (result.success && result.data) {
    return {
      success: true,
      message: result.message || 'KYC data fetched successfully',
      data: result.data.kyc || result.data,
    };
  }
  
  return result as ApiResponse<KycStatus>;
}



export async function updateUserKyc(
  userId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<ApiResponse<KycStatus>> {
  const endpoint = `admin/users/${userId}/kyc`;
  const body: UpdateKycRequest = { status };
  if (status === 'rejected' && rejectionReason) {
    body.reason = rejectionReason;
  }
  return makeRequest<KycStatus>('PUT', endpoint, body);
}



export async function getUserEarnings(userId: string): Promise<ApiResponse<UserEarningsResponse>> {
  const endpoint = `admin/users/${userId}/earnings`;
  const result = await makeRequest<any>('GET', endpoint);
  
  if (result.success && result.data) {
    const data = result.data;
    let items: UserEarning[] = [];
    
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data.earnings)) {
      items = data.earnings;
    }
    
    return {
      success: true,
      message: result.message || 'Earnings fetched successfully',
      data: {
        items,
        total: items.length,
        totalEarnings: data.totalEarnings || data.total || 0,
      },
    };
  }
  
  return result as ApiResponse<UserEarningsResponse>;
}



export const userApi = {
  getUsers,
  getUserById,
  updateUserStatus,
  resetUserPassword,
  getUserKyc,
  updateUserKyc,
  getUserEarnings,
};

