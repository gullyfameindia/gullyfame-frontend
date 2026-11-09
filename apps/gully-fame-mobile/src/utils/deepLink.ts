/**
 * Vetting for incoming deep links (custom scheme, universal links, push-notification URLs).
 *
 * Why: the router parses the query string with `query-string` -> `decode-uri-component`, and the
 * installed version (0.2.x) can be driven into exponential / quadratic work by crafted
 * percent-encoding, freezing the JS thread. A newer decode-uri-component is ESM-only and cannot be
 * forced under Metro, so the malicious input is rejected here, before it reaches the router.
 */

const MAX_LINK_LENGTH = 2048;
const MAX_PERCENT_SEQUENCES = 128;

// A "%" that is not followed by two hex digits is malformed percent-encoding.
const MALFORMED_PERCENT = /%(?![0-9a-fA-F]{2})/;
// ".." as a whole path segment (raw or percent-encoded dots).
const TRAVERSAL_SEGMENT = /(^|[\\/])(\.|%2e){2}([\\/]|$)/i;
/** True when the string contains NUL, other C0 control characters, or DEL. */
function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** True when the incoming path/URL is safe to hand to the router. */
export function isSafeIncomingLink(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0) return false;
  if (path.length > MAX_LINK_LENGTH) return false;
  if (hasControlCharacters(path)) return false;
  if (MALFORMED_PERCENT.test(path)) return false;
  if ((path.match(/%/g) ?? []).length > MAX_PERCENT_SEQUENCES) return false;
  if (TRAVERSAL_SEGMENT.test(path)) return false;
  return true;
}

/** Returns the link unchanged when safe, otherwise the app root. */
export function sanitizeIncomingLink(path: unknown): string {
  return isSafeIncomingLink(path) ? path : "/";
}
