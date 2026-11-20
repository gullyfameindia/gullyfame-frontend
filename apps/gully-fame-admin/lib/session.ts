'use client';

/**
 * Admin session (A2).
 *
 * The admin JWT lives only in an httpOnly, Secure, SameSite=Strict cookie set by the backend on
 * login, so page scripts (and any injected script) can never read it. lib/http.ts sends it with
 * `credentials: 'include'` plus the `X-GF-Admin` header the backend requires for cookie sessions.
 *
 * What is kept in localStorage is only a cached copy of the signed-in admin's public profile
 * (email, role) from GET admin/session, used to draw the UI. It is not a credential: the server
 * checks the cookie and the role on every request.
 */

const ADMIN_DATA_KEY = 'gf_admin_data';
// Written by older panel builds; removed on load so no token stays in the browser.
const LEGACY_KEYS = ['gf_admin_token', 'isLoggedIn', 'userRole', 'userEmail'];

export interface AdminUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  /** From the server: "ADMIN" or "SPONSOR". */
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

function clearLegacyKeys(): void {
  const storage = safeLocalStorage();
  for (const key of LEGACY_KEYS) storage?.removeItem(key);
}
clearLegacyKeys();

// No synthetic 'storage' event here: AuthGuard re-checks the session on that event and the check
// writes this value, which would loop. Other tabs still get the browser's own event on a change.
export function setAdminData(admin: AdminUser | null): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (admin) storage.setItem(ADMIN_DATA_KEY, JSON.stringify(admin));
  else storage.removeItem(ADMIN_DATA_KEY);
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

/** A UI hint only (a profile is cached); AuthGuard confirms the session with the server. */
export function isAuthenticated(): boolean {
  return !!getStoredAdmin();
}

/** Clears the local copy of the session (the cookie is cleared by POST admin/logout). */
export function clearSession(): void {
  clearLegacyKeys();
  setAdminData(null);
}

export function goToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined') window.location.href = '/login';
}

let ending = false;
/**
 * Called by lib/http.ts when the server rejects the session (HTTP 401). Clears the local copy and
 * returns to /login once, even if several requests fail at the same moment.
 */
export function handleUnauthorized(): void {
  if (ending || typeof window === 'undefined') return;
  if (window.location.pathname === '/login') {
    clearSession();
    return;
  }
  ending = true;
  goToLogin();
}
