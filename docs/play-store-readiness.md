# Google Play readiness: Gully Fame (com.gullyfame.mobile)

Drafts for the Play Console, based on what the code actually does (checked 2026-11-05).
**These are drafts to review, not legal advice.** Answers in the Console are your declaration to Google:
check each one against how the app and backend really behave before submitting.

Policy facts below were checked against Google's current Play Console help pages (links at the end).

## 1. Hard requirements

| Requirement | Status |
|---|---|
| Target API 36 (Android 16) for new apps and updates from 31 Aug 2026 | The release build targets 36 (`compileSdk`/`targetSdk` come from the Expo SDK 57 defaults). Re-verify with `aapt2 dump badging` on the final bundle. |
| App Bundle (.aab), not APK | `eas.json` production profile uses `buildType: app-bundle`. |
| 64-bit | `arm64-v8a` and `x86_64` are built (`reactNativeArchitectures`). |
| 16 KB page size | ffmpeg-kit is replaced by a 16 KB-aligned build in `android/build.gradle` and `plugins/withFFMPEGResolution.js`. Verify the other native libraries in the final bundle (see section 7). |
| Signing | Use Play App Signing. EAS Build injects the upload key from `eas credentials`. Local builds sign only when `GF_UPLOAD_*` properties are provided; otherwise the bundle is left unsigned. The debug key is never used for release. |
| Account deletion (in-app + web link) | In-app screen exists (Settings & Help > Delete Account) and the public page is `https://gullyfameindia.com/delete-account`. **The deletion itself is by email request because the backend has no delete endpoint.** See "Needs backend". |
| User-generated content: report and block | In-app Report and Block exist. **Both are interim**: report opens an email to support, block is stored on the device. Real endpoints are needed. |
| Privacy policy | In-app: burger menu > Privacy Policy. Public URL for the listing: use the website privacy page. |

## 2. Permissions (release manifest)

| Permission | Why the app needs it |
|---|---|
| CAMERA | Record reels and take the KYC selfie. |
| RECORD_AUDIO | Record sound with reels and voice-overs. |
| MODIFY_AUDIO_SETTINGS | Audio routing while recording or previewing with music. |
| INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE | Talk to the Gully Fame servers and detect offline mode. |
| ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION | Optional: show contests and creators near the user. Foreground only, asked on the location screen, can be skipped. |
| POST_NOTIFICATIONS | Competition, vote and chat notifications (Android 13+ runtime prompt). |
| READ_MEDIA_VISUAL_USER_SELECTED | Part of the system photo picker flow on Android 14+. |
| READ/WRITE_EXTERNAL_STORAGE (max SDK 32) | Saving downloaded reels on Android 12 and below only. |
| VIBRATE, WAKE_LOCK, RECEIVE_BOOT_COMPLETED, USE_BIOMETRIC, READ_PHONE_STATE | Added by libraries (haptics, push, Razorpay). READ_PHONE_STATE comes from the Razorpay SDK: confirm with Razorpay whether it can be removed. |

Removed in this release: `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO` (Play restricts photo/video
permissions to apps the system photo picker cannot serve; picking uses the system Photo Picker and saving a reel
is write-only), `SYSTEM_ALERT_WINDOW`, `ACTIVITY_RECOGNITION` (came from an unused dependency).

## 3. Data safety form (draft)

Collected data (all encrypted in transit over HTTPS; users can request deletion):

| Category | Data | Collected / shared | Purpose | Optional? |
|---|---|---|---|---|
| Personal info | Name, email address, phone number, date of birth, gender, bio | Collected | Account management, app functionality | Name and phone required; others optional |
| Personal info | User IDs | Collected | App functionality | Required |
| Financial info | Purchase history (wallet recharges, tips) | Collected | App functionality | Required to pay |
| Financial info | Payment card or UPI details | **Not collected by the app**: entered in Razorpay's checkout. Declare Razorpay as a service provider if Google asks. | | |
| Photos and videos | Reels, profile photo, KYC document photos, selfie | Collected | App functionality, KYC verification | Reels and profile photo optional; KYC required to withdraw/verify |
| Audio | Voice or other audio recorded in reels | Collected | App functionality | Optional |
| Location | Precise and approximate location (latitude/longitude saved on the profile) | Collected | Show nearby contests and creators | Optional |
| Messages | In-app chat messages, comments | Collected | App functionality | Optional |
| App activity | Likes, votes, follows, search queries | Collected (search history is kept on the device) | App functionality | Required for those features |
| App info and performance | Crash logs and diagnostics | Collected **only if a Sentry DSN is configured**; no user object, request data or breadcrumbs are sent | Analytics: app stability | Required for stability |
| Device or other IDs | Push notification token (FCM) | Collected | Notifications | Optional (notification permission) |

