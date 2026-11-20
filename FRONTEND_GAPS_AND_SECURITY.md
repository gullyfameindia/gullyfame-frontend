# Gully Fame frontend (app and admin panel): gaps, issues and security

**Checked:** 20 Nov 2026, against the working copy of `gullyfame-frontend`.
**Updated:** 20 Nov 2026, after the frontend fix pass, then the backend fix pass (F2, F3, B7, token refresh, admin A4/A5), then a third pass (N1, N2, F22, more tests for F19), then a fourth pass (admin A2, A5, A6). Nothing is **committed yet** (see F10).
- **App:** `apps/gully-fame-mobile`, Expo SDK 57, React Native 0.86, package `com.gullyfame.mobile`.
- **Admin panel:** `apps/gully-fame-admin`, **Next.js 15.5** (was 14), React 19, `https://admin.gullyfame.com` (Vercel).

IDs in brackets (FE-xxx) match the earlier audit files. "Needs backend" points to `BACKEND_GAPS_AND_SECURITY.md`.

## Summary

Status: ✅ fixed · 🟡 partly fixed · ⏳ waiting on something outside the frontend code · 🗑️ ready, needs your OK to delete.

| Severity | App: open / total | Admin: open / total |
|---|---|---|
| Critical (blocks Play Store release) | 3 / 7 (Firebase, Sentry, signing; F4 filled, legal review left) | 0 / 0 |
| High | 1 / 3 (F10: commit) | 1 / 3 (A3: Vercel setting) |
| Medium | 2 / 10 (device testing, Play Console check) | 0 / 3 (A6 done; switch on when mail works) |
| Low | 3 / 8 (F23, F25 kept, F28) | 0 / 2 |
| New findings (N1–N5) | 1 / 5 (N3: pick npm or yarn) | – |

**What was checked after the fixes:** app type check (0 errors), app tests (11 suites, 116 tests; was 7 and 98 before the third pass, 4 and 76 at the start), backend tests (31: category search, admin cookie session, 2FA, wallets/referrals/broadcasts), admin tests (17) and admin production build (all 20 pages), Android JS bundle export, admin production build, admin tests (16), admin login page served with its security headers, and `yarn install --frozen-lockfile` (the exact Vercel install command) against the updated `yarn.lock`. **Token refresh (backend B12):** logins now store a refresh token in secure storage; on a 401 the API client renews the session once (`POST auth/refresh`) and replays the request, and only signs the user out if that fails. Logout sends the refresh token so it is revoked.

**Voting (backend B7):** decided that everyone can vote. The app already shows voting to fans, so no change was needed.

**Not yet tested on a phone:** `app.json` and native changes (splash, location permission, Expo patch updates) need a new dev or release build first.

---

# Part 1: mobile app

## Critical: fix before the Play Store release

