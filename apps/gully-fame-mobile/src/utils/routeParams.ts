/**
 * Route params and push/deep-link payloads are untrusted input: they end up in
 * API paths (`competitions/${id}`), so anything that is not a plain identifier
 * (for example "../admin", "?x=1", or an array) must be rejected before use.
 */

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Returns the id when it is a single plain identifier, otherwise "". */
export function safeIdParam(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  return SAFE_ID.test(trimmed) ? trimmed : "";
}

/** Returns a single string param (first element of arrays), or "". */
export function stringParam(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

/**
 * decodeURIComponent that never throws. Route params are already decoded once by the router, so a
 * second decode of a value that contains a literal "%" (for example a bio like "100% me") would
 * throw "URI malformed" and crash the screen. On failure the original text is returned.
 */
export function safeDecode(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return "";
  const text = String(raw);
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
