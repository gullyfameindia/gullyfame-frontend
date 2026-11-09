/**
 * The ONE place the app learns where the backend lives.
 *
 * Values come from EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_SOCKET_URL (inlined at build time from
 * .env / eas.json). Rules:
 *  - HTTPS only. http://, localhost, loopback, LAN IPs and tunnels (ngrok) are rejected.
 *  - API_BASE_URL always ends with exactly one "/" (paths are joined without a leading slash).
 *  - Development: a missing or invalid value throws at startup, so the mistake is seen immediately.
 *  - Production: a missing or invalid value falls back to the production backend instead of crashing,
 *    and the problem is reported once.
 */

export const PRODUCTION_API_BASE_URL = "https://api.gullyfame.com/v1/api/";
export const PRODUCTION_SOCKET_URL = "https://api.gullyfame.com";

const UNSAFE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])$|\.ngrok(-free)?\.(io|app|dev)$|\.local$/i;

/** Returns why `value` is not an acceptable HTTPS service URL, or null when it is fine. */
export function urlProblem(value: unknown, name: string): string | null {
  if (typeof value !== "string" || !value.trim()) return `${name} is not set`;
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
  return `${value.trim().replace(/\/+$/, "")}/`;
}

/** "https://x/", "https://x" -> "https://x" (Socket.IO takes a bare origin). */
export function withoutTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export interface AppConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
  /** Scheme + host of the API, used to turn relative media paths into absolute URLs. */
  API_ORIGIN: string;
  /** Problems found while resolving (empty when the configuration is valid). */
  problems: string[];
}

export function resolveConfig(
  input: { apiBaseUrl?: string; socketUrl?: string },
  isDevelopment: boolean
): AppConfig {
  const problems: string[] = [];

  const apiProblem = urlProblem(input.apiBaseUrl, "EXPO_PUBLIC_API_BASE_URL");
  const socketProblem = urlProblem(input.socketUrl, "EXPO_PUBLIC_SOCKET_URL");
  if (apiProblem) problems.push(apiProblem);
  if (socketProblem) problems.push(socketProblem);

  if (problems.length && isDevelopment) {
    throw new Error(
      `Invalid API configuration:\n- ${problems.join("\n- ")}\nSet them in apps/gully-fame-mobile/.env (see .env.example).`
    );
  }

  const API_BASE_URL = withSingleTrailingSlash(apiProblem ? PRODUCTION_API_BASE_URL : (input.apiBaseUrl as string));
  const SOCKET_URL = withoutTrailingSlash(socketProblem ? PRODUCTION_SOCKET_URL : (input.socketUrl as string));
  return { API_BASE_URL, SOCKET_URL, API_ORIGIN: new URL(API_BASE_URL).origin, problems };
}

const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;

// Expo inlines EXPO_PUBLIC_* only for direct `process.env.NAME` reads, so keep these literal.
export const config: AppConfig = resolveConfig(
  {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL,
  },
  isDevelopment
);

export const API_BASE_URL = config.API_BASE_URL;
export const SOCKET_URL = config.SOCKET_URL;
export const API_ORIGIN = config.API_ORIGIN;