Third parties that receive data: Razorpay (payments), Google (Sign-In, Firebase Cloud Messaging), Sentry (crash logs),
and the hosting provider for uploads (AWS S3, a service provider acting for you).
No advertising SDKs were found in the code.

Data deletion: the app has an in-app request screen and a web page. State that some data may be kept where the law
requires, matching the Privacy Policy section "DATA DELETION AND ACCOUNT CLOSURE".

## 4. Content rating questionnaire (draft)

- App category: social / entertainment (talent competitions, short videos, chat).
- User-generated content shared between users: **yes** (reels, comments, chat).
- Users can interact or communicate: **yes** (chat, comments, follow).
- Shares user location with other users: **no** (location is stored on the profile for nearby results; confirm it is not shown to others).
- Digital purchases: **yes** (coins), see the payments note below.
- Contests with prizes: **yes** (competitions with prizes), see the payments note below.
- Violence, sexual content, profanity, drugs, gambling: none produced by the app itself; user content is covered by the Community Guidelines.
- Expected result: a rating suitable for teens and up, because of unmoderated user content and chat.

## 5. Payments policy: needs your decision before submission

The app sells **GFI coins** through Razorpay (`add-money`) and coins are spent on tipping creators and
"exclusive competitions". Coins are an in-app virtual currency. Google Play's payments policy generally requires
Google Play Billing for in-app digital goods and virtual currency; Razorpay is not an allowed payment method for those.
Competitions that award prizes may also fall under the "Real-Money Gambling, Games, and Contests" policy.
The wallet recharge, the tip and the prize flows must be reviewed against the current policy (and, if needed, a Play
Console declaration or Play Billing) **before** publishing. This was not changed in code.

Note: the competition "payment" screen does not charge an entry fee. The backend joins competitions for free, so the
screen only registers the user (the hard-coded wallet balance it used to show was removed).

## 6. Notes for the Play reviewer (login)

Login uses an OTP sent to a mobile number, so reviewers cannot sign in on their own. Provide in the Console:

- A test mobile number and the fixed OTP **if the backend supports a master OTP for review**. The backend has a
  `MASTER_OTP_ENABLED` setting: enable it for a dedicated reviewer number only, never globally, and disable it after review.
- Or a test email/password account (email login screen exists).
- Steps: open the app > Sign in > enter the test number > enter the OTP > complete the short profile.
- State clearly: camera, microphone and notification permissions are optional; location can be skipped.

## 7. Pre-launch test plan

Run on: a low-end device (2 to 3 GB RAM), Android 8 (API 26), Android 13, and Android 16, plus a slow network and
airplane mode. For each: cold start, sign in, deny every permission in turn (camera, microphone, notifications,
location), record and upload a reel, play the reel feed for 10 minutes while watching memory, open a push notification,
open a deep link, rotate and background the app during an upload, block a user, report a reel, request account deletion.
Also run the Play Console pre-launch report and check 16 KB alignment of every `.so` in the bundle.

## 8. Build commands

```bash
# Preferred: EAS production build (AAB, signed with the EAS-managed upload key)
cd apps/gully-fame-mobile
eas build --profile production --platform android

# Local release bundle (unsigned unless GF_UPLOAD_* are supplied; Play App Signing re-signs it)
cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew :app:bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab

# Check the target SDK and permissions of the result
bundletool dump manifest --bundle=app-release.aab | grep -E "targetSdkVersion|uses-permission"
```

## Sources (Google Play Console Help / Android Developers, checked 2026-11-05)

- Target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- Photo and video permissions policy: https://support.google.com/googleplay/android-developer/answer/14115180
- User Generated Content policy: https://support.google.com/googleplay/android-developer/answer/9876937
- Data safety section: https://support.google.com/googleplay/android-developer/answer/10787469
