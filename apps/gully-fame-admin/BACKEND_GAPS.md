# Backend gaps (for the backend team)

The backend repo is not in this workspace. Nothing here was changed on the backend. "Current behavior" is what the Postman collection documents, or what the admin code relies on, and it could not be checked against the running server. Please confirm each item against the backend code.

## BG-01: Cookie-based admin session (security)
- **Endpoint:** `POST admin/login`, and every admin request.
- **Expected:** login sets an httpOnly, Secure, SameSite cookie. Admin requests are authenticated by that cookie, and logout clears it.
- **Current (per collection):** the token is returned in the JSON body and sent as `Authorization: Bearer`. The admin stores it in localStorage, where any script on the page can read it.
- **Suggested fix:** add cookie auth (with CSRF protection for state-changing requests) and keep the Bearer header for mobile clients. Once that exists, the admin can drop localStorage.

## BG-02: Get one competition (missing from the collection)
- **Endpoint:** `GET admin/competitions/:id`
- **Expected:** return one competition for the admin edit and detail pages.
- **Current:** the collection only has `PUT` and `DELETE` on this path. `lib/competitionApi.ts` calls `GET`, so `yarn check:api` lists it as a known gap.
- **Suggested fix:** document the `GET` in the collection (it probably exists in the backend), or tell the admin which endpoint to use.

## BG-03: Server-side role scoping for sponsors (security)
- **Endpoints:** `GET admin/competitions`, `GET admin/competitions/:id`, `PUT/DELETE admin/competitions/:id`, `POST admin/competitions/:id/active|reject|declare-winners`, `GET admin/sponsors`, `GET admin/reports`, `GET admin/earnings`.
- **Expected:** a sponsor-role token only sees and changes its own competitions. Admin-only actions (approve, reject, declare winners, user status, KYC decisions, sponsor create/delete) return 403 for a sponsor token.
- **Current:** the admin panel hides these actions and filters the list in the browser based on a localStorage role. The backend's enforcement could not be verified from the frontend.
- **Suggested fix:** enforce the role and the sponsor scope on every admin route, and return 403 with a clear message. Please confirm this is already done.

## BG-04: Query parameters not documented in the collection
The admin sends these, but the collection does not list them, so they can't be checked against the contract:
- `GET admin/competitions`: `status`, `startDate`, `endDate`, `page`, `limit`
- `GET admin/earnings`: `userId`, `type`, `category`, `status`, `competitionId`
- `GET admin/reports`: `page`, `limit`, `status`, `userId`

- **Expected:** each one is documented and supported, with the same names and the same values as the enums.
- **Suggested fix:** add these query params to the collection (or tell us the names that the backend really accepts).

## BG-05: FAQ update body field
- **Endpoints:** `PATCH admin/faqs/:id`, `DELETE admin/faqs/:id`
- **Expected:** the ID comes from the path only.
- **Current:** the admin also sends `faqId` in the body. The collection doesn't list that field.
- **Suggested fix:** confirm whether the backend uses `faqId` from the body. If not, the admin should stop sending it (we will change that on our side once confirmed).

## BG-06: Login rate limiting and lockout
- **Endpoint:** `POST admin/login`, `POST admin/verifyOtp`, `POST admin/forgotPassword`
- **Expected:** the backend rate-limits failed logins and OTP attempts per account and per IP, and returns 429 with `Retry-After`.
- **Current:** not verifiable from the frontend. The admin already handles 429.
- **Suggested fix:** confirm the limits exist.

## BG-07: Competitions/earnings/reports list responses
- **Endpoints:** `GET admin/competitions`, `GET admin/earnings`, `GET admin/reports`
- **Expected:** a consistent pagination shape (`page`, `limit`, `total`, `totalPages`) on every list, the same as `GET admin/users`.
- **Current:** not documented in the collection. The admin pages handle a few variants defensively.
- **Suggested fix:** document one shape and use it on every paged admin list.
