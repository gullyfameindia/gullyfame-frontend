# Implementation Plan: Fix Invalid Token / 404 Error in Profile Update

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Root Cause Analysis

### Confirmed Issues

1. **Missing token refresh before PUT /user/profile**
   - `authService.updateProfile()` at line 403 in authService.ts makes a PUT request with `skipAuth: false`.
   - The axios interceptor (axios.ts, lines 57-62) retrieves the token from SecureStore synchronously.
   - If the token is expired or stale, it is sent without any refresh attempt.
   - The backend returns 404 with message "invalid token" (not 401 Unauthorized as would be typical).

2. **Token refresh mechanism exists but never triggered for updateProfile()**
   - axios.ts lines 131-155 implement a 401 response handler that attempts token refresh via `/auth/refresh-token`.
   - This only triggers on 401 status codes, not 404.
   - Since the backend returns 404 instead of 401, the refresh mechanism never activates.

3. **No pre-request token validation before profile update**
   - The interceptor checks `isUsableToken()` (lines 53-56 in axios.ts) but does not validate token expiry.
   - No check exists to determine if the token is stale before making an authenticated request.
   - account-center.tsx calls `authService.updateProfile()` without verifying token freshness first.

4. **404 vs. 401 mismatch**
   - Backend returns 404 + "invalid token" message instead of standard 401 Unauthorized.
   - This breaks the standard HTTP contract and bypasses the 401 handler in the client.
   - The error is treated as a generic failure, not an auth failure that should trigger refresh.

5. **Insufficient logging to diagnose token state**
   - Axios request interceptor logs headers generically (line 61: `Authorization: "Bearer [TOKEN_PRESENT]"`) without showing token value or age.
   - No logs indicate whether the token retrieved from SecureStore was successfully validated or used.
   - account-center.tsx logs only the error message, not the token that was attached to the request.

### Suspected but Not Yet Confirmed

- Token may be null or malformed in SecureStore at call time (network issue, app crash, secure storage corruption).
- Multiple concurrent updateProfile() calls may cause race conditions in token retrieval or storage.
- The backend may be validating token signature/expiry strictly and rejecting without retry.

---

## Root Cause: Why 404 + "Invalid Token" Occurs

The backend likely implements the following logic:
1. Receives PUT /user/profile with Authorization header.
2. Decodes/validates the Bearer token.
3. If token is expired or invalid signature, returns **404** with message "invalid token" instead of standard 401.
4. This non-standard error code bypasses the client-side 401 handler and is logged as a generic failure.

**Why the client doesn't handle it:**
- The 401 handler in axios.ts (line 131) only triggers on `error.response?.status === 401`.
- A 404 status falls through to the generic error return (line 161), which does not attempt token refresh.
- The error message "invalid token" is buried in the response body, not parsed as an auth signal.

---

## Implementation Plan

### Phase 1: Improve Token Validation and Logging

#### 1.1 Add Token State Inspection Helper
Files: `apps/gully-fame-mobile/src/api/tokenUtils.ts` (new file)
What: Create a utility module that exports `inspectTokenState()` to check if a stored token is usable, and `getTokenMetadata()` to extract expiry info from JWT if present.
   - Read token from SecureStore
   - Use `jwt-decode` (already in dependencies) to parse JWT payload
   - Check token expiry claim (exp field)
   - Return: { isUsable: boolean, isExpired: boolean, expiresIn: number, tokenPreview: string }
Verify: Manual code review that the functions are syntactically correct and handle edge cases (null token, malformed JWT, missing exp).

#### 1.2 Enhanced Axios Request Logging for Token State
Files: `apps/gully-fame-mobile/src/api/axios.ts` (lines 49–70)
What: Modify the request interceptor to call `inspectTokenState()` and log detailed token metadata in __DEV__ mode:
   - Log: isUsable, isExpired, expiresIn, token preview (first 20 + last 10 chars)
   - Log the full URL being requested
   - Log whether skipAuth is true or false
   - Add a new log entry like: `[axios] 🔐 TOKEN STATE BEFORE REQUEST: { isUsable, isExpired, expiresIn, preview }`
Verify: Run the app in dev mode, trigger updateProfile(), confirm token state logs appear before the request.

#### 1.3 Enhanced Axios Response Error Logging
Files: `apps/gully-fame-mobile/src/api/axios.ts` (lines 97–160)
What: Extend error handler to specifically detect 404 + "invalid token" pattern and log it distinctly:
   - Add condition: `if (error.response?.status === 404 && errorData?.message?.toLowerCase().includes("invalid token"))`
   - Log with distinct prefix: `[axios] ⚠️ 404 INVALID TOKEN - This is an auth failure disguised as 404`
   - Include the request URL, the attempted token preview, and suggest token refresh
