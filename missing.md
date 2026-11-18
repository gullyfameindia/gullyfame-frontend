# Gully Fame API audit: Postman vs app vs live API

Base URL: `https://gullyfame.com/v1/api` · Audited: 2026-10-12 · Collection: `Gully Fame API.postman_collection (2).json` · App: `apps/gully-fame-mobile`

Method: read-only calls only, one per endpoint. No user token was available in this audit, so every authenticated endpoint returned `401 {"code":3,"message":"invalid token"}`. I did not try to bypass auth. Write endpoints were not called.

> **Corrections, 2026-11-18 (code re-read, no live calls).** This is a historical audit; these statements are now out of date:
> - **Base URL** is `https://api.gullyfame.com/v1/api/` (`src/config/env.ts`), not `https://gullyfame.com/v1/api`.
> - **Payments (sections 6 and 7.3–7.4):** the app no longer calls `payment/*` or `payments/*`. Coins are bought with `POST user/wallet/recharge` (Razorpay order) → checkout → `POST user/wallet/recharge/verify`, which credits the wallet after signature verification on the server (`gullyfame-backend/src/routes/users.js:189-215`).
> - **Competition entry:** `app/(main)/competition/payment.tsx` now calls `POST competitions/:id/join`; the hard-coded `₹ 2400.00` balance is gone.
> - **"My posts" (blocker 2):** `GET reels?author=<userId>` exists (`gullyfame-backend/src/controllers/FeedController.js:79-82`) and the profile grid uses it (`src/hooks/useUserReels.ts:92`).
> - **`users/search` with the wrong base URL** in `reels/post.tsx`: no longer in the code.
> - The other rows were not re-checked. Current status: `PRODUCTION_READINESS_REPORT.md` and `BACKEND_ISSUES.md` at the workspace root.

## 1. Summary

| Item | Count |
|---|---|
| Postman endpoints | 133 (Admin 64, User 59, Public 10) |
| Postman endpoints with no example response | 55 |
| Endpoints the app calls that are not in Postman (A) | 41 |
| Postman endpoints the app never calls (B) | about 70, almost all `admin/*` plus a few user ones |
| Missing endpoints the features need (C) | 14 rows in section 2 (12 do not exist; 2 exist but are empty or unusable) |
| Live calls made | 29 (12 returned 200, 9 returned 404, 6 returned 401, 3 returned 400 on empty-body checks) |
| Wrong or inconsistent response findings | 15 rows in section 3 |
| Slow endpoints (over 1.5 s) | 4 of the 12 that returned 200 (all calls took 1.0 to 1.54 s) |
| Login/registration/wallet/payment findings (section 7) | 10 auth rows, 12 wallet/payment rows |
| Write endpoints not called | about 70 (see section 5) |

**Top 5 blockers**
1. No photo post or media type. `reels/publish` accepts video only and nothing returns `mediaType`.
2. No "my posts" list. `GET reels` has no `userId` filter, so the app fetches 50 reels and filters them on the device. It also has no pagination metadata and no pinned flag.
3. Music library holds a single dummy track ("Track title / Artist name"). Sound FX and filters return empty lists, and there is no GIF or lens library.
4. Auto-caption cannot work as called. The app sends `video_url` with `skipAuth: true` and a fake reel id, while Postman documents `videoUrl` with bearer auth. There is also no upload-based or async flow.
5. The publish payload has no settings (privacy, comments, share, save, remix, hide counts) and no links. There is also no edit or delete for a reel, and no processing status. Draft already supports `ctaLink`, but publish does not.

## 2. Missing endpoints

Contract notes: all responses use the existing envelope `{code:1,message,data}`. Lists use `{items,page,limit,total,hasMore,nextCursor}`.

