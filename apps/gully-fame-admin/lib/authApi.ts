'use client';

import type { ApiResponse } from './apiTypes';
import { apiRequest } from './http';
import {
  getStoredAdmin,
  setAdminData,
  setToken,
  type AdminUser,
} from './session';

// Session helpers live in ./session; re-exported so existing imports keep working.
export {
  getToken,
  getStoredAdmin,
  isAuthenticated,
  getAuthHeaders,
  logoutAdmin,
  type AdminUser,
} from './session';

/** POST admin/login { email, password, role } (no token). */
export async function loginAdmin(
  email: string,
  password: string,
  role: 'ADMIN' | 'SPONSOR' = 'ADMIN'
): Promise<ApiResponse<{ token?: string; admin?: AdminUser }>> {
  const result = await apiRequest<any>('POST', 'admin/login', {
    auth: 'none',
    body: { email, password, role },
  });

  if (!result.success) {
    setToken(null);
    setAdminData(null);
    return { success: false, message: result.message, error: result.error, data: result.data };
  }

  const payload = result.data ?? {};
  const raw = result.raw ?? {};
  const token: string | undefined =
    payload?.token || payload?.accessToken || payload?.jwt || raw?.token || raw?.accessToken;
  const admin: AdminUser | undefined =
    payload?.admin || payload?.user || (payload?.email || payload?.name ? payload : undefined);

  if (!token) {
    return { success: false, message: 'Login response did not contain a token', error: 'NO_TOKEN' };
  }

  // The backend only issues admin tokens; there is no sponsor login.
  setToken(token, 'admin');
  if (admin) setAdminData(admin);

  return { success: true, message: result.message || 'Login successful', data: { token, admin } };
}

/** GET admin/getDetails (admin token). Validates the stored session. */
export async function getCurrentAdmin(): Promise<ApiResponse<AdminUser>> {
  const result = await apiRequest<any>('GET', 'admin/getDetails');

  if (result.status === null) {
    // Network failure: keep working from the cached profile instead of logging out.
    const storedAdmin = getStoredAdmin();
    if (storedAdmin) return { success: true, message: 'Offline mode - using stored session', data: storedAdmin };
    return { success: false, message: result.message, error: result.error };
  }

  if (!result.success) {
    setToken(null);
    setAdminData(null);
    return {
      success: false,
      message: result.status === 401 ? 'Session expired. Please log in again.' : result.message,
      error: result.error,
    };
  }

  const payload = result.data ?? {};
  const admin: AdminUser =
    payload?.admin || payload?.user || payload?.sponsor || (payload?.email || payload?.name || payload?._id ? payload : {});
  setAdminData(admin);
  return { success: true, message: result.message || 'Admin session validated', data: admin };
}
