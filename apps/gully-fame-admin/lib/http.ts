'use client';

import { API_BASE_URL } from './config';
import { getToken, handleUnauthorized } from './session';
import type { ApiResponse } from './apiTypes';

/**
 * The ONE request helper of the admin panel. Every lib/*Api.ts call goes through apiRequest().
 *
 * - URL: API_BASE_URL + path (no double slashes), query params encoded, empty values dropped.
 * - Auth: 'admin' sends `Authorization: Bearer <admin token>`; 'none' sends no token (public reads,
 *   login). The token is never logged.
 * - Timeout: 20 s by default, 60 s for uploads; the request is aborted, not left hanging.
 * - JSON guard: a non-JSON body (HTML error page, empty 502) becomes a clean error, never a throw.
 * - Envelope: the backend answers { code, message, data }; code 1 (or success: true) means success,
 *   whether or not `data` is present.
 * - Errors are normalized by status. 401 on an admin request ends the session (back to /login).
 *   429 honours Retry-After. Only GETs are retried (network errors, 429, 502-504) with backoff and
 *   jitter; writes are never replayed.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthMode = 'admin' | 'none';
export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  /** JSON body (ignored when formData is given). */
  body?: unknown;
  /** Multipart body; the browser sets the boundary header itself. */
  formData?: FormData;
  query?: Record<string, QueryValue>;
  auth?: AuthMode;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'INVALID_JSON'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'API_ERROR';

export interface HttpResult<T> extends ApiResponse<T> {
  status: number | null;
  /** Backend envelope code (1 = success). */
  code: number | null;
  error?: ErrorCode;
  /** Set on 429: how long the server asked us to wait. */
  retryAfterMs?: number | null;
  /** The whole parsed JSON body, for callers that read fields outside `data`. */
  raw?: any;
}

const DEFAULT_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 60000;
const MAX_GET_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

/** API_BASE_URL + path without double slashes, plus an encoded query string. */
export function buildUrl(path: string, query?: Record<string, QueryValue>, base: string = API_BASE_URL): string {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = String(path).replace(/^\/+/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return `${cleanBase}/${cleanPath}${qs ? `${cleanPath.includes('?') ? '&' : '?'}${qs}` : ''}`;
}

/** Headers for a request: JSON content type when needed, bearer token only for admin requests. */
export function buildHeaders(auth: AuthMode, hasJsonBody: boolean, token: string | null = getToken()): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasJsonBody) headers['Content-Type'] = 'application/json';
  if (auth === 'admin' && token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Retry-After as seconds or an HTTP date -> milliseconds (capped at 10 s), or null. */
export function parseRetryAfterMs(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const raw = value.trim();
  if (/^\d+$/.test(raw)) return Math.min(Number(raw) * 1000, 10000);
  const date = Date.parse(raw);
  return Number.isNaN(date) ? null : Math.min(Math.max(date - now, 0), 10000);
}

/** Exponential backoff with jitter: between half and all of 500ms * 2^attempt (max 8 s). */
export function backoffDelayMs(attempt: number): number {
  const ceiling = Math.min(8000, 500 * 2 ** Math.max(0, attempt));
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}

const MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'The request was not accepted. Check the fields and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You are not allowed to do this.',
  404: 'Not found.',
  429: 'Too many requests. Please wait a moment and try again.',
};

function codeForStatus(status: number): ErrorCode {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'API_ERROR';
}

/** Interprets a parsed body + HTTP status as the backend envelope. Exported for tests. */
export function interpretResponse<T>(status: number, ok: boolean, json: any): HttpResult<T> {
  const envelope = json && typeof json === 'object' ? json : {};
  const code: number | null =
    typeof envelope.code === 'number' ? envelope.code : typeof envelope.rCode === 'number' ? envelope.rCode : null;
  const hasEnvelopeFlag = code !== null || typeof envelope.success === 'boolean' || typeof envelope.status === 'boolean';
  const flagSuccess = code === 1 || envelope.success === true || envelope.status === true;
  const success = ok && (hasEnvelopeFlag ? flagSuccess : true);
  const data = envelope.data !== undefined ? envelope.data : envelope.rData !== undefined ? envelope.rData : hasEnvelopeFlag ? undefined : json;
  const serverMessage = typeof (envelope.message ?? envelope.msg) === 'string' ? (envelope.message ?? envelope.msg) : '';

  if (success) {
    return { success: true, status, code, data: data as T, message: serverMessage || 'Request successful', raw: json };
  }
  return {
    success: false,
    status,
    code,
    data: data as T,
    message: serverMessage || MESSAGE_BY_STATUS[status] || (status >= 500 ? 'The server ran into a problem. Please try again shortly.' : 'Request failed'),
    error: ok ? 'API_ERROR' : codeForStatus(status),
    raw: json,
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function apiRequest<T = any>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<HttpResult<T>> {
  const auth = options.auth ?? 'admin';
  const url = buildUrl(path, options.query);
  const hasJsonBody = !options.formData && options.body !== undefined && method !== 'GET';
  const timeoutMs = options.timeoutMs ?? (options.formData ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: buildHeaders(auth, hasJsonBody),
        body: options.formData ?? (hasJsonBody ? JSON.stringify(options.body) : undefined),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
      const timedOut = controller.signal.aborted && !options.signal?.aborted;
      if (method === 'GET' && attempt < MAX_GET_RETRIES && !options.signal?.aborted) {
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      return {
        success: false,
        status: null,
        code: null,
        error: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: timedOut
          ? 'The server is taking too long to respond. Please try again.'
          : "Can't reach the server. Check your connection and try again.",
      };
    }
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);

    const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response.headers.get('retry-after')) : null;
    if (method === 'GET' && attempt < MAX_GET_RETRIES && RETRYABLE_STATUS.has(response.status)) {
      await sleep(retryAfterMs ?? backoffDelayMs(attempt));
      continue;
    }

    const text = await response.text().catch(() => '');
    let json: any = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        return {
          success: false,
          status: response.status,
          code: null,
          error: response.ok ? 'INVALID_JSON' : codeForStatus(response.status),
          message: response.ok ? 'The server sent an unexpected response.' : MESSAGE_BY_STATUS[response.status] || 'Request failed',
        };
      }
    }

    const result = interpretResponse<T>(response.status, response.ok, json);
    if (retryAfterMs !== null) result.retryAfterMs = retryAfterMs;

    // An admin token the server rejects can never succeed: end the session once.
    if (response.status === 401 && auth === 'admin') handleUnauthorized();
    return result;
  }
}
