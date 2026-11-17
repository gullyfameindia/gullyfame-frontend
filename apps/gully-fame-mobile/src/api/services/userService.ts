import { apiGet, apiPost, apiPut, toResult, ApiResult } from "../client";
import { isLocalUri, uploadLocalFile } from "./uploadService";

/** The user document as GET /user/profile returns it (password stripped). */
export interface BackendUser {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobile?: string;
  profileImage: string;
  gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | "";
  role: "participants" | "fan";
  categories?: string | null;
  dob: string;
  isActive: boolean;
  isDeleted: boolean;
  notificationAllowed: boolean;
  xp: number;
  level: number;
  streakCount: number;
  device_token?: string;
  device_type?: "android" | "ios" | "web" | "";
  followersCount?: number;
  followingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Another user's public profile, as GET /user/:userId returns it. */
export interface PublicProfile {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
  role: BackendUser["role"];
  level?: number;
  streakCount?: number;
  createdAt?: string;
  followersCount: number;
  followingCount: number;
  reelsCount: number;
  isFollowedByMe: boolean;
  followsMe: boolean;
  isMe: boolean;
}

/**
 * Fields the app is allowed to send to PUT /user/profile. The backend stores
 * whatever it receives, so we only ever send this allowlist.
 * `profileImage` may be a local file / data URI; it is uploaded first.
 */
export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  gender?: BackendUser["gender"];
  dob?: string;
  role?: BackendUser["role"];
  profileImage?: string;
  categories?: string;
  device_token?: string;
  device_type?: "android" | "ios" | "web" | "";
  latitude?: number;
  longitude?: number;
}

const PROFILE_FIELDS: (keyof ProfileUpdate)[] = [
  "firstName",
  "lastName",
  "username",
  "email",
  "gender",
  "dob",
  "role",
  "profileImage",
  "categories",
  "device_token",
  "device_type",
  "latitude",
  "longitude",
];

export interface Progress {
  xp: number;
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpToNextLevel: number;
  xpPerLevel: number;
  streakCount: number;
}

export interface DailyMission {
  target: number;
  current: number;
  completed: boolean;
  rewardXp?: number;
  rewardCoins?: number;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  banner: string;
  tagline: string;
  description: string;
  followersCount: number;
  activeContestantsCount: number;
}

export interface Champion {
  id: string;
  name: string;
  username: string;
  profilePictureUrl: string;
  totalVotes: number;
  totalReels: number;
  rank: number;
}

/** UI labels ("Female", "Prefer not to say") -> the backend's gender enum. */
export function toBackendGender(label?: string | null): BackendUser["gender"] {
  const value = (label || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (value === "male" || value === "female" || value === "non-binary" || value === "prefer-not-to-say") {
    return value;
  }
  return "";
}

/** Backend gender enum -> display label. */
export function genderLabel(value?: string | null): string {
  switch (value) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "non-binary":
      return "Non-binary";
    case "prefer-not-to-say":
      return "Prefer not to say";
    default:
      return "";
  }
}

export const displayName = (user?: Partial<BackendUser> | null): string => {
  if (!user) return "";
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.username || user.email || user.mobile || "";
};

// ==================== PROFILE ====================

/** GET /user/profile */
export const getProfile = () => apiGet<BackendUser>("user/profile");

/**
 * PUT /user/profile with the allowlisted fields. A local `profileImage` is
 * uploaded to S3 first (the backend's own multipart avatar upload stores the
 * file under a field the schema drops, so it never shows up).
 */
export async function updateProfile(update: ProfileUpdate): Promise<BackendUser> {
  const body: Record<string, any> = {};
  for (const key of PROFILE_FIELDS) {
    const value = update[key];
    if (value !== undefined && value !== null) body[key] = value;
  }
  if (isLocalUri(body.profileImage)) {
    body.profileImage = await uploadLocalFile(body.profileImage, { assetType: "reels" });
  }
  await apiPut("user/profile", body);
  return getProfile();
}

/** GET /user/:userId - another user's public profile with follow counts. */
export const getPublicProfile = (userId: string) => apiGet<PublicProfile>(`user/${encodeURIComponent(userId)}`);

export const getCurrentUser = (): Promise<ApiResult<BackendUser>> => toResult(getProfile);

export const updateUserProfile = (update: ProfileUpdate) => toResult(() => updateProfile(update), "Profile updated");

/** Registers this device's push token on the profile (no dedicated endpoint exists). */
export const registerDeviceToken = (token: string, platform: "android" | "ios") =>
  apiPut("user/profile", { device_token: token, device_type: platform });

/**
 * GET /user/notifications/switch. Note: the backend currently always turns
 * notifications OFF for active accounts (it reads `isActive` instead of the
 * current setting), so the caller must re-read the profile afterwards.
 */
export async function toggleNotifications(): Promise<boolean> {
  await apiGet("user/notifications/switch");
  const profile = await getProfile();
  return !!profile.notificationAllowed;
}

// ==================== FOLLOW ====================

/** POST /user/:userId/follow toggles and returns the new state. */
export const toggleFollow = (userId: string) => apiPost<{ following: boolean }>(`user/${userId}/follow`, {});

export const toggleFollowUser = (userId: string) => toResult(() => toggleFollow(userId));

// ==================== GAMIFICATION ====================

export const getProgress = () => apiGet<Progress>("user/progress");
export const getDailyMission = () => apiGet<DailyMission>("user/daily-mission");

// ==================== DISCOVERY ====================

export const getCategories = (page = 1, limit = 50) =>
  apiGet<{ page: number; limit: number; totalCategories: number; categories: Category[] }>("user/categories", {
    params: { page, limit },
  });

export const getChampions = (page = 1, limit = 20) =>
  apiGet<{ currentPage: number; hasMore: boolean; total: number; champions: Champion[] }>("user/champions", {
    params: { page, limit },
  });

export const userService = {
  getProfile,
  updateProfile,
  getPublicProfile,
  getCurrentUser,
  updateUserProfile,
  registerDeviceToken,
  toggleNotifications,
  toggleFollow,
  toggleFollowUser,
  getProgress,
  getDailyMission,
  getCategories,
  getChampions,
};

export default userService;
