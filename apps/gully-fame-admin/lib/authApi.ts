'use client';

import type { ApiResponse } from './apiTypes';
import { apiRequest } from './http';
import { clearSession, getStoredAdmin, goToLogin, setAdminData, type AdminUser } from './session';

// Session helpers live in ./session; re-exported so existing imports keep working.
export { getStoredAdmin, isAuthenticated, type AdminUser } from './session';

/** Login result: either signed in, or a code was emailed (2FA, A6). */
export interface LoginData {
  admin?: AdminUser;
  otpRequired?: boolean;
  txnId?: string;
  /** Masked address the code went to, e.g. "ad***@gullyfame.com". */
  email?: string;
  expiresIn?: number;
}

function finishLogin(payload: any): ApiResponse<LoginData> {
  const admin: AdminUser | undefined = payload?.admin;
  if (!admin) return { success: false, message: 'Login response did not contain the account', error: 'NO_ADMIN' };
  // The server sets the httpOnly session cookie; only the public profile is kept here.
  setAdminData(admin);
  return { success: true, message: 'Login successful', data: { admin } };
}

/** POST admin/login { email, password }. With 2FA on, returns { otpRequired, txnId, email }. */
export async function loginAdmin(email: string, password: string): Promise<ApiResponse<LoginData>> {
  const result = await apiRequest<any>('POST', 'admin/login', { auth: 'none', body: { email, password } });
  if (!result.success) {
    clearSession();
    return { success: false, message: result.message, error: result.error, data: result.data };
  }
  const payload = result.data ?? {};
  if (payload.otpRequired) {
    return {
      success: true,
      message: result.message || 'We emailed you a login code',
      data: { otpRequired: true, txnId: payload.txnId, email: payload.email, expiresIn: payload.expiresIn },
    };
  }
  return finishLogin(payload);
}

/** POST admin/login/verify { txnId, otp }: second step when 2FA is on. */
export async function verifyAdminLogin(txnId: string, otp: string): Promise<ApiResponse<LoginData>> {
  const result = await apiRequest<any>('POST', 'admin/login/verify', { auth: 'none', body: { txnId, otp: otp.trim() } });
  if (!result.success) return { success: false, message: result.message, error: result.error };
  return finishLogin(result.data);
}

/** GET admin/session: confirms the cookie session and refreshes the role from the server. */
export async function getCurrentAdmin(): Promise<ApiResponse<AdminUser>> {
  const result = await apiRequest<any>('GET', 'admin/session');

  if (result.status === null) {
    // Network failure: keep working from the cached profile instead of logging out.
    const storedAdmin = getStoredAdmin();
    if (storedAdmin) return { success: true, message: 'Offline mode - using stored session', data: storedAdmin };
    return { success: false, message: result.message, error: result.error };
  }

  if (!result.success || !result.data?.admin) {
    clearSession();
    return {
      success: false,
      message: result.status === 401 ? 'Session expired. Please log in again.' : result.message,
      error: result.error,
    };
  }

  const admin: AdminUser = result.data.admin;
  setAdminData(admin);
  return { success: true, message: 'Admin session validated', data: admin };
}

/** POST admin/logout (clears the cookie and ends the session on the server), then /login. */
export async function logoutAdmin(): Promise<void> {
  await apiRequest('POST', 'admin/logout', { timeoutMs: 5000 }).catch(() => undefined);
  goToLogin();
}