| # | Feature | Suggested endpoint | Request | Response `data` |
|---|---|---|---|---|
| 1 | Photo post | `POST reels/publish` (add `mediaType`) or `POST posts/photo`. Upload via `reels/upload-url` with `fileType: image/jpeg`. | `{mediaType:"photo", media:[{url,width,height}], caption, settings, links, music}` | `{_id, mediaType, media[], thumbnail_url, caption, status:"processing\|ready", createdAt}` |
| 2 | Profile posts list | `GET users/:id/posts?cursor=&limit=&mediaType=video\|photo\|all` (also `GET user/posts` for own) | query only | `{posts:[{_id, mediaType, thumbnail_url, video_url, duration_sec, stats:{views,likes,comments}, isPinned, pinnedAt, createdAt}], nextCursor, hasMore, total}` |
| 3 | Pinned posts | `POST posts/:id/pin` and `DELETE posts/:id/pin` (max 3) | none | `{isPinned, pinnedCount}` |
| 4 | Music search and pagination with real tracks | `GET public/audio?q=&sort=&page=&limit=` (search already accepted but is only checked on title). Needs real tracks, plus `genre`, `previewUrl`, `bpm`. | query | `{audios:[{_id,title,artist,url,coverImage,duration_sec,usageCount,isSaved}], page, limit, total, hasMore}`. Drop `savedBy`; return `isSaved` for the caller. |
| 5 | Sound effects library | `GET public/soundfx?category=&q=&page=&limit=` (exists but returns `[]`; needs data and pagination) | query | `{items:[{_id,name,url,duration_sec,category}], total, hasMore}` |
| 6 | Stickers and GIFs library | `GET public/stickers?type=sticker\|gif\|emoji&category=&q=&page=` plus `GET public/gifs/search?q=` (proxy to Giphy or Tenor) | query | `{items:[{_id,type,name,url,previewUrl,width,height,category}], hasMore}` |
| 7 | Lenses / effects | `GET public/lenses?category=&page=` (`public/filters` exists but is empty) | query | `{items:[{_id,name,iconUrl,assetUrl,type:"face\|world\|color",version}]}` |
| 8 | Auto-captions from a file | `POST reels/auto-caption` with `{mediaUrl, language}`, returning `jobId`. Add `GET reels/auto-caption/:jobId`. | `{mediaUrl, language:"en"}` | `{jobId,status:"queued\|done\|failed", segments:[{startMs,endMs,text}]}`. The app should not need a `reelId`. |
| 9 | Content ideas / templates | `GET public/templates?category=&page=` and `GET public/content-ideas?categoryId=` | query | `{items:[{_id,title,description,previewUrl,clips[],musicId,category}]}` |
| 10 | Links saved with a post (link sticker / CTA) | Add `links: [{label,url,x,y}]` to publish, plus `GET posts/:id` returning them. Draft already has `ctaLink`; keep one shape for both. | in publish body | `links[]` in post and feed items |
| 11 | Edit and delete own reel or photo | `PATCH posts/:id` (caption, settings, links, thumbnail) and `DELETE posts/:id` (`reels/:id/delete` is defined in the app's endpoints file but not in Postman or confirmed live) | `{caption?, settings?}` | `{_id, updatedAt}` / `{deleted:true}` |
| 12 | Publish settings | Add `settings` to publish and PATCH: `{privacy:"public\|followers\|private", allowComments, allowShare, allowSave, allowRemix, hideCounts}`. Return in post detail. | in body | `settings` object |
| 13 | Upload progress / processing status | `GET reels/:id/status` returning `{status:"uploading\|processing\|ready\|failed", progressPct, error}`. The app calls `reels/upload/:id/status` and `/cancel`; neither is in Postman. | none | as left |
| 14 | Cutout / background removal | `POST media/cutout` with `{imageUrl}`, returning `{jobId}`, then `GET media/cutout/:jobId`. Only if the backend should do this. Otherwise do it on the device. | `{imageUrl}` | `{status, resultUrl}` |

(Rows 4 and 5 exist but are unusable today, so they are also listed as wrong data in section 3.)

## 3. Wrong or inconsistent responses

Only the 12 public 200 responses could be checked live. Findings for authenticated endpoints come from Postman examples compared with app code.

| Endpoint | Expected (app / Postman) | Actual (redacted) | Impact on app | Suggested backend fix |
|---|---|---|---|---|
| `GET public/audio` | Real tracks; `audioUrl` or `url`; `duration` in seconds | One track: `title:"Track title"`, `artist:"Artist name"`, `duration:30`, `coverImage:""`, `total:1` | The music picker shows a placeholder. The app has a `isPlaceholderTrack` hack. | Seed real tracks, fill `coverImage`, and remove the dummy. |
| `GET public/audio` | `isSaved` boolean for the caller | `savedBy:["<user id>"]` (raw ids of users who saved it) | Leaks user ids. The app falls back to `isSaved=false`. | Return `isSaved` only and hide `savedBy`. Also hide `__v` and `updatedAt`. |
| `GET public/audio?search=a` | Filter by search | Returns the same single track, so it is not possible to tell if search works | Search cannot be verified. | Seed data, then confirm search covers title and artist. |
| `GET public/audio` | Field name `audioUrl` / `audio_url` / `url` | `url` | The app copes with all three names. This is a risk if one is dropped. | Pick one name and document it. |
| `GET public/soundfx` | Library items | `data: []` | The sound effects panel is empty. | Seed data. |
| `GET public/filters` | Filter list | `data: []` | Filters/lenses are empty. | Seed data. |
| `GET public/stickers` | Sticker list with `url` or `imageUrl`; app also has fallback emoji | 1 item, `imageUrl`, `category:"reactions"`, no pagination, and `data` is a bare array | There are no GIFs. The list has no paging, and the shape differs from audio (`data.audios`). | Use one list envelope everywhere. Add paging, `type` and size fields. |
| `GET public/emojis` | List of emojis (called by `stickerEmojiService`) | `404 {"error":"Not found","path":...}` (Express default body, not the `{code,message}` envelope) | The app silently uses its hardcoded emoji list. | Add the route or remove the call. Return 404s in the standard envelope. |
| `GET public/feed/popular`, `public/categories`, `public/collections/featured`, `banners`, `app-config/onboarding` | Called by `feedService`, `bannerService`, `appBrandingService` | All `404` | These features fall back to defaults or fail silently. | Add the routes, or tell the app team which path replaces them. |
| `GET reels` (Postman has no example; app code) | `data.reels[]` with `thumbnail_url`, `views`, `duration`, `mediaType`; `page/limit/total/hasMore` | Cannot call (401). The app has a debug log (`[PROFDBG]`) for these fields. The Postman reel shape has `stats:{votes,likes,...}` and **no** `views`, `duration` or `mediaType`, and cursor paging (`next_cursor`) in one place but page/total in another. | The profile grid has no view counts, no duration and no photo/video type. | Use one reel shape everywhere (see row 2 in section 2). |
| `GET reels` | Filter by author | The app passes no `userId`, then filters on the device by `author._id` | Only the latest 50 reels in the whole app are scanned. A user's own posts can be missing. | Add `userId` / `author` filter and real pagination. |
| Reel ids / URLs | Absolute URLs | Postman examples return relative paths (`/videos/reel1.mp4`, `/thumbs/reel1.jpg`, `/images/banners/festive1.png`); `public/*` returns absolute S3 URLs. The app prefixes `BASE_URL` to home images. | Broken images when a mix of both appears. `home/index.tsx` builds `${BASE_URL}${reel.image}`. | Always return absolute URLs. |
| Postman `Login` example | camelCase | The collection mixes camelCase (`firstName`, `videoUrl`, `competitionId`) and snake_case (`video_url`, `thumbnail_url`, `receiver_id`, `action_type`) | Easy to send the wrong key. | Pick one convention per resource and document it. |
| `POST reels/auto-caption` | Postman: `{videoUrl}`, bearer auth. App: `{video_url, thumbnail_url}` with `skipAuth:true` | Not callable (write-ish; AI cost) | The call can fail with 400/401, and the response field names (`caption`/`text`) are guessed by the app. | Align the request and response. |
| Response times | Under 1.5 s | Public calls: 1.29 to 1.54 s (audio 1.37 s, filters 1.41 s, stickers 1.50 s, soundfx 1.54 s, logo 1.53 s, aboutUs 1.51 s). Even 404s take about 1.0 s. | Slow editor panels because each opens a fresh request. | Check hosting latency, add caching headers (`Cache-Control`) for `public/*`. |
| Status codes | `401` on bad token is fine | `401` returns HTTP 401 with `code:3`; 404s return a different body shape | The app handles both but needs two error paths. | Use the same error envelope for every error. |

## 4. Postman collection problems

| Problem | Detail |
|---|---|
| `BASE_URL` | Points to `http://localhost:3552/v1/api/`. The production base is `https://gullyfame.com/v1/api`. |
| Missing variables | `AUDIO_ID`, `FILTER_ID`, `STICKER_ID`, `COMMENT_ID`, `TARGET_USER_ID` are used but not defined. |
| No auth docs | Auth is set per request (bearer), not at collection level. `ADMIN_TOKEN` and `USER_TOKEN` exist but no request has a script to fill them from login. Nothing documents `refresh-token`. |
| Missing examples | 55 of 133 requests have no saved response (31 in User APIs, including all Reels write calls, KYC, Wallet, Follow, Gamification; 16 Admin; 8 Public). |
| Wrong auth marking | `Update Profile` (`PUT user/profile`) has no auth and no body. `sendNotification` (`admin/notification`) and `Add logo` have no auth. `Reset password` needs bearer but no flow explains where the token comes from. |
| Real data in the collection | Real-looking user ids, admin email and passwords (`admin123`, `User@1234`, `Sponsor@123`) are saved in bodies and examples. Please rotate any that are real. |
| Duplicates / typos | "List Users ... Copy"; "Tranding"; "champaigns"; "Earnings adn winnings"; "Splash Logs"; `Get Upload URL` twice; `Save Draft` twice; `Get User Earnings` in two folders. A broken emoji in the `Toggle React` body. |
| Wrong example data | `Delete Sponsor` sends a body. `Update Report Status` uses a fake id. |
| Outdated / mismatched paths | `Feed Matrix`, `reels/draft` and others exist, but the app calls many paths that are not in Postman (list below). |

**A) Used by the app, not in Postman**
`auth/refresh-token`, `auth/logout`, `user/change-password` (app also tries `auth/change-password`, `user/password`, `auth/password`), `users/profile`, `user/profile/avatar`, `user/followers`, `user/following`, `user/:id/is-following`, `user/:id/follow-stats`, `user/:id`, `user/recommendations`, `user/trending`, `follow/:id`, `unfollow/:id`, `competitions` (list), `competitions/:id/leave`, `competitions/:id/participants`, `kyc/upload-document`, `kyc/verify-document/:id`, `reels/create`, `reels/upload` (multipart), `reels/upload/:id/status`, `reels/upload/:id/cancel`, `reels/:id/thumbnail`, `reels/batch-thumbnails`, `reels/comments/:id/like|unlike|reply`, `reels/:id/comments-count`, `search/users`, `search/reels`, `search/hashtags`, `search/trending-hashtags`, `search/history`, `search/history/clear`, `public/filters/:id`, `public/stickers/:id`, `public/emojis`, `public/soundfx/:id`, `public/feed/popular`, `public/categories`, `public/collections/featured`, `banners`, `app-config/splash-onboarding`, `app-config/onboarding`, `notifications/register-device`, `notifications/preferences`, `notifications/unread-count`, `notifications/:id` (delete), `payment/coin-packages`, `payment/initiate`, `payment/verify`, `payment/send-tip`, `payment/history`, `payments/create-order`, `payments/verify`, `video-editor/*` (session, trim, filter, text, music, voiceover, soundfx, transition, export, filters, effects, transitions, stickers), `hashtags`, `users/search` (in `reels/post.tsx`, using a different base URL `https://gullyfame.com/api`, missing `/v1`).

