import { apiGet } from "../client";
import { resolveMediaUrl } from "@/utils/mediaUrl";

/**
 * Followers / following lists (API collection, "User APIs / Follow"):
 *   GET user/followers                ?page&limit          (signed-in user)
 *   GET user/following                ?page&limit&search   (signed-in user)
 *   GET user/:userId/followers        ?page&limit
 *   GET user/:userId/following        ?page&limit
 *
 * Verified against production: every one answers { page, limit, total, totalPages, users: [] }.
 * No populated example exists yet (no account has followers), so each entry is read defensively:
 * it may be a user document, or a follow record that wraps the user under follower/following/user.
 */

export type FollowListKind = "followers" | "following";

export interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
}

export interface FollowPage {
  users: FollowUser[];
  total: number;
  page: number;
  hasMore: boolean;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Normalizes one list entry, or returns null when it carries no usable user id. */
export function toFollowUser(entry: unknown, kind: FollowListKind): FollowUser | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  // A follow record wraps the person: followers -> `follower`, following -> `following`.
  const nested =
    (kind === "followers" ? record.follower : record.following) ?? record.user ?? record.followerId ?? record.followingId;
  const u = (nested && typeof nested === "object" ? nested : record) as Record<string, unknown>;

  const id = str(u._id) || str(u.id) || str(u.userId);
  if (!id) return null;
  const first = str(u.firstName) || str(u.first_name);
  const last = str(u.lastName) || str(u.last_name);
  const username = str(u.username);
  const name = `${first} ${last}`.trim() || username || "Gully Fame user";
  const avatar = resolveMediaUrl(str(u.profileImage) || str(u.profile_picture_url) || str(u.avatar) || null);
  return { id, name, username, avatar, role: str(u.role) };
}

export async function getFollowList(
  kind: FollowListKind,
  options: { userId?: string; page?: number; limit?: number } = {}
): Promise<FollowPage> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  // Spelled out per endpoint so the contract check (yarn check:api) can match each path to the collection.
  const id = options.userId ? encodeURIComponent(options.userId) : null;
  let path: string;
  if (kind === "followers") path = id ? `user/${id}/followers` : "user/followers";
  else path = id ? `user/${id}/following` : "user/following";
  const data = await apiGet<Record<string, unknown> | null>(path, { params: { page, limit } });
  const raw = Array.isArray(data?.users) ? (data?.users as unknown[]) : [];
  const users = raw.map((entry) => toFollowUser(entry, kind)).filter((u): u is FollowUser => u !== null);
  const totalPages = num(data?.totalPages, page);
  return {
    users,
    total: num(data?.total, users.length),
    page: num(data?.page, page),
    hasMore: page < totalPages,
  };
}