Verify: Trigger updateProfile with an expired/invalid token (manually set a bad token in SecureStore), confirm the new 404/invalid-token log appears.

---

### Phase 2: Add Pre-Request Token Refresh Logic

#### 2.1 Create `ensureTokenFresh()` Helper Function
Files: `apps/gully-fame-mobile/src/api/tokenUtils.ts` (update from 1.1)
What: Implement an async function that:
   - Calls `inspectTokenState()`
   - If token is expired or expires in < 60 seconds:
     - Attempt to refresh via POST /auth/refresh-token using refreshToken from SecureStore
     - If refresh succeeds, store new token in SecureStore
     - If refresh fails or no refreshToken exists, throw error (will trigger re-login)
   - If token is valid, return immediately (no network call)
   - Include logging at each step: token check, refresh attempt, success/failure
Verify: Unit test (if test framework is available) or manual: set token to expire in 30 seconds, call `ensureTokenFresh()`, confirm it refreshes and logs the success.

#### 2.2 Call Token Refresh Before updateProfile in authService
Files: `apps/gully-fame-mobile/src/api/services/authService.ts` (lines 400–430)
What: Modify `updateProfile()` function:
   - Before the `apiClient.put("/user/profile", ...)` call, add:
     ```typescript
     try {
       await ensureTokenFresh();
       if (__DEV__) console.log("[authService] Token is fresh, proceeding with profile update");
     } catch (refreshError) {
       if (__DEV__) console.error("[authService] Token refresh failed:", refreshError);
       return {
         success: false,
         error: "Session expired. Please log in again.",
         status: 401,
         data: null,
       };
     }
     ```
   - This ensures the token is valid before attempting the PUT request
Verify: Run updateProfile with an expired token; confirm the token refresh is attempted and if successful, the profile update proceeds; if refresh fails, error is returned before the PUT request.

---

### Phase 3: Handle 404 + "Invalid Token" as Auth Failure

#### 3.1 Extend Axios Response Handler to Treat 404/Invalid-Token as 401
Files: `apps/gully-fame-mobile/src/api/axios.ts` (lines 97–160, update error handler)
What: After the existing 401 handler, add a new condition:
   - Check: `error.response?.status === 404 && errorData?.message?.toLowerCase().includes("invalid token")`
   - Treat it identically to 401: attempt token refresh via the same logic (lines 131–155)
   - If refresh succeeds, retry the original request
   - If refresh fails, log the error and return failure (do not retry indefinitely)
Verify: Set token to invalid in SecureStore, call updateProfile(), confirm 404/invalid-token is caught and triggers refresh attempt in the interceptor.

#### 3.2 Add Fallback: Re-login If Token Cannot Be Refreshed
Files: `apps/gully-fame-mobile/src/api/axios.ts` (update error handler final state)
What: If token refresh fails (no refreshToken or refresh endpoint fails), instead of silent failure:
   - Log: `[axios] ❌ Auth token is invalid and refresh failed. User should re-login.`
   - Clear both authToken and refreshToken from SecureStore
   - Set a flag or emit an event that triggers auth flow to redirect to login
   - Return structured error with status 401 and message "Session expired. Please log in again."
Verify: Set token to invalid and remove refreshToken, call updateProfile(), confirm the user is directed to re-login screen.

---

### Phase 4: Improve Account Center UI Error Handling

#### 4.1 Enhanced Error Messages in account-center.tsx
Files: `apps/gully-fame-mobile/app/(main)/account-center.tsx` (lines 400–420)
What: Update the error alert to show more context:
   - If error status is 401 or 404/invalid-token: show "Session expired. Please log in again."
   - Otherwise show the error message
   - In __DEV__ mode, also log the full error object to console for debugging
Verify: Trigger an auth error during profile update; confirm user-friendly message is shown.

#### 4.2 Concurrent Call Guard for Profile Updates
Files: `apps/gully-fame-mobile/app/(main)/account-center.tsx` (lines 410–420, in handleSave)
What: Add guard to prevent concurrent updateProfile calls:
   - Check `isSaving` state before calling `updateProfile()`
   - If a save is already in progress, show alert and return early
   - Prevents race conditions where two requests send stale tokens simultaneously
Verify: Rapidly click Save button twice; confirm only one update is attempted and second click is ignored.

---

### Phase 5: Edge Case Handling

#### 5.1 Handle Null Token at Request Time
Files: `apps/gully-fame-mobile/src/api/axios.ts` (update request interceptor, lines 57–62)
What: If token is null but skipAuth is false:
   - Log: `[axios] ⚠️ Request requires auth but no token in SecureStore`
   - Reject request with meaningful error before sending it
   - Return error with status 401 and message "Not authenticated"
