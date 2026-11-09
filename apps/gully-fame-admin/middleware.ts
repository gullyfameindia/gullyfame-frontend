import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_ORIGIN } from './lib/config';

/**
 * Per-request Content-Security-Policy with a nonce (official Next.js approach).
 *
 * - script-src uses a fresh nonce + 'strict-dynamic', so inline scripts that Next.js injects
 *   are allowed only when they carry the nonce, and 'unsafe-inline' is not needed for scripts.
 *   (Browsers that understand nonces ignore 'unsafe-inline'/host sources when a nonce is present.)
 * - style-src keeps 'unsafe-inline' because React/recharts write inline style attributes,
 *   which cannot carry a nonce. Script injection is the high-risk vector and is closed.
 * - connect-src is limited to this origin and the API origin from lib/config.ts (NEXT_PUBLIC_API_BASE_URL).
 *
 * Rollout: the policy is sent as Content-Security-Policy-Report-Only until CSP_ENFORCE=true is
 * set in the server environment. Report-only never blocks anything; violations show up in the
 * browser DevTools console.
 */

const isDev = process.env.NODE_ENV !== 'production';

// Same source as every API request (lib/config.ts), so connect-src always matches the API host.
// The admin panel does not use Socket.IO, so no socket origin is needed here.
const apiOrigin = API_ORIGIN;

// Where the admin loads images/video from (media URLs come from the backend, which stores uploads in
// S3 and builds URLs as https://<bucket>.s3.<region>.amazonaws.com/<key>; Google sign-in users
// have a lh3.googleusercontent.com profile photo). Override with CSP_MEDIA_ORIGINS (comma-separated
// https origins) if the production bucket/region differs. Each entry is parsed as a URL and must
// be https, so a bad value can never inject extra CSP directives.
const DEFAULT_MEDIA_ORIGINS = [
  'https://gullyfalme.s3.ap-southeast-2.amazonaws.com',
  'https://lh3.googleusercontent.com',
];

const mediaOrigins = (process.env.CSP_MEDIA_ORIGINS
  ? process.env.CSP_MEDIA_ORIGINS.split(',')
  : DEFAULT_MEDIA_ORIGINS
)
  .map((value) => value.trim())
  .flatMap((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? [url.origin] : [];
    } catch {
      return [];
    }
  })
  .join(' ');

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' only in development (React Refresh needs it).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    // Admin previews uploaded media (banners, KYC documents, avatars) from the origins above.
    `img-src 'self' data: blob: ${mediaOrigins}`.trim(),
    `media-src 'self' blob: ${mediaOrigins}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}${isDev ? ' ws: wss: http://localhost:*' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const headerName =
    process.env.CSP_ENFORCE === 'true'
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only';

  // Next.js reads the nonce from the *request* CSP header and applies it to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(headerName, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