| # | Issue | Status | What was done / what's left |
|---|---|---|---|
| F1 | **Google login button visible but unsafe**; Instagram icon started Google sign-in (FE-002) | ✅ for launch | All social buttons (Google, Instagram, Apple) and the "OR Continue With" row are hidden on the sign-up, sign-in, OTP and email login screens by the new switch `SOCIAL_LOGIN_ENABLED = false`. Google sign-in now also sends `idToken` (and refuses to continue without one). **To turn it back on:** backend B1 must verify the ID token, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in EAS, add the Play App Signing SHA-1 (F7) to the Google OAuth client. |
| F2 | **Delete account only sent an email** (FE-004) | ✅ | Settings → Delete Account now calls `DELETE user/account` (backend B3) after a two-step confirmation, then clears the local session. The server deletes the account and personal data at once. Keep `gullyfameindia.com/delete-account` live for Play. |
| F3 | **Report and block didn't really work** (FE-005) | ✅ | `src/utils/moderation.ts` now uses the server (backend B4): block/unblock/list, enforced both ways on the server. Blocks saved on the phone by older versions are uploaded once. Reports for accounts, chats and **comments** (new Report link on other people's comments and replies) open the same reason sheet as reel reports (`ReportReelModal` with a `kind`, shown by `ReportHost`). Inbox reports one chat at a time, and the report carries that person's recent messages for the admin. |
| F4 | **Privacy policy and terms have blanks** (FE-046) | ✅ filled (legal review left) | Filled in the app (`src/content/legal/privacyPolicy.ts`, `termsOfService.ts`), website (`privacy`, `terms`, `contact` pages) and `docs/legal/*.md`: Gully Fame India Private Limited, House 55B, Ground Floor, Najafgarh Road, (West Delhi) Delhi - 110015; Grievance Officer Dhruv Kathuria, admin@gullyfame.com, +91 98212 34605; GSTIN 07AAMCG3793P1ZP; CIN U62099DL2025PTC455455 (was already there); effective and last-updated date **3 September 2026** (the PDFs only say "2026"; taken from their version V03.09.2026). Removed the drafting note in privacy section 19. Website contact page: new Grievance Officer block, and "[X working days]" became "acknowledge within 24 hours, resolve within 72 hours" (as the FAQ promises). The server has no admin-written policy text, so the app shows this built-in text. **Still to do:** a lawyer reads the final text. |
| F5 | **Push notifications can't work** (FE-045) | 🟡 wrong file | Firebase project `gullyfame-india` created. `app.json` now has `googleServicesFile: ./google-services.json`; the file is git-ignored but uploaded by EAS (`.easignore` does not exclude it). **The downloaded file is for `com.gullyfame.app`, not `com.gullyfame.mobile`**: add an Android app with package `com.gullyfame.mobile` in the Firebase project and replace the file. The new test `firebaseConfig.test.ts` fails until then. Server: service account key file on the EC2 server + `GOOGLE_APPLICATION_CREDENTIALS`. Then test on a release build. |
| F6 | **No crash reporting** (FE-018) | 🟡 | Sentry DSN set for preview and production builds (`EXPO_PUBLIC_SENTRY_DSN` in `eas.json`; a DSN is public). Crash reports start with the next build (not in development). Source maps (readable stack traces) are off (`SENTRY_DISABLE_AUTO_UPLOAD=true`) until a `SENTRY_AUTH_TOKEN` EAS secret is added and the org/project slugs in `app.json` (`gully-fame-india`) are confirmed. |
| F7 | **Release signing not set up** | ⏳ Play Console | `eas credentials -p android`, enrol in Play App Signing, copy its SHA-1 for F1. |

## High

| # | Issue | Status | What was done / what's left |
|---|---|---|---|
| F8 | **Lenses look like they work but don't** (FE-012) | ✅ | Lenses button hidden by the new switch `LENSES_ENABLED = false` (`CaptureControls` hides it when no handler is passed). Lens code kept for when the export bakes lenses in. |
| F9 | **Default Expo splash screen** (FE-047) | ✅ | `app.json` now configures `expo-splash-screen` with the Gully Fame logo (`assets/images/app-icon-adaptive-foreground.png`, 240 dp) on `#161616`, light and dark. EAS regenerates the native files from `app.json` (`android/` is in `.easignore`); the local `android/` splash images and colour were updated to match. |
| F10 | **Changes are not pushed** | ⏳ you | The earlier list is now on `origin/main`. This fix pass is **uncommitted** (about 110 files, list at the end). Review, commit, push, then build only from a clean, tagged commit. |

## Medium