Note: the code count above groups `video-editor/*` as 16 endpoints, which is why the summary says 41 at minimum.

**B) In Postman, never used by the app**
Everything under `Admin APIs` except `admin/dashboard/*`, `admin/users*`, `admin/competitions`, `admin/notification` and the four CMS GETs (the app does call `admin/termAndCondition` etc. instead of the public CMS routes). Also unused: `auth/forgot-password` flow check, `user/categories` is used, but `Daily Mission`, `Gamification progress`, `Tip Creator`, `Recharge`, `Archive chat`, `Invite to competition`, `Export` and `Export status` have no call sites that I could confirm.

## 5. Endpoints not called (write endpoints, reviewed from the collection only)

| Group | Endpoints |
|---|---|
| Reels | `reels/upload-url`, `reels/publish`, `reels/draft` (POST), `reels/auto-caption`, `reels/:id/action`, `reels/:id/comments` (POST), `reels/comments/:id` (DELETE), `reels/:id/tip`, `reels/:id/export` |
| User | `auth/register`, `auth/login`, `auth/verifyOtp`, `auth/resendOtp`, `auth/forgot-password`, `auth/reset-password`, `auth/login/social`, `user/profile` (PUT), `user/kyc` (POST), `user/wallet/recharge`, `user/:id/follow`, `user/audio/:id/save` |
| Chat / notifications | `chat/sendChat`, `chat/message/:id/react`, `chat/message/delete`, `chat/read`, `chat/archive`, `notification/:id/read`, `notification/read-all` |
| Competitions | `competitions/:id/join`, `competitions/:id/invite` |
| Admin | all POST/PUT/DELETE under `admin/*` (banners, categories, CMS, users status/reset-password/kyc, competitions create/approve/reject/update/delete/declare-winners, sponsors, reports status, audio, filters, stickers, soundfx), `public/logo` (POST) |

