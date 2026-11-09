'use client';

/**
 * Admin session storage (token + cached admin profile).
 *
 * SECURITY NOTE: the admin JWT is kept in localStorage because the backend returns it in the
 * JSON body and expects an `Authorization: Bearer` header; there is no cookie-based session.
 * An httpOnly, Secure, SameSite cookie would keep the token away from page scripts, but that
 * needs a backend change (set-cookie on login + cookie auth). Until then the per-request CSP
 * (middleware.ts) is the main defence against script injection reading this value.
 * Never use this token for anything except the Authorization header.
 */

const TOKEN_KEY = 'gf_admin_token';
const ADMIN_DATA_KEY = 'gf_admin_data';

export interface AdminUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return safeLocalStorage()?.getItem(TOKEN_KEY) || null;
}

export function setToken(token: string | null, role?: string): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (token) {
    storage.setItem(TOKEN_KEY, token);
    storage.setItem('isLoggedIn', 'true');
    storage.setItem('userRole', role || 'admin');
  } else {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem('isLoggedIn');
    storage.removeItem('userRole');
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
}

export function setAdminData(admin: AdminUser | null): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (admin) {
    storage.setItem(ADMIN_DATA_KEY, JSON.stringify(admin));
    if (admin.email) storage.setItem('userEmail', admin.email);
  } else {
    storage.removeItem(ADMIN_DATA_KEY);
    storage.removeItem('userEmail');
  }
}

export function getStoredAdmin(): AdminUser | null {
  const raw = safeLocalStorage()?.getItem(ADMIN_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Kept for compatibility with older callers; new code uses lib/http.ts, which adds the header itself. */
export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(extra || {}) };
}

export function logoutAdmin(): void {
  setToken(null);
  setAdminData(null);
  safeLocalStorage()?.removeItem('userRole');
  if (typeof window !== 'undefined') window.location.href = '/login';
}

let ending = false;
/**
 * Called by lib/http.ts when the server rejects the admin token (HTTP 401). Clears the session and
 * returns to /login once, even if several requests fail at the same moment.
 */
export function handleUnauthorized(): void {
  if (ending || typeof window === 'undefined') return;
  if (window.location.pathname === '/login') {
    setToken(null);
    setAdminData(null);
    return;
  }
  ending = true;
  logoutAdmin();
}