| # | Issue | Status | What was done / what's left |
|---|---|---|---|
| F11 | Notification permission asked during sign-in with no explanation (FE-059) | ✅ | Sign-in screens never show the system dialog now (`getNativePushToken` only asks when `prompt: true`). After sign-in, the app explains why ("Stay in the loop?") once, and shows the system dialog only if the user taps **Turn on** (`askForNotificationsOnce`, called from `app/(main)/_layout.tsx`). Turning push on in Settings → Notifications also asks. Covered by `pushToken.test.ts`. |
| F12 | Precise location requested; only approximate needed (FE-061) | ✅ | `ACCESS_FINE_LOCATION` added to `blockedPermissions` in `app.json` (and removed in the local manifest); the location screen asks for `Accuracy.Low`. **Update the Play Data safety form:** approximate location only. |
| F13 | Camera filters showing "Not supported yet" (FE-034) | ✅ | The filter list now only contains filters with an on-device preset, so the grid, the popup list and swiping never offer an unsupported one. This also fixed a bug: swiping between filters set the filter without its `presetId`, so swiped filters likely did not apply. |
| F14 | Recorded clips lost if Android closes the app before posting (FE-062) | ✅ | New `src/utils/cameraSession.ts` saves the clip list as you record. Next time the camera opens it asks "Continue your recording?" (only for the same competition, only clips whose files still exist, sessions under 3 days old). Cleared when clips are discarded or the post or draft starts. Covered by `cameraSession.test.ts`. |
| F15 | Tablets and foldables untested (FE-048) | ⏳ testing | Test on tablet/foldable emulators, or limit devices in Play Console. |
| F16 | 16 KB page-size check not done (FE-008) | ⏳ Play Console | Check the release bundle in App bundle explorer; plan an ffmpeg-kit replacement. |
| F17 | Accessibility: unlabelled icon buttons, small targets, low-contrast grey text (FE-039, FE-050, FE-051) | ✅ | All **137** icon-only buttons in the app now have `accessibilityRole` and a spoken label (back, close, password show/hide, share, more options, editor +/- controls, checkboxes with checked state, etc.). Back/close buttons got `hitSlop={10}`. **36** dark-screen uses of `#444`–`#777` text were raised to `#999` (screens with white cards were left alone). Also restored the missing "Skip for now" text on the face-scan screen (the button was empty). |
| F18 | Long lists drawn all at once (FE-025) | ✅ | Inbox chat list is now a `FlatList`. Home already used a `FlatList` with rows capped at 10. Category screen: nothing to convert, its lists are empty placeholders (see N1). |
| F19 | Few tests (FE-038) | 🟡 | Added `pushToken`, `cameraSession`, `walletAndReferral`, and in the third pass `authLogin` (password and OTP login, which token is stored, wrong password), `postingAndDrafts` (publish body, hashtags, draft save/update/promote, no draft) and `categoryCompetitions`: 10 suites, 111 tests. Still missing: a device smoke test (needs a phone or emulator). |
| F20 | Dependency advisories (FE-049) | ✅ | Took the Expo SDK 57 patch releases (`expo` 57.0.33, `expo-router` 57.0.31, `expo-notifications` 57.0.25, `expo-camera`, `expo-location` and 7 more); `npx expo install --check` is clean. No `npm audit fix --force`. **Needs a new dev build** before testing on a phone (native modules changed). |

## Low

| # | Issue | Status | What was done / what's left |
|---|---|---|---|
| F21 | Support WhatsApp number not confirmed (FE-020) | ✅ | Confirmed 20 Nov 2026: `+91 98212 34605` (`settings/help-support.tsx`), the same number as the grievance officer. |
| F22 | Hashtags dropped when posting (FE-013) | ✅ | The backend has no tags field, so the app now adds the hashtags to the end of the caption (`captionWithTags` in `videoUploadService.ts`; tags already typed in the caption are not repeated). Reel search matches captions, so hashtags are searchable. Applies to posts and drafts. A real `tags` field on the server is still a nice-to-have. |
| F23 | Custom link scheme, no verified App Links (FE-054) | ⏳ F7 | Needs the release key's SHA-256 for `assetlinks.json` on `gullyfameindia.com`. |
| F24 | Old duplicate `android/`, `ios/`, `app.json` at the monorepo root (FE-035) | ✅ deleted | Confirmed unused and risky: the root `app.json` is an older config (owner `avi70`, package `com.gullyfame.app`), the root `npm run android` builds it, and the root `eas.json` still has placeholder Apple IDs and submits to the **production** track. Delete root `android/`, `ios/`, `app.json`, `eas.json` and point the root `android`/`ios` scripts at the mobile workspace. Not deleted yet: needs your OK. |
| F25 | Unused `apps/videoeditor` workspace (FE-036) | ⏸️ kept (your decision) | Confirmed unused by the app (only referenced in a `babel.config.js` comment). It drags an Expo 54 copy into the install. Remove it from root `workspaces` and delete the folder (141 MB with its `node_modules`), then run `npm install` once to refresh both lockfiles. Needs your OK. |
| F26 | Unused images make the repo heavy (FE-058) | ✅ deleted | Confirmed: `src/assets/stickers/` (4,302 emoji PNGs, 52 MB) is not used; stickers come from the API (`stickerEmojiService`). 42 other images (about 14 MB) have no references either, including the Expo placeholder `assets/images/splash-icon.png` and `android-icon-*.png`. Needs your OK to delete. |
| F27 | Accent colours differ between screens (FE-040) | ✅ | Flat uses of `#FF8C00`, `#FFA500`, `#F59E0B` (30, in coins, verify-otp, competition verify/postdetails/payment, live styles) are now `#EC9A15`. Kept on purpose: the gold-medal gradient on the leaderboard and the pink→orange decorative gradients. |
| F28 | Very large screen files (FE-024) | ⏳ ongoing | `reel/index.tsx`, `camera/index.tsx`: split over time. |

