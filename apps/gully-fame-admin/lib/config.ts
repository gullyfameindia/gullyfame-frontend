/**
 * The ONE place the admin panel learns where the backend lives.
 *
 * NEXT_PUBLIC_API_BASE_URL is inlined at build time. Rules:
 *  - HTTPS only. http://, localhost, loopback, LAN IPs and tunnels (ngrok) are rejected.
 *  - API_BASE_URL always ends with exactly one "/" (request paths have no leading slash).
 *  - Development: a missing or invalid value throws, so the mistake is seen immediately.
 *  - Production: a missing or invalid value falls back to the production backend instead of
 *    breaking the panel.
 * The CSP in middleware.ts derives connect-src from API_ORIGIN, so the two can never drift apart.
 */

export const PRODUCTION_API_BASE_URL = 'https://api.gullyfame.com/v1/api/';

const UNSAFE_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])$|\.ngrok(-free)?\.(io|app|dev)$|\.local$/i;

/** Returns why `value` is not an acceptable HTTPS service URL, or null when it is fine. */
export function urlProblem(value: unknown, name: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return `${name} is not set`;
  const raw = value.trim();
  if (!/^https:\/\//i.test(raw)) return `${name} must start with https://`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return `${name} is not a valid URL`;
  }
  if (UNSAFE_HOST.test(url.hostname)) return `${name} must not point to a local, LAN or tunnel host`;
  if (url.search || url.hash) return `${name} must not contain a query string or fragment`;
  return null;
}

/** "https://x/v1/api", "https://x/v1/api//" -> "https://x/v1/api/" */
export function withSingleTrailingSlash(value: string): string {
  return `${value.trim().replace(/\/+$/, '')}/`;
}

export interface AdminConfig {
  API_BASE_URL: string;
  API_ORIGIN: string;
  problems: string[];
}

export function resolveConfig(apiBaseUrl: string | undefined, isDevelopment: boolean): AdminConfig {
  const problem = urlProblem(apiBaseUrl, 'NEXT_PUBLIC_API_BASE_URL');
  if (problem && isDevelopment) {
    throw new Error(
      `Invalid API configuration: ${problem}. Set it in apps/gully-fame-admin/.env.local (see .env.example).`
    );
  }
  const API_BASE_URL = withSingleTrailingSlash(problem ? PRODUCTION_API_BASE_URL : (apiBaseUrl as string));
  return { API_BASE_URL, API_ORIGIN: new URL(API_BASE_URL).origin, problems: problem ? [problem] : [] };
}

// Next.js inlines NEXT_PUBLIC_* only for direct `process.env.NAME` reads, so keep this literal.
export const config: AdminConfig = resolveConfig(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.NODE_ENV === 'development'
);

export const API_BASE_URL = config.API_BASE_URL;
export const API_ORIGIN = config.API_ORIGIN;