Authenticated GETs (`reels`, `user/homeScreen`, `search`, `feed/matrix`) were attempted once and returned `401`. The rest were not called because no token was available.

## 6. Priority list for the backend developer

| Priority | Item |
|---|---|
| **P0** | Photo posts and `mediaType` (section 2, row 1) |
| **P0** | "My posts" list with pagination, `thumbnail_url`, view counts, `duration`, pinned flag (rows 2, 3) |
| **P0** | Seed real music tracks. Remove the dummy track. Stop returning `savedBy` (row 4) |
| **P0** | Fix auto-caption contract (row 8) |
| **P0** | Publish `settings`, `links`, plus edit and delete post (rows 10, 11, 12) |
| **P0** | Payments and wallet (section 7.4): payment routes return 404 and competition payment is faked in the app |
| **P1** | Processing status for uploads (row 13) |
| **P1** | Seed sound FX, filters/lenses, stickers; add GIF source (rows 5, 6, 7) |
| **P1** | Add or remove the 404 routes the app calls (`public/emojis`, `public/feed/popular`, `public/categories`, `banners`, `app-config/*`) |
| **P1** | One response envelope and list shape (`items/page/limit/total/hasMore/nextCursor`), absolute URLs, one naming convention |
| **P2** | Content ideas / templates (row 9) |
| **P2** | Cutout (row 14) |
| **P2** | Caching and latency for `public/*` (1.3 to 1.5 s) |
| **P2** | Fix the Postman collection (section 4) |