## New findings from this pass

| # | Issue | Where | Suggested fix |
|---|---|---|---|
| N1 | ✅ **Category screen never showed real data** (hard-coded empty lists) | `app/(main)/category/[id].tsx` | Fixed. Backend: `GET search?type=competitions` takes a new `category` filter (id or name) and returns start/end dates. App: `listCompetitionsByCategory` loads the category's competitions and splits them into Live / Upcoming / Past (real image, prize, joined count, dates); the Reels tab shows the latest entries of up to 3 live competitions in the category (sorted by votes, vote count on each tile) and opens the player at that reel. Loading spinner, "No competitions in this category yet", and "Couldn't load… Tap to try again". Past cards show "Ended · N joined" (there was a `Winner` field that never had data). Top performers stay hidden (needs a backend endpoint). |
| N2 | ✅ Buttons that did nothing: search on the editor screen, "multi-select" in the editor controls, mic in chat | `upload/edit.tsx`, `VideoEditor/ControlsRow.tsx`, `chat/[id].tsx` | Removed, with their unused styles and imports. |
| N3 | Two lockfiles (`package-lock.json` and `yarn.lock`). Expo CLI, EAS and Vercel (`yarn install --frozen-lockfile`) use **yarn**, the team uses npm. npm keeps `yarn.lock` in step, and it was verified this time, but it is easy to break. | repo root | Pick one package manager and delete the other lockfile. |
| N4 | ~~The local backend copy has no `user/referral` routes~~ | `gullyfame-backend/src/routes/users.js` | Wrong: the routes are there (`GET user/referral`, `POST user/referral/apply`). No action. |
| N5 | (Backend) Admin login created and stored a new token even when the password was **wrong** | `AdminController.js` login | ✅ Fixed in the backend pass (token only after a correct password, covered by a test). |

## App: already fixed (no action)

- **Tag People** fake option hidden (FE-043, `TAGGING_ENABLED = false`).
- **Default avatar** is a neutral silhouette, not a real person's photo (FE-044).
- **Camera flip** no longer shows the developer message (FE-042). Check on a phone that every clip is kept.
- **Coin buying:** Add Coins buttons show "Coming soon" (`COIN_PURCHASE_ENABLED = false`); Razorpay code kept for later.
- **Tipping** with earned coins only; 1,000-coin withdraw goal shown; no rupee value shown.
- **XP, levels, streaks and daily missions** hidden everywhere (`XP_AND_MISSIONS_ENABLED = false`); vote popup says "Voted! 🔥".
- **Referrals:** code and share on Invite & Earn, optional code field in sign-up, "Got a code from a friend?" box, wallet history shows "Referral reward".
- **Logout** revokes the token on the server.
- **Type check** passes (`npm run typecheck`, 0 errors).
- No secrets in the app: Razorpay key comes from the server; only `EXPO_PUBLIC_*` values; HTTPS only; token in secure storage; Android backup off.

## App switches (`src/config/features.ts`)

