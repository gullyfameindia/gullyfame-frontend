// App-wide feature switches. Flip a value to true to bring the feature back;
// the code behind each switch is kept as it is.

// Buying GFI coins (Razorpay). Off for launch: competition entry is free, so
// users have no need to buy coins. Turn on only after the Play Store payments
// decision (Play Billing) is made.
export const COIN_PURCHASE_ENABLED = false;

// Tipping creators with coins. On: users tip with coins they earned
// (competition prizes, referrals). The backend limits tips per day.
export const TIPPING_ENABLED = true;

// Coins a user needs before they can withdraw (the server's WITHDRAW_MIN_COINS decides;
// this copy is only for progress text before the summary loads).
export const WITHDRAW_MIN_COINS = 1000;

// Shown when a user has too few coins and cannot buy more.
export const EARN_COINS_MESSAGE = "Not enough coins. Earn coins by winning competitions and inviting friends.";

// Daily missions, XP, levels and streaks. Off: the home-screen level card,
// the daily mission line and the "+5 XP" vote popup are hidden. The backend
// switch is GAMIFICATION_ENABLED in the server .env; turn both on together.
export const XP_AND_MISSIONS_ENABLED = false;

// Google / Instagram / Apple sign-in buttons on the sign-in and sign-up
// screens. Off: the server's POST /auth/login/social does not verify a Google
// ID token yet (backend B1), Instagram and Apple sign-in are not built, and
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set for release builds. Turn on only
// after the backend verifies the idToken the app now sends.
export const SOCIAL_LOGIN_ENABLED = false;

// Camera "Lenses" (face effects). Off: lenses are only drawn on the camera
// preview and are missing from the exported video (bakeEdits has no lens step).
export const LENSES_ENABLED = false;

/** Opens the Withdraw screen (earned coins to UPI / bank, paid within 24-48 hours). */
export const WITHDRAW_ROUTE = "/(main)/withdraw";