## 7. Login, registration, wallet and payment check

Safety: I did **not** register, log in with real credentials, verify an OTP, or pay. I sent an empty `{}` body to the three auth POSTs (they only return a validation error and create nothing). Wallet and payment GETs were called without a token.

### 7.1 Live results

| Call | Status / time | Result |
|---|---|---|
| `POST auth/login` `{}` | 400, 1.09 s | `{"code":0,"message":"The user id field must not be empty."}` (clear) |
| `POST auth/register` `{}` | 400, 1.18 s | `{"code":0,"message":"The email field must not be empty."}` |
| `POST auth/verifyOtp` `{}` | 400, 1.24 s | `{"code":0,"message":"The txn id field must not be empty."}` |
| `GET user/wallet` | 401, 1.47 s | `invalid token` (needs a token to check the shape) |
| `GET user/progress` | 401, 1.24 s | `invalid token` |
| `GET payment/coin-packages` | **404**, 1.10 s | Express default `{"error":"Not found"}` |
| `GET payment/history` and `GET payments/history` | **404**, 1.06 s / 1.20 s | Not found on both spellings |

### 7.2 Login and registration

| Check | Finding | Impact | Backend fix |
|---|---|---|---|
| Validation errors | Good: HTTP 400, `code:0`, readable message. Only one field is reported at a time (register says only "email" is empty). | Form shows one error at a time. | Return all field errors: `errors:{email:"...",mobile:"..."}`. |
| Register response | Postman: `data:{}` with no `txnId`. The app expects a `txnId` to go to the OTP screen (`RegisterResponse`). | If `txnId` is absent the app cannot verify OTP after sign-up. | Return `{txnId, otpSentTo, expiresIn}`. |
| Register fields | Postman sends `firstName,lastName,mobile,email,password,role`. App sends the same. Role values are `participants` or `fan` (plural vs singular). | Easy mismatch. | Use enum `participant\|fan`, document it. |
| Login response | Postman has 2 examples (password, OTP) with no `message` and no token field in the example shown. Token only appears in `verifyOtp`. | Unclear whether password login returns a token directly or needs an OTP. | Document both flows with exact `data` shape. |
| Verify OTP response | `{token, userId}` only (no `user`, no `refreshToken`). The app then calls `user/profile` to load the user. | One extra request. No refresh token is returned although the app calls `auth/refresh-token`. | Return `{token, refreshToken, expiresIn, user}`. |
| Refresh token / logout | App calls `auth/refresh-token` and `auth/logout`. Neither is in Postman. | Session handling is undocumented. | Add both to Postman with examples. |
| Auth guessing | `authService` tries up to 5 profile paths (`/user/profile`, `/users/profile`, `/auth/user/profile`, `/auth/user`, `/user`) and 4 change-password paths. | Extra failed requests, slow screens. | Tell the app team the one correct path for each. `user/change-password` is not in Postman. |
| Update profile | `PUT user/profile` in Postman has no body, no auth and no example. Avatar upload goes to `user/profile/avatar` (not in Postman). | Cannot confirm fields. | Add body and response. |
| Postman secrets | Example passwords are shown in plain text. A real-looking `device_token` is saved. | Security. | Remove them. |
| Not verified | OTP delivery, rate limits, wrong-password errors, token expiry, social login. | | |