| Switch | Now | Meaning |
|---|---|---|
| `COIN_PURCHASE_ENABLED` | `false` | Add Coins opens payment (true) or shows "Coming soon" (false) |
| `TIPPING_ENABLED` | `true` | Support (tip) buttons on reels and profiles |
| `XP_AND_MISSIONS_ENABLED` | `false` | Level card, daily mission, XP popup, profile level section, "Lv." in comments |
| `WITHDRAW_MIN_COINS` | `1000` | Withdraw goal shown to users |
| `SOCIAL_LOGIN_ENABLED` | `false` | **New.** Google / Instagram / Apple buttons on the sign-in and sign-up screens (F1) |
| `LENSES_ENABLED` | `false` | **New.** Lenses button on the camera (F8) |

Turn server and app switches on together.

---

# Part 2: admin panel

## High

| # | Issue | Status | What was done / what's left |
|---|---|---|---|
| A1 | **Next.js 14 with known security advisories** (FE-017) | ✅ | Upgraded to **Next.js 15.5.29** (the maintained 15.x line; 14.x gets no more fixes) with React 19.2.3, `eslint-config-next` 15.5.29, `lucide-react` 0.577, `@types/react` 19. The root layout now `await`s `headers()`; two `<a>` links became `<Link>`; `outputFileTracingRoot` points at the monorepo root. **The old build was broken locally** (Next 14 picked up mismatched React copies from the mobile app); it now builds and serves. Test login, content and moderation on a Vercel preview before promoting. |
| A2 | **Admin token and role in `localStorage`** (FE-016) | ✅ | The backend now sets an `httpOnly; Secure; SameSite=Strict` session cookie on login and no longer sends the token to browsers. The panel (`lib/http.ts`) sends `credentials: 'include'` and the `X-GF-Admin` header (CSRF guard); nothing secret is stored in the browser, and tokens left by older builds are deleted on load (`lib/session.ts`). The role comes from the server (`GET admin/session`, checked by AuthGuard on every page), so sponsors no longer see the admin menu. **Logout** calls `POST admin/logout`, which clears the cookie and ends every session of that admin. **Deploy the backend first, then the panel right after.** |
| A3 | **Content-Security-Policy not enforced** (FE-016) | ⏳ Vercel setting | The CSP header is in place (report-only). Check the reports, then set `CSP_ENFORCE=true` in Vercel. |

## Medium

| # | Issue | Status | Fix |
|---|---|---|---|
| A4 | Dashboard shows no real numbers (FE-015) | ✅ | Backend B20 added the endpoints; the dashboard now shows a "Platform" row (users, live and total competitions, reels, coins tipped, active sponsors) for admins. |
| A5 | No admin pages for wallets/transactions, referrals, broadcast notifications, moderation lists (FE-032), withdrawals | ✅ | Done: **User Reports** (`/user-reports`), **Wallets** (`/wallets`: every balance, total coins, search, link to the user), **Referrals** (`/referrals`: inviter, new user, code, pending/rewarded, coins paid), **Broadcasts** (`/broadcasts`: title + message to everyone / participants / fans, with a "Send to N users?" confirmation and a sent history; pushes need Firebase, F5). Transactions were already on Tips & Earnings (referral rewards now included in "credit"). **Withdrawals** (`/withdrawals`): requests with the full UPI / bank details (copy button), fraud flags, link to the user's KYC, Approve, "Mark paid" with the UTR, and Reject with a reason (coins go back). |
| A6 | No two-factor login for admins | ✅ (off until mail works) | After a correct password the server emails a 6-digit code; the login page asks for it (`/login`, second step). Code is hashed, expires in 10 min, single use, locks after 5 wrong tries. Switch on with `ADMIN_2FA_ENABLED=true` on the server **only after** the `MAIL_*` settings work there, or no admin can sign in. |

## Low

| # | Issue | Status | What was done / what's left |
|---|---|---|---|
| A7 | Native browser `alert()` and `confirm()` | ✅ | New `components/Feedback.tsx`: toasts (`notify.success` / `notify.error`) and an in-page confirm dialog (`await confirmDialog(...)`, red button for delete/reject/deactivate/reset, Escape cancels), mounted once in `app/layout.tsx`. All 55 `alert()` and 13 `confirm()` calls in 14 files replaced; none left. |
| A8 | Old `_unused/` folder (FE-037) | ✅ deleted | Confirmed unused (only excluded in `tsconfig.json`). Approved; the delete is ready but was blocked by the tool's permission check, see "Deletions" below. |

