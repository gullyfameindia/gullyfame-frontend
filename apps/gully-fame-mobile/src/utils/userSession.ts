import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthToken, setAuthToken } from "@api/client";
import { getProfile, BackendUser } from "@api/services/userService";
import { clearOwnProfileSnapshot } from "./ownProfileCache";

/**
 * Session handling.
 * - The JWT lives in SecureStore only (see api/client).
 * - A few non-secret profile fields are cached in AsyncStorage so screens can
 *   render instantly; the backend profile stays the source of truth.
 */

export interface UserSession {
  token: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: "participants" | "fan";
  profileImage: string;
  profileCompleted: boolean;
}

/** AsyncStorage keys that hold cached profile data for the signed-in user. */
export const SESSION_CACHE_KEYS = [
  "isLoggedIn",
  "userId",
  "userRole",
  "userEmail",
  "userFirstName",
  "userLastName",
  "userMobile",
  "userProfileImage",
  "profileCompleted",
  "accountCreatedVia",
  "@gullyfame_home_screen",
  // Blocked users are per account, so they are cleared on logout.
  "@gullyfame_blocked_users",
  // Legacy: the token used to be duplicated here. Always cleared.
  "authToken",
];

/** Writes the cached profile fields from a backend user document. */
export async function cacheUserProfile(user: BackendUser): Promise<void> {
  const profileCompleted = !!(user.firstName && user.lastName);
  await AsyncStorage.multiSet([
    ["isLoggedIn", "true"],
    ["userId", user._id || ""],
    ["userRole", user.role === "fan" ? "fan" : "participants"],
    ["userEmail", user.email || ""],
    ["userFirstName", user.firstName || ""],
    ["userLastName", user.lastName || ""],
    ["userMobile", user.mobile || ""],
    ["userProfileImage", user.profileImage || ""],
    ["profileCompleted", profileCompleted ? "true" : "false"],
  ]);
  await AsyncStorage.removeItem("authToken");
}

/**
 * Stores the token and caches the profile. When `user` is missing (OTP login
 * only returns token + userId), the profile is fetched with the new token.
 */
export async function saveUserSession(token: string, user?: BackendUser | null): Promise<BackendUser> {
  clearOwnProfileSnapshot();
  await setAuthToken(token);
  const profile = user && user._id ? user : await getProfile();
  await cacheUserProfile(profile);
  return profile;
}

export async function getUserSession(): Promise<UserSession | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const entries = Object.fromEntries(
    await AsyncStorage.multiGet([
      "userId",
      "userRole",
      "userEmail",
      "userFirstName",
      "userLastName",
      "userMobile",
      "userProfileImage",
      "profileCompleted",
    ])
  );

  return {
    token,
    userId: entries.userId || "",
    firstName: entries.userFirstName || "",
    lastName: entries.userLastName || "",
    email: entries.userEmail || "",
    mobile: entries.userMobile || "",
    role: entries.userRole === "fan" ? "fan" : "participants",
    profileImage: entries.userProfileImage || "",
    profileCompleted: entries.profileCompleted === "true",
  };
}
