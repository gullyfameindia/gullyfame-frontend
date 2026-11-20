'use client';

import { getStoredAdmin, isAuthenticated } from './session';
import { logoutAdmin } from './authApi';

export type UserRole = 'admin' | 'sponsor';

/**
 * The signed-in account's role, as last reported by the server (GET admin/session, refreshed
 * by AuthGuard on every page load). Only decides what the UI shows; the server enforces it.
 */
export function getUserRole(): UserRole | null {
  const role = String(getStoredAdmin()?.role || '').toLowerCase();
  return role === 'admin' || role === 'sponsor' ? role : null;
}

export function isLoggedIn(): boolean {
  return isAuthenticated();
}

export function logout(): void {
  void logoutAdmin();
}

export function requireAuth(role?: UserRole): boolean {
  if (!isLoggedIn()) return false;
  return role ? getUserRole() === role : true;
}