## Admin: already fixed (no action)

- PATCH requests work (backend CORS fixed).
- The backend accepts browser requests only from `https://admin.gullyfame.com` (and `localhost:3000` for development).
- Competition Rules description updated.
- `.env.example` warns that `NEXT_PUBLIC_*` values are public.

---

## Play Console items (not code)

| Item | Status |
|---|---|
| Store listing: descriptions, 512 px icon, 1024×500 feature graphic, screenshots | To do |
| Privacy policy URL (website page, after F4) | Ready once the website is deployed: `https://gullyfameindia.com/privacy` |
| Account deletion URL `gullyfameindia.com/delete-account` | Confirm it's live |
| Data safety form (use `PLAY_STORE_DATA_SAFETY.md`) | To fill. **Location is now approximate only (F12).** |
| Content rating and target audience (13+ or 18+, not under 13) | To answer |
| Reviewer login (email/password, created 3+ days before submitting) | To create |
| Closed testing: 12 testers for 14 days | To run |
| Payments declaration: no in-app purchases at launch | To answer |

## Not committed yet (this fix pass)

- **App, behaviour:** `src/config/features.ts`, `src/utils/pushToken.ts`, `src/utils/cameraSession.ts` (new), `src/api/services/authService.ts`, `app/(main)/_layout.tsx`, `app/(main)/settings/notifications.tsx`, `app/(main)/camera/index.tsx`, `app/(main)/upload/post.tsx`, `app/(main)/inbox.tsx`, `app/auth/{createaccount,signin,login-via-email,login-via-otp}.tsx`, `app/auth/location/index.tsx`, `app/onboarding/face-scan.tsx`, `CaptureControls.tsx`.
- **App, config/native:** `app.json`, `package.json` (Expo patches), `android/app/src/main/AndroidManifest.xml`, `android/.../res/values/colors.xml`, `android/.../drawable-*/splashscreen_logo.png`.
- **App, accessibility and colour only:** about 70 screens and components (labels, `hitSlop`, text colour).
- **App tests:** `src/__tests__/unit/{pushToken,cameraSession,walletAndReferral}.test.ts` (new).
- **Admin:** `package.json`, `next.config.js`, `app/layout.tsx`, `app/error.tsx`, `components/Feedback.tsx` (new), 14 pages/components using `notify`/`confirmDialog`; backend pass: `app/page.tsx` (platform stats), `app/user-reports/page.tsx` and `lib/userReportsApi.ts` (new), `components/Sidebar.tsx`.
- **App, backend pass:** `src/utils/moderation.ts`, `src/components/ReportHost/ReportHost.tsx` (new), `ReportReelModal.tsx`, `src/api/services/reportService.ts`, `src/api/client.ts` (refresh), `src/utils/{userSession,logout}.ts`, `src/api/services/authService.ts`, `app/(main)/settings/{delete-account,blocked-users}.tsx`, `app/(main)/{inbox,_layout}.tsx`, `app/(main)/chat/[id].tsx`, `app/(main)/reel/index.tsx`, `app/auth/{signin,createaccount,verify-otp}.tsx`.
- **Root:** `package-lock.json`, `yarn.lock`.
- **Fourth pass (admin):** `lib/{session,auth,authApi,http}.ts`, `lib/financeApi.ts` (new), `components/{AuthGuard,Sidebar}.tsx`, `app/login/page.tsx`, `app/{wallets,referrals,broadcasts}/page.tsx` (new), `lib/__tests__/http.test.mts`; backend: see `BACKEND_GAPS_AND_SECURITY.md`.
- **Withdrawals:** app `app/(main)/withdraw.tsx` and `src/api/services/withdrawalService.ts` (new), `src/api/services/walletService.ts` (withdrawal rows; referral rewards now counted as earned), `src/config/features.ts`, `app/(main)/{coins,history}.tsx` (Withdraw buttons open the new screen; the old fake withdraw popup removed), test `src/__tests__/unit/withdrawals.test.ts`; admin `app/withdrawals/page.tsx`, `lib/financeApi.ts`, `components/Sidebar.tsx`.
- **Third pass:** app `app/(main)/category/[id].tsx` (N1), `src/api/services/{competitionService,searchService,videoUploadService}.ts` (N1, F22), `app/(main)/upload/edit.tsx`, `src/components/VideoEditor/ControlsRow.tsx`, `app/(main)/chat/[id].tsx` (N2), new tests `src/__tests__/unit/{authLogin,postingAndDrafts,categoryCompetitions}.test.ts`; backend `src/controllers/SearchController.js`, `src/services/SearchService.js`, new `test/search.test.js`. **Deploy the backend before (or with) the app build**, or the category screen shows every competition in each category.