Verify: Clear token from SecureStore, call updateProfile(), confirm request is rejected before hitting network.

#### 5.2 Handle Network Error During Token Refresh
Files: `apps/gully-fame-mobile/src/api/tokenUtils.ts` (update ensureTokenFresh)
What: Wrap token refresh in try-catch:
   - If network error occurs during refresh, log the network error
   - Do not automatically retry (already retried in axios interceptor)
   - Throw error to caller so it can decide whether to proceed or abort
   - In account-center handleSave, catch and show alert: "Network error. Please check your connection and try again."
Verify: Disable network, call updateProfile(), confirm network error is shown and does not crash the app.

#### 5.3 Detect and Clear Corrupt Tokens
Files: `apps/gully-fame-mobile/src/api/tokenUtils.ts` (update inspectTokenState)
What: In `inspectTokenState()`, detect malformed JWT:
   - Try to parse JWT; if it fails, log warning and return `{ isUsable: false, isExpired: false, ... }`
   - In axios request interceptor, if token is not usable, delete it from SecureStore and proceed without auth
   - Log: `[axios] ⚠️ Stored token is malformed; deleted and request sent without auth`
Verify: Manually set a garbage value as authToken in SecureStore, call updateProfile(), confirm it is deleted and request proceeds unauthenticated (will likely fail with 401).

---

## Summary of Files to Modify

| File | Changes | Reason |
|------|---------|--------|
| `apps/gully-fame-mobile/src/api/tokenUtils.ts` | **NEW** — Add `inspectTokenState()`, `getTokenMetadata()`, `ensureTokenFresh()` | Centralize token validation and refresh logic |
| `apps/gully-fame-mobile/src/api/axios.ts` | Enhance request/response logging; extend error handler for 404/invalid-token; add token refresh before retry | Detect and fix token issues early; treat 404/invalid-token as auth failure |
| `apps/gully-fame-mobile/src/api/services/authService.ts` | Call `ensureTokenFresh()` at start of `updateProfile()` | Guarantee token is fresh before making authenticated request |
| `apps/gully-fame-mobile/app/(main)/account-center.tsx` | Improve error messages; add concurrent call guard | Better UX and prevent race conditions |

---

## Verification Steps

After implementing all phases, verify in this order:

1. **Valid Token Scenario:**
   - Log in, wait for token to be stored in SecureStore.
   - Go to Account Center, edit a field, and click Save.
   - Confirm: Profile updates successfully; logs show token is used and request succeeds.

2. **Expired Token Scenario:**
   - Modify SecureStore to set token expiry to past time (or use a test utility).
   - Attempt to update profile.
   - Confirm: Token refresh is attempted; if refreshToken exists and is valid, new token is obtained and profile updates succeed; logs show refresh attempt.

3. **No Refresh Token Scenario:**
   - Set token to expired and remove refreshToken from SecureStore.
   - Attempt to update profile.
   - Confirm: Refresh fails gracefully; user is shown "Session expired" alert; app redirects to login.

4. **Null Token Scenario:**
   - Clear all tokens from SecureStore.
   - Attempt to update profile without logging in.
   - Confirm: Request is rejected before hitting network; error message is shown.

5. **Network Error During Update:**
   - Disable network connection.
   - Attempt to update profile.
   - Confirm: Network error is shown; app does not crash; user can retry after enabling network.

6. **Concurrent Calls:**
   - Rapid-click Save button twice while profile update is in progress.
   - Confirm: Only one request is made; second click is ignored.

---

## Open Questions for User

1. **What does the backend return for invalid tokens?** Is it always 404 + "invalid token", or can it be 401 or other codes? This affects the error detection logic.

2. **Is there a refresh token mechanism on the backend?** The interceptor attempts POST /auth/refresh-token; does this endpoint exist and is it functional?

3. **Are there any other authenticated endpoints that fail with similar errors?** If so, this fix will apply to them as well.

4. **When was the token last verified to be working?** I.e., was updateProfile working before, or has it never worked in production?

---

## Notes

- The core issue is the **mismatch between backend error code (404) and client expectation (401)**.
- **Phase 2 (pre-request token refresh) is the highest-priority fix** as it ensures tokens are fresh before any authenticated request.
- **Phase 3 (404/invalid-token handler)** is defensive: it handles the specific backend behavior.
- All phases combined provide defense-in-depth: token validation → refresh → error handling → retry.
- Token state logs are essential for debugging; they should remain in __DEV__ mode and be reviewed after each failure.
