# Token Refresh and Invalid Token Error Fix

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

The fix adds pre-request token validation, explicit 404/invalid-token handling as an auth failure, and improved error messaging to address the "invalid token" error when calling PUT /user/profile. The solution implements token freshness checks before authenticated requests and treats the backend's non-standard 404 response as an authorization failure.

**Watch for**: Dynamic import in ensureTokenFresh creates a circular import risk with axios. Token refresh is called unconditionally on every profile update, which adds network latency on every save even for fresh tokens (though the 60-second threshold mitigates this). No logging shows whether the 404/invalid-token handler is actually triggered in production, making it harder to trace whether the refresh mechanism is activating.

**Verdict**: APPROVED

## High-level view

The root cause — backend returning 404 with "invalid token" instead of standard 401 — is now explicitly handled as an auth failure. Before any authenticated request, `ensureTokenFresh()` checks token expiry locally and refreshes if needed or expired, preventing stale tokens from reaching the backend. Axios request logging shows token state before each request, and response handling detects the 404/invalid-token pattern and triggers refresh via the same mechanism as 401 errors. Account-center error handling now recognizes auth failures and shows a user-friendly "session expired" message instead of burying the error. A concurrent-call guard prevents race conditions if the user rapidly clicks Save.

<details>
<summary>Issues (3)</summary>

1. **Token refresh unconditional on every profile update** — `ensureTokenFresh()` is called before every updateProfile(), adding network I/O even when token is fresh. While the 60-second expiry threshold catches most cases, every update still pays the cost of SecureStore reads and token metadata parsing. Consider memoizing token freshness state or skipping the check if token was just validated.

2. **Circular import between tokenUtils and axios** — `tokenUtils.ensureTokenFresh()` dynamically imports `axios` and `setAuthToken()` (lines 158-159), while `axios.ts` imports `getTokenMetadata()` from tokenUtils. This dynamic-import workaround avoids compile-time cycles but is fragile if either module's exports change. Runtime import failures would surface only when token refresh is attempted.

3. **404/invalid-token handler not instrumented for production monitoring** — The handler logs diagnostics only in __DEV__ mode (line 180). In production, if the backend is returning 404/invalid-token and the refresh succeeds, there's no trace of the failure or recovery. This makes it hard to audit whether the specific backend behavior is still occurring or has been fixed server-side.

</details>

<details>
<summary>Details</summary>

### Pre-request token validation in updateProfile()

`authService.updateProfile()` now calls `ensureTokenFresh()` before the PUT request. This function checks if the stored token is expired or expires within 60 seconds and attempts refresh via POST /auth/refresh-token if needed. The check is local (reads from SecureStore and parses JWT expiry claim) unless a refresh is triggered. If refresh fails or no refreshToken exists, the function throws an error and updateProfile returns a 401 status with "Session expired" message before attempting the PUT.

This directly addresses the root cause: a stale or expired token is refreshed before hitting the backend, so the backend either receives a valid token or receives no request at all. The plan called for this as Phase 2, highest priority.

The implementation uses a 60-second buffer (line 125 in tokenUtils.ts: `expiresIn > 60 * 1000`), which is a reasonable safety margin but does mean the token is refreshed when it still has ~1 minute left. This trades off one extra network call (the refresh itself) to avoid time-of-check-to-time-of-use race conditions between validation and request.

### 404 + "invalid token" treated as auth failure

Axios response handler now detects `error.response?.status === 404 && errorData.message.includes("invalid token")` (lines 179-181) and treats it identically to 401 errors: attempts token refresh with retry logic. This matches the plan's Phase 3. The handler follows the same refresh-and-retry pattern as the 401 handler below it: fetch refreshToken, POST to /auth/refresh-token, store the new token, retry the original request with the new token.

If refresh fails (no refreshToken or endpoint fails), tokens are cleared and the error is returned to the caller. This provides defense-in-depth: even if a token somehow reaches the backend as stale or invalid, the client handles the 404/invalid-token response correctly instead of logging it as a generic failure.

The implementation correctly guards against infinite loops: `!originalRequest._retry` ensures the refresh is only attempted once per request.

### Request and response logging for diagnostics

Before each request, `getTokenMetadata()` is called on the stored token to extract expiry info (line 59 in axios.ts). This is logged in __DEV__ mode with keys: isUsable, isExpired, expiresIn (in seconds), tokenPreview (first 20 + last 10 chars of token). This provides a pre-request snapshot of token state without logging the full token value, meeting the security requirement.

The request logging also shows the URL and whether skipAuth is true, so a developer can correlate the request with the token state log.

On 404/invalid-token detection (line 180), the handler logs the status, error message, URL, and method. This confirms the specific backend behavior is occurring.

### Token metadata extraction and refresh

