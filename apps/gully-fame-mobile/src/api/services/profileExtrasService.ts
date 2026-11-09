// Profile data the backend does not provide yet. Each function returns a safe empty
// value so the profile screen can hide the section or show "–" instead of a fake number.
// Replace each body with a real API call once the endpoint exists.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiDelete, apiGet, toResult } from "../client";

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface ProfileInsights {
  viewsLast30Days: number;
}

type Result<T = undefined> = { success: boolean; message: string; data?: T };

/** Total from a paginated list response, whatever the backend names it; null if it sends none. */
function pickTotal(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  for (const key of ["total", "totalCount", "count", "totalFollowers", "totalFollowing", "followersCount", "followingCount"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

/**
 * Follower/following totals for a user, from GET user/:id/followers and GET user/:id/following
 * (?page=1&limit=1, only the total is needed). `null` means "unknown", which the UI shows as "–":
 * returned when either request fails or the response carries no total.
 */
export async function getFollowCounts(userId: string): Promise<FollowCounts | null> {
  if (!userId) return null;
  const id = encodeURIComponent(userId);
  try {
    const [followersPage, followingPage] = await Promise.all([
      apiGet<unknown>(`user/${id}/followers`, { params: { page: 1, limit: 1 } }),
      apiGet<unknown>(`user/${id}/following`, { params: { page: 1, limit: 1 } }),
    ]);
    const followers = pickTotal(followersPage);
    const following = pickTotal(followingPage);
    return followers === null || following === null ? null : { followers, following };
  } catch {
    return null;
  }
}

/**
 * Profile view analytics for the signed-in user. `null` hides the insights card.
 */
export async function getProfileInsights(): Promise<ProfileInsights | null> {
  // BACKEND_PENDING: GET user/insights?days=30 -> { viewsLast30Days: number }
  return null;
}

/** Whether the Delete quick action is offered on own posts. */
export const CAN_DELETE_POSTS = true;

const LOCAL_REELS_KEY = "@gullyfame_local_published_reels";

/** Drops a deleted post from the copies cached on this device so it does not reappear. */
async function removeFromLocalCaches(postId: string) {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_REELS_KEY);
    if (stored) {
      const list: any[] = JSON.parse(stored);
      await AsyncStorage.setItem(
        LOCAL_REELS_KEY,
        JSON.stringify(list.filter((r) => (r.id || r._id) !== postId))
      );
    }
    const userId = await AsyncStorage.getItem("userId");
    const key = userId ? `@gullyfame_profile_reels_${userId}` : null;
    const cached = key ? await AsyncStorage.getItem(key) : null;
    if (key && cached) {
      const list: any[] = JSON.parse(cached);
      await AsyncStorage.setItem(key, JSON.stringify(list.filter((r) => (r.id || r._id) !== postId)));
    }
  } catch {
    // Cache cleanup is best effort; the refreshed list comes from the server.
  }
}

/**
 * Delete one of the signed-in user's posts.
 * DELETE reels/:id (owner only; the server soft-deletes, so it disappears everywhere).
 */
export async function deletePost(postId: string): Promise<Result> {
  const result = await toResult(() => apiDelete(`reels/${postId}`), "Post deleted");
  if (!result.success) return { success: false, message: result.message };
  await removeFromLocalCaches(postId);
  return { success: true, message: result.message };
}

/**
 * Link used by "Share profile". The app deep link always works for people who have the app;
 * the website does not serve profile pages yet, so its home page is added for everyone else.
 */
export function getProfileShareMessage(userId: string, displayName: string): string {
  // BACKEND_PENDING: a public web profile page (https://gullyfame.com/profile/:id returns 404 today)
  // or GET user/:id/share-link -> { url } so the shared link opens for people without the app.
  const name = displayName || "this creator";
  return `Check out ${name} on Gully Fame: gullyfamemobile://profile/${userId}\n\nGet the app: https://gullyfame.com`;
}
