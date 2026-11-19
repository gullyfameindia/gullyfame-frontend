# Gully Fame frontend (app and admin panel): gaps, issues and security

**Checked:** 20 Nov 2026, against the working copy of `gullyfame-frontend` (includes the 19–20 Nov changes that are not pushed yet).
- **App:** `apps/gully-fame-mobile`, Expo SDK 57, React Native 0.86, package `com.gullyfame.mobile`.
- **Admin panel:** `apps/gully-fame-admin`, Next.js 14, `https://admin.gullyfame.com` (Vercel).

IDs in brackets (FE-xxx) match the earlier audit files. "Needs backend" points to `BACKEND_GAPS_AND_SECURITY.md`.

## Summary

| Severity | App | Admin |
|---|---|---|
| Critical (blocks Play Store release) | 7 | 0 |
| High | 3 | 3 |
| Medium | 10 | 3 |
| Low | 8 | 2 |

---

# Part 1: mobile app

## Critical: fix before the Play Store release

| # | Issue | Where | Why it matters | Fix |
|---|---|---|---|---|
| F1 | **Google login button is visible but unsafe** (FE-002) | `app/auth/createaccount.tsx:226-239` | Sends `googleId` and `email` with no ID token; the server trusts them (backend B1). `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set, so it also fails on release builds. The **Instagram icon also starts Google sign-in** (`handleGoogleLogin("instagram")`), which misleads users. | Hide both buttons now. After the backend fix: send `response.data.idToken`, set the web client ID in EAS, add the Play App Signing SHA-1 to the Google OAuth client. |
| F2 | **Delete account only sends an email** (FE-004) | `app/(main)/settings/delete-account.tsx:9, 31` | Play requires deletion that really happens. Needs backend B3. | Call `DELETE user/account` with a confirmation step, then log out. Keep the web page `gullyfameindia.com/delete-account` live for Play. |
| F3 | **Report and block don't really work** (FE-005) | `src/utils/moderation.ts` (email report; block saved in `AsyncStorage`) | Blocked users can still message; reports go to an inbox. Needs backend B4. | Use the new block and report endpoints; move the local block list to the server on first launch. |
| F4 | **Privacy policy and terms have blanks** (FE-046) | `src/content/legal/privacyPolicy.ts:192-193`, `termsOfService.ts:8, 17` (plus the website pages) | Shows "Name: Email: Address:", "registered office at ______", "[2026]" and a drafting note. Play needs a valid policy with a contact; India's DPDP rules need a grievance officer. | Fill in company name, address, grievance officer name, email, phone and real dates everywhere (app, website, docs); remove drafting notes; legal review. |
| F5 | **Push notifications can't work** (FE-045) | no `google-services.json`, no `googleServicesFile` in `app.json` | Release builds send an empty push token. | Add the Firebase Android config for `com.gullyfame.mobile` (EAS file secret), test push on a release build. |
| F6 | **No crash reporting** (FE-018) | `eas.json` (no `EXPO_PUBLIC_SENTRY_DSN`) | Crashes after release go unseen. | Add the Sentry DSN and `SENTRY_AUTH_TOKEN` as EAS secrets, or decide to ship without it. |
| F7 | **Release signing not set up** | EAS credentials / Play Console | Needed to upload the app bundle. | `eas credentials -p android` (or your own upload key, backed up), enrol in Play App Signing, copy its SHA-1 for F1. |

## High

| # | Issue | Where | Fix |
|---|---|---|---|
| F8 | **Lenses look like they work but don't** (FE-012) | `CaptureControls.tsx` "Lenses" button; `bakeEdits.ts` has no lens step | The lens shows while recording but is missing from the posted video. Hide the button for 1.0, or add lenses to the export. |
| F9 | **Default Expo splash screen** (FE-047) | `app.json:94` (`expo-splash-screen` with no options) | Configure the Gully Fame logo on a dark background, rebuild native files. Reviewers notice placeholder branding. |
| F10 | **Tonight's changes are not pushed** | working copy | Commit and push (list at the end), then build only from a clean, tagged commit. |

## Medium

| # | Issue | Where | Fix |
|---|---|---|---|
| F11 | Notification permission is asked during sign-in, with no explanation (FE-059) | `createaccount.tsx:237` | Ask after sign-in with a short explanation screen. |
| F12 | Precise location requested; only approximate is needed (FE-061) | `AndroidManifest.xml` `ACCESS_FINE_LOCATION` | Request coarse location only; update the Data safety form. |
| F13 | Some camera filters show "Not supported yet" (FE-034) | `camera/index.tsx:1423` | Hide filters that have no device preset. |
| F14 | Recorded clips are lost if Android closes the app before posting (FE-062) | `camera/index.tsx` (clips in memory) | Save clip paths while recording, or save a draft automatically. |
| F15 | Tablets and foldables untested (FE-048) | Android 16 ignores the portrait lock on large screens | Test on tablet/foldable emulators, or limit devices in Play Console. |
| F16 | 16 KB page-size check not done (FE-008) | `ffmpeg-kit` (archived upstream) | Check the release bundle in Play Console's App bundle explorer; plan an ffmpeg-kit replacement. |
| F17 | Accessibility: many icon buttons have no label, some are under 48 dp, grey text on black is hard to read (FE-039, FE-050, FE-051) | across the app | Label buttons in the main flows, add `hitSlop`, use `#999` or lighter text. |
| F18 | Long lists drawn all at once (FE-025) | inbox, category, home (`ScrollView` + `map`) | Switch to `FlatList`. |
| F19 | Few tests (FE-038) | `src/__tests__` (4 suites) | Tests for login, posting/drafts, tips, referrals; a small device smoke test. |
| F20 | Dependency advisories (FE-049) | build tooling mostly | Take Expo 57 patch releases; don't run `npm audit fix --force`. |

