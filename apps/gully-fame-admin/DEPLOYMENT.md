# Admin panel deployment

## Environment variables

| Variable | Required | Where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes in development; falls back to production if invalid in production | Build time (inlined into the browser bundle) | Backend REST base, e.g. `https://api.gullyfame.com/v1/api/`. Must be https, no localhost/LAN/ngrok. Never put a secret here. |
| `CSP_ENFORCE` | No | Server runtime | Set to `true` to send an enforcing Content-Security-Policy. Default is report-only. |
| `CSP_MEDIA_ORIGINS` | No | Server runtime | Comma-separated https origins the admin loads media from (S3 bucket, Google avatars). Defaults are set in `middleware.ts`. |

Copy `.env.example` to `.env.local` for local development. `.env.local` must not be committed.

## Commands

Run from `apps/gully-fame-admin/`:

```
npm run build     # type-check, lint and production build (fails on any error)
npm run start     # serves the production build on port 3000
npm run lint
npm test          # HTTP client tests (node --test)
npm run check:api # from the monorepo root: every API path used must be in the Postman contract
```

Install from the monorepo root with `yarn install --frozen-lockfile` (as `vercel.json` does).

## Hosting

- `vercel.json` builds the app with `npm run build` and installs from the monorepo root.
- The app uses `output: 'standalone'` and sends its security headers (HSTS, X-Frame-Options DENY, noindex) from `next.config.js`.
- The panel is an internal tool. Restrict it to admin staff (for example with a Vercel deployment protection or an IP allow-list) in addition to the backend login.

## Backend requirements (CORS and auth)

- The backend must allow the admin origin in CORS (`Access-Control-Allow-Origin`), with `Authorization` in the allowed headers and the methods `GET, POST, PUT, PATCH, DELETE`.
- Every admin endpoint must reject non-admin and sponsor tokens on the server, not only in the UI (see `BACKEND_GAPS.md` BG-03).
- Login and OTP endpoints must be rate-limited (BG-06).

## Pre-launch checklist

- [ ] `NEXT_PUBLIC_API_BASE_URL` points to the production API and is https.
- [ ] `CSP_ENFORCE=true` is set, and the browser console shows no CSP violations on each page.
- [ ] `npm run build` passes on the release commit.
- [ ] `npm test` and `npm run check:api` pass.
- [ ] The backend CORS allow-list contains the production admin origin.
- [ ] The backend enforces the sponsor/admin role on every admin endpoint (BG-03).
- [ ] Login rate limiting is confirmed on the backend (BG-06).
- [ ] The uncommitted changes in `apps/gully-fame-admin` are reviewed and committed.
- [ ] Next.js 14 security advisories are reviewed, or the Next 15 branch (`chore/admin-next15`) is merged.
- [ ] Error reporting is wired up (not yet implemented; see `PRODUCTION_AUDIT.md` item 11).
- [ ] A test admin account exists for smoke tests, and no test credentials are committed.
