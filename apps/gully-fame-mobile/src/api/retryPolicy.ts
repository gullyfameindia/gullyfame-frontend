/**
 * Retry policy for the API client.
 *
 * Only idempotent reads (GET) are retried. Writes are never replayed: a retried POST could pay,
 * post or send twice. Retries use exponential backoff with jitter so many clients recovering from
 * the same outage do not hit the server in lockstep.
 */

export const MAX_GET_RETRIES = 3;
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8000;
const RETRY_AFTER_CAP_MS = 10000;

/** HTTP statuses that mean "try again later" for a read. */
export const RETRYABLE_STATUS: ReadonlySet<number> = new Set([429, 502, 503, 504]);

/** Exponential backoff with jitter: random between half and all of base * 2^attempt (capped). */
export function backoffDelayMs(attempt: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt));
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}

/** Parses a Retry-After header: delay in seconds, or an HTTP date. Returns milliseconds or null. */
export function parseRetryAfterMs(value: unknown, now: number = Date.now()): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Math.min(Number(raw) * 1000, RETRY_AFTER_CAP_MS);
  const date = Date.parse(raw);
  if (Number.isNaN(date)) return null;
  return Math.min(Math.max(date - now, 0), RETRY_AFTER_CAP_MS);
}