### 7.3 Wallet and payment

| Area | Finding | Impact | Backend fix |
|---|---|---|---|
| Payment provider | App uses Razorpay (`react-native-razorpay`). Flow: `payment/initiate` then Razorpay checkout then `payment/verify`. | | |
| Paths do not match | App calls `payment/coin-packages`, `payment/initiate`, `payment/verify`, `payment/send-tip`, `payment/history` (singular). Another service calls `payments/create-order`, `payments/verify`. Constants file lists `payments/razorpay/initiate` and `payments/razorpay/webhook`. Live: `payment/coin-packages` and both `history` paths return **404**. None of these are in Postman. | The "Add money" screen cannot load coin packages, so buying coins does not work. | Confirm which path set exists, deploy it, and add all to Postman. Remove the duplicate set. |
| Postman wallet | `GET user/wallet` and `POST user/wallet/recharge {amount}` have **no example responses**. Recharge takes only `amount` (no payment reference). | Cannot confirm the shape. Recharge without a verified payment would be a money bug. | Recharge must be credited only after a verified payment (webhook or `payment/verify`). Remove or lock the direct recharge route. |
| Wallet response shape | App expects `{coins, balance, lastUpdated}`. Cannot verify (401). | Balance may show 0 if names differ. | Document `{coins, balance, currency, lastUpdated}` and what 1 coin is worth. |
| Competition entry payment | In `competition/payment.tsx` the "GFI Coins Wallet" method makes **no API call**. It saves the competition as `pending` in local storage (AsyncStorage), then shows an approval modal. The wallet balance on that screen is the hardcoded text `₹ 2400.00`. Other methods in that screen have no handler. | Users are not charged and are not joined on the server. The balance is fake. | Add `POST competitions/:id/join` with `{paymentMethod:"wallet\|razorpay"}` that checks the balance, debits the wallet and returns the new balance. App must call it. |
| Entry fee debit / refund | Postman join request has no body, no fee, and no insufficient-balance error. The UI says "Entry fees are refundable if the competition doesn't go live", but there is no refund endpoint or transaction. | No money rules. | Add wallet debit and refund logic, with error `INSUFFICIENT_BALANCE` (HTTP 402 or 400). |
| Tips | Postman `reels/:id/tip {amount}` and app `payment/send-tip` are two different endpoints. Neither has an example. | Tip may be sent to the wrong route. | Keep one, and document `{reelId, amount}` and the response. |
| Transaction history | `payment/history` is 404. Postman has `admin/earnings` only. | No transactions list for the user. | Add `GET user/wallet/transactions?page=&limit=` returning `{items:[{_id,type:"credit\|debit",amount,reason,refId,status,createdAt}],hasMore}`. |
| Payment methods | No endpoint lists payment methods (UPI, cards, wallet). The list is hardcoded in the app. | Cannot enable or disable a method without an app release. | Optional `GET payment/methods`. |
| Payout / withdrawal | Winners get prizes (`declare-winners`) but there is no withdraw or bank endpoint. KYC exists. | Prize money cannot be paid out. | Add `POST user/wallet/withdraw` and `GET/POST user/bank-accounts`. |
| Security | Razorpay key comes from `razorpayKey` in the initiate response or an env variable. The signature must be checked on the server. | Fake payments if skipped. | Verify `razorpay_signature` server side and use the webhook as backup. Make verify idempotent. |
| Amount units | The app sends rupees to initiate and multiplies by 100 for Razorpay (paise). Backend unit is not documented. | 100x price errors are possible. | Document the unit (paise vs rupees) in Postman. |
| Not verified | Real wallet balance, a test payment, webhook, refunds, and idempotency. These need a test account and the Razorpay test mode. | | |