## Deletions (done 20 Nov 2026)

Removed with `git rm` (recoverable from git history), then checked: app type check 0 errors, app tests 111/111, full Android JS bundle export (no missing images), admin build and tests.

- F24: root `android/`, `ios/`, `app.json`, `eas.json`. Root `npm run android` / `ios` now run the mobile workspace.
- F26: `apps/gully-fame-mobile/src/assets/stickers/` (4,302 files, 52 MB) and 48 unreferenced images (19 MB). `apps/gully-fame-mobile/assets/stickers/` is used by the lenses and stays.
- A8: `apps/gully-fame-admin/_unused/`, and its `tsconfig.json` exclude entry.
- **F25 kept on your instruction:** `apps/videoeditor/` stays.

## Go-live checklist (deferred: nothing live has been changed yet)

Everything in this file so far is local and uncommitted. Do these, in order, when you decide to go live:

1. **Review and commit** all changes (frontend, backend, website), then tag the commit you build from (F10).
2. **Backend server (EC2)**, in the backend `.env`, then `pm2 restart gullyfame-backend --update-env`:
   - Mail: `MAIL_USER=admin@gullyfame.com`, `MAIL_APP_PASSWORD=<new app password>` (create a new one; the one pasted in chat must be deleted), `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=465`, `MAIL_FROM_NAME=Gully Fame`; send the test email.
   - Firebase: copy the service account key to `/home/ubuntu/firebase-service-account.json` (`chmod 600`), add `GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/firebase-service-account.json`; run the check command.
   - Withdrawals: `WITHDRAW_*` defaults are fine (see `.env.example`).
   - Deploy the new backend code **before** the admin panel and app.
3. **Admin panel (Vercel)**: deploy right after the backend (cookie login). Then, once mail works, set `ADMIN_2FA_ENABLED=true` on the server. Later: `CSP_ENFORCE=true` in Vercel (A3).
4. **Website**: deploy (`/privacy`, `/terms`, `/contact` now have the company details).
5. **Firebase**: add the Android app `com.gullyfame.mobile` and replace `apps/gully-fame-mobile/google-services.json` (the current one is for `com.gullyfame.app`); `firebaseConfig.test.ts` must pass.
6. **Sentry** (optional): `SENTRY_AUTH_TOKEN` EAS secret + confirm slugs, then turn on source map upload.
7. **Play Console**: release signing (F7), SHA-1 to Firebase/Google, SHA-256 to `assetlinks.json` (F23), 16 KB check (F16), store listing and forms.
8. **New app build** from the tagged commit, test on a phone (push, withdrawals, category screen, splash, location).

## Decisions needed

1. ~~Deletions~~: done (videoeditor kept).
2. ~~Company details (F4)~~: filled. A lawyer should review the final text.
3. Firebase: replace `google-services.json` with one for `com.gullyfame.mobile` (F5). Sentry: auth token + slugs for readable stack traces (F6).
4. ~~Support WhatsApp number (F21)~~: confirmed +91 98212 34605.
5. One package manager: npm or yarn (N3).
6. ~~Category screen for 1.0~~: built (N1).
7. ~~Withdrawal rules~~: agreed and built (1 coin = ₹0.10, manual payout within 24-48 hours). Still open: TDS (ask your CA).
8. Working email (SMTP) on the production server, so admin 2FA can be switched on (A6).
9. Set `CSP_ENFORCE=true` in Vercel after checking the CSP reports (A3).