## Low

| # | Issue | Where | Fix |
|---|---|---|---|
| F21 | Support WhatsApp number not confirmed (FE-020) | `settings/help-support.tsx:24` (`+91 98212 34605`) | Confirm it or set it in the admin content. |
| F22 | Hashtags dropped when posting (FE-013) | backend ignores `tags` | Wait for the backend to store tags. |
| F23 | Custom link scheme with no verified App Links (FE-054) | `AndroidManifest.xml` | Add `https://gullyfameindia.com` App Links if links are shared publicly. |
| F24 | Old duplicate `android/`, `ios/`, `app.json` at the monorepo root (FE-035) | repo root | Delete after confirming unused, so nobody builds the wrong app. |
| F25 | Unused `apps/videoeditor` workspace (FE-036) | root `package.json` | Remove from workspaces. |
| F26 | Unused images make the repo heavy (FE-058) | `src/assets` (73 MB) | Delete unused files. |
| F27 | Accent colours differ between screens (FE-040) | `#FF8C00`, `#FFA500`, `#F59E0B` vs `#EC9A15` | One theme colour. |
| F28 | Very large screen files (FE-024) | `reel/index.tsx`, `camera/index.tsx` | Split into hooks and components over time. |

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

Turn server and app switches on together.

---

# Part 2: admin panel

## High

| # | Issue | Where | Why it matters | Fix |
|---|---|---|---|---|
| A1 | **Next.js 14 with known security advisories** (FE-017) | `package.json` (`next ^14.0.0`) | The admin panel is public on the internet. | Upgrade to a supported Next.js version, test login, content and moderation. |
| A2 | **Admin login token in `localStorage`; role read from `localStorage`** (FE-016) | `lib/session.ts`, `lib/auth.ts` | Any script injected into the page can steal the admin token. Changing `userRole` in the browser changes what the menu shows (the server still checks permissions). | Move the token to an httpOnly cookie (needs a backend change); take the role from the server, not the browser. |
| A3 | **Content-Security-Policy not enforced** (FE-016) | `middleware.ts:74-76` (report-only unless `CSP_ENFORCE=true`) | The browser only reports script injection, it doesn't block it. Makes A2 worse. | Check the CSP reports, then set `CSP_ENFORCE=true` in Vercel. |

## Medium

| # | Issue | Where | Fix |
|---|---|---|---|
| A4 | Dashboard shows no real numbers (FE-015) | `lib/dashboardApi.ts` calls `admin/dashboard/quick-stats` and `recent-activity`, which the backend doesn't have | Build the endpoints (backend B20). |
| A5 | No admin pages for: wallets and transactions, referrals (to spot abuse), broadcast notifications, a reels/users/comments moderation list (FE-032), withdrawals | admin app | Add as those features go live; referrals and wallets first. |
| A6 | No two-factor login for admins | admin login | Add an email OTP or authenticator step for admin accounts. Login is already rate limited. |

## Low

| # | Issue | Where | Fix |
|---|---|---|---|
| A7 | Native browser `alert()` and `confirm()` still used | 11 files with `alert(`, 9 with `confirm(` | Use the panel's toasts and a confirm dialog. |
| A8 | Old `_unused/` folder still present (FE-037) | `apps/gully-fame-admin/_unused` | Delete. |

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
| Privacy policy URL (website page, after F4) | Blocked by F4 |
| Account deletion URL `gullyfameindia.com/delete-account` | Confirm it's live |
| Data safety form (use `PLAY_STORE_DATA_SAFETY.md`) | To fill |
| Content rating and target audience (13+ or 18+, not under 13) | To answer |
| Reviewer login (email/password, created 3+ days before submitting) | To create |
| Closed testing: 12 testers for 14 days | To run |
| Payments declaration: no in-app purchases at launch | To answer |

## Not pushed yet (on the developer PC)

App: `app/(main)/{coins,history,invite-friend}.tsx`, `app/(main)/competition/payment.tsx`, `app/(main)/home/index.tsx`, `app/(main)/reel/index.tsx`, `app/onboarding/personal-details.tsx`, `src/api/services/{home,user,wallet}Service.ts`, `src/components/modals/SupportModal/SupportModal.tsx`, `src/components/profile/{OwnProfileScreen.tsx,shared/profileHooks.ts}`, `src/config/features.ts`, `src/utils/coinPurchase.ts`.

## Decisions needed

1. Google login at launch: hide it (F1) or wait for the backend fix?
2. Lenses in 1.0: hide (F8) or build lens export?
3. Company details for the privacy policy and terms (F4).
4. Firebase project and Sentry account (F5, F6).
5. Support WhatsApp number (F21).