### 7.4 Added to the priority list

| Priority | Item |
|---|---|
| **P0** | Deploy or fix the payment routes (`payment/coin-packages`, `initiate`, `verify`, `history`). Currently 404. |
| **P0** | Make competition join charge the wallet on the server. The app currently fakes it locally. |
| **P0** | Return a `txnId` from register, and a `refreshToken` from login/verifyOtp. Document the login flow. |
| **P1** | Wallet transactions list, refund rules, and the `INSUFFICIENT_BALANCE` error. |
| **P1** | Lock down `user/wallet/recharge` so money is added only after a verified payment. |
| **P2** | Payment methods list, withdrawal and bank accounts, and the amount unit documentation. |

## 8. What I could not verify

- Any authenticated endpoint (no token available), including a real login, a registration, an OTP, the wallet balance and a test payment. That includes the real `GET reels` shape, profile posts, `user/homeScreen`, search, feed, comments, wallet and chat.
- Whether `public/audio?search=` really filters, because there is only one track.
- Pagination behavior (duplicates, cursors), because every list returned 0 or 1 items.
- Behaviour of all write endpoints.
- The count in section 1 for group A is approximate; paths were taken from a static scan of the app code and some services build paths dynamically.
- Slow-endpoint timing came from a single call each, from one network, so it may include my own latency.
