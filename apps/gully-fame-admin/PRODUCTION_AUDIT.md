# Admin panel production audit

Scope: `Gullyfamefrontend/apps/gully-fame-admin` (Next.js 14 app, the only admin app in the monorepo).
Contract: `Gully Fame API Production.postman_collection.json` (repo root, 165 requests). The backend repo is not in this workspace, so the backend was NOT read directly. All endpoints below were checked against the collection and `yarn check:api`.

## 1. Map

| Area | Location | Notes |
|---|---|---|
| Pages | `app/` | login, `/` dashboard, users (list, detail, KYC), competitions (list, create, detail, edit, participants, leaderboard), sponsors, reports, tips (earnings and winners), app-content (banners, categories, CMS pages, splash, logo, FAQs, contact), error, global-error, loading, not-found |
| Layout | `components/` | AuthGuard, DashboardLayout, Header, Sidebar, StatCard, Pagination |
| API layer | `lib/*Api.ts` | 12 domain modules, all through `lib/http.ts` (`apiRequest`). `lib/adminApi.ts` is a re-export barrel that nothing imports |
| Config | `lib/config.ts`, `.env.example`, `.env.local` | `NEXT_PUBLIC_API_BASE_URL` only |
| Auth | `lib/authApi.ts`, `lib/session.ts`, `lib/auth.ts`, `components/AuthGuard.tsx` | JWT in localStorage, role in localStorage |
| Security | `middleware.ts`, `next.config.js` | nonce CSP (report-only by default), security headers |
| Dead code | `_unused/` (tracked, 8 files) | old pages and an integration stub, not routed |

## 2. What works

- Type-check (`tsc --noEmit`) passes with 0 errors.
- Contract check: every admin path used exists in the collection. Two gaps are allow-listed (see section 4).
- HTTP client (`lib/http.ts`) is solid: timeouts, JSON guard, envelope handling, GET-only retry with backoff, 401 ends the session, writes are never replayed.
- Config fails fast in development, and falls back to production in prod (`lib/config.ts`).
- Error, global-error, loading and not-found pages exist.
- Real data is used on the dashboard, users, KYC, competitions, sponsors, reports, earnings and tips pages. The tips page merges real earnings and winners data. No mock arrays were found in `app/`.

## 3. Broken, risky or missing

### Security
1. **Auth is client-side only.** `middleware.ts` does not check any session; it only sets CSP headers. Route protection comes from `AuthGuard`, which runs in the browser and can be bypassed by setting localStorage. The real security boundary has to be the backend (every admin endpoint must reject non-admin tokens). This cannot be verified from the frontend.
2. **Role (RBAC) is a localStorage value.** `userRole` (`admin` or `sponsor`) is read from localStorage in about 8 pages to show or hide actions and to filter competitions to a sponsor's own. A user can set `userRole=admin` and see admin-only UI. Hiding is UI-only. The backend must enforce sponsor scoping. Logged as BG-03.
3. **Admin JWT in localStorage.** It is readable by any script on the page. The CSP (nonce + strict-dynamic) reduces the risk, but httpOnly cookies would be better. That needs a backend change (BG-01).
4. **Console logging of data.** Fixed in this pass: the `console.log` calls in `app/competitions/page.tsx` (logged the stored admin object and email), in `lib/competitionApi.ts` (approve payload) and the dev-only request log in `lib/http.ts` were removed. Still present: `console.warn`/`console.error` in `AuthGuard` and login, which log error messages only.
5. **CSP is report-only by default** (`CSP_ENFORCE` not set). Not enforced in production until the env var is set.
6. **Competitions page filters sponsors client-side** (lines ~37-90): it fetches the list and filters it in the browser by the stored admin id. A sponsor can see other sponsors' competitions through the API unless the backend scopes them (BG-03).

### Functional and contract
7. **Admin endpoints with query/body fields not in the collection** (the contract checker lists them as review items, not failures):
   - `GET admin/competitions`: `status`, `startDate`, `endDate`, `page`, `limit`
   - `GET admin/earnings`: `userId`, `type`, `category`, `status`, `competitionId`
   - `GET admin/reports`: `page`, `limit`, `status`, `userId`
   - `PATCH/DELETE admin/faqs/:id` sends `faqId` in the body
8. **`GET admin/competitions/:id`** is used by `lib/competitionApi.ts` but the collection only has PUT and DELETE on that path.
9. **Duplicate/unused code**: `lib/adminApi.ts` (barrel, unused), `_unused/` pages, `lib/categoryApi.ts` and `lib/bannerApi.ts` have overlapping functions.
10. **Dependencies**: `next@^14.0.0` on `main`. The memory note says Next 14.2.35 has open advisories; the Next 15 upgrade lives on `chore/admin-next15` and was not merged. Left as is (out of scope for this pass).

### Engineering
11. **No error reporting** (no Sentry or equivalent integration point).
12. **No tests for the critical flows.** Only `lib/__tests__/http.test.mts` exists. Auth, the CRUD flows and the page-level flows are untested.
13. **No DEPLOYMENT.md** or BACKEND_GAPS.md (created in this pass).
14. **Uncommitted work.** About 28 modified and 10 untracked files on top of commit `969bdde`. These changes are not reviewed or committed, so they are at risk.

## 4. Contract gaps, summary
See `BACKEND_GAPS.md` for the full list with suggested fixes.

## 5. Out-of-scope items (root level, not changed)
- `Gullyfamefrontend/.gitignore` and `Gullyfamefrontend/.env.example` have uncommitted edits at the monorepo root. Not touched.
- `package.json`/lockfile at the workspace root are unchanged.