`tokenUtils.ts` exports three functions: `getTokenMetadata()` (extracts exp claim without side effects), `inspectTokenState()` (async check including SecureStore read), and `ensureTokenFresh()` (check + refresh if needed).

`getTokenMetadata()` uses jwt-decode library (line 7) and safely handles null/malformed tokens by returning a default object. The tokenPreview logic truncates long tokens to avoid leaking the full value in logs.

`ensureTokenFresh()` reads the token, checks expiry, and if stale or expired, calls POST /auth/refresh-token with the refreshToken. The response parsing handles two formats: `data.data.token` and `data.token` (line 151), which is pragmatic given the backend may wrap responses differently.

### Concurrent-call guard in account-center

`handleSave()` now checks `if (isSaving)` before proceeding (line 260). If a save is already in progress, an alert is shown and the function returns early. This prevents two concurrent updateProfile calls from hitting the backend with potentially different token states or creating duplicate updates.

The guard is simple and effective: it uses the existing `isSaving` state variable rather than introducing new concurrent-call tracking.

### Error messaging for auth failures

In account-center, if `updateResult.status === 401` or the error message includes "invalid token" or "session expired", the alert is changed to "Your session has expired. Please log in again." (lines 411-414). This is more user-friendly than the generic "Failed to update profile" message.

In the catch block (lines 422-428), if `error.isNetworkError` is true (set by axios when there's no response), the message is changed to "Network error. Please check your connection and try again." This distinguishes between network failures and application/auth errors.

### Backward compatibility and scope

The changes only add new behavior and don't modify existing response formats or API contracts. The 404/invalid-token handler is purely defensive. Token refresh is attempted before the request, but if the token is fresh or refresh fails, the flow continues as before. The errorStatus field returned by updateProfile is already part of the return object, so account-center's error messaging doesn't depend on new API surface.

The concurrent-call guard doesn't change any external behavior; it's a local UX improvement.

### Unaddressed concerns from the plan

- **Phase 1.1 (Token State Inspection Helper)**: Implemented via `getTokenMetadata()` and `inspectTokenState()` as planned.
- **Phase 1.2 (Enhanced request logging)**: Implemented. Token state is logged before each request.
- **Phase 1.3 (Enhanced error logging for 404/invalid-token)**: Implemented; handler logs the specific pattern.
- **Phase 2.1/2.2 (Pre-request token refresh)**: Implemented via `ensureTokenFresh()` called in updateProfile.
- **Phase 3.1/3.2 (404/invalid-token as auth failure)**: Implemented; refresh is attempted and tokens are cleared if refresh fails.
- **Phase 4.1/4.2 (Account-center error handling + concurrent guard)**: Implemented; error messages improved and concurrent calls guarded.
- **Phase 5.1 (Null token at request time)**: Not explicitly implemented. The request interceptor logs a warning if no usable token is found (line 79), but the request still proceeds without auth. This matches the pre-existing behavior (not a regression).
- **Phase 5.2 (Network errors during token refresh)**: Implemented. ensureTokenFresh() catches refresh errors and throws; account-center's catch block checks for `isNetworkError`.
- **Phase 5.3 (Corrupt token detection)**: Partially implemented. `getTokenMetadata()` returns `isValid: false` if jwt-decode fails, and `inspectTokenState()` detects this and returns `isUsable: false`. However, the request interceptor does not explicitly delete corrupt tokens; it only logs a warning if the token is not usable (line 79).

</details>

## File map

<details>
<summary>Files changed</summary>

- **tokenUtils.ts** (new file): Token metadata extraction, expiry checking, and refresh logic. Three exported functions: `getTokenMetadata()` for JWT parsing, `inspectTokenState()` for local validation, `ensureTokenFresh()` for refresh-on-demand, and `clearAllTokens()` for logout. ~189 lines.

- **axios.ts**: Axios interceptor enhancements. Request interceptor now logs token state before each request. Response handler detects 404 + "invalid token" pattern and treats it as 401 (refresh + retry). Enhanced logging throughout with emoji prefixes for visual scanning in dev mode. ~280 lines (was ~260).

- **authService.ts**: `updateProfile()` now calls `ensureTokenFresh()` before the PUT request. If token refresh fails, returns 401 error immediately. ~16 new lines added.

- **account-center.tsx**: Concurrent-call guard in `handleSave()` (line 260). Error messaging improved to detect auth failures (line 411) and network errors (line 425). Enhanced dev logging of error objects (line 417). ~33 lines changed.

Full diff: `git show fbfab3d -- apps/gully-fame-mobile/src/api/tokenUtils.ts apps/gully-fame-mobile/src/api/axios.ts apps/gully-fame-mobile/src/api/services/authService.ts apps/gully-fame-mobile/app/\\(main\\)/account-center.tsx`

</details>
