import { apiRequest } from './http';
import type { ApiResponse } from './apiTypes';




export interface Sponsor {
  id: string;
  _id?: string;
  email: string;
  role?: string;
  sponsorCode?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateSponsorRequest {
  email: string;
  password: string;
}

export interface UpdateSponsorRequest {
  email?: string;
  isActive?: boolean;
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

export async function getSponsors(): Promise<ApiResponse<Sponsor[]>> {
  const endpoint = 'admin/sponsors';
  const response = await makeRequest<any>('GET', endpoint);

  if (response.success && response.data) {
    const items = (Array.isArray(response.data) ? response.data : []).map((sponsor: any) => ({
      ...sponsor,
      id: sponsor.id || sponsor._id || '',
    }));

    return {
      success: true,
      data: items,
      message: response.message || 'Sponsors fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch sponsors',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function getSponsorById(sponsorId: string): Promise<ApiResponse<Sponsor>> {
  const endpoint = `admin/sponsors/${sponsorId}`;
  const response = await makeRequest<Sponsor>('GET', endpoint);

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        ...response.data,
        id: response.data.id || response.data._id || sponsorId,
      },
      message: response.message || 'Sponsor fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch sponsor',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function createSponsor(
  data: CreateSponsorRequest
): Promise<ApiResponse<Sponsor>> {
  const endpoint = 'admin/sponsors';
  const response = await makeRequest<Sponsor>('POST', endpoint, data);

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        ...response.data,
        id: response.data.id || response.data._id || '',
      },
      message: response.message || 'Sponsor created successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to create sponsor',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function updateSponsor(
  sponsorId: string,
  data: UpdateSponsorRequest
): Promise<ApiResponse<Sponsor>> {
  const endpoint = `admin/sponsors/${sponsorId}`;
  const response = await makeRequest<Sponsor>('PUT', endpoint, data);

  if (response.success) {
    // The server may answer without the updated sponsor; fall back to what was sent.
    const updated: Partial<Sponsor> = response.data ?? {};
    return {
      success: true,
      data: {
        ...updated,
        id: updated.id || updated._id || sponsorId,
        email: updated.email ?? data.email ?? '',
      } as Sponsor,
      message: response.message || 'Sponsor updated successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to update sponsor',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function deleteSponsor(
  sponsorId: string,
  email?: string
): Promise<ApiResponse<void>> {
  const endpoint = `admin/sponsors/${sponsorId}`;
  const body = email ? { email } : undefined;
  const response = await makeRequest<void>('DELETE', endpoint, body);

  if (response.success) {
    return {
      success: true,
      message: response.message || 'Sponsor deactivated successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to deactivate sponsor',
    error: response.error || 'API returned unsuccessful response',
  };
}

