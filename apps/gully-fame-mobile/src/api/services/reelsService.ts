import { apiGet, apiPost, toResult } from "../client";
import { resolveMediaUrl } from "@/utils/mediaUrl";

/**
 * Reels feed and interactions.
 * GET  /reels?cursor&limit             -> newest-first, cursor paginated
 * POST /reels/:reelId/action           -> toggles vote | like | save
 * Votes only count on entries in a LIVE competition; the backend rejects others.
 * `competition` is set on competition entries (vote) and null on normal reels (like).
 */

export interface FeedReelAuthor {
  _id: string;
  username: string;
  profile_picture_url: string;
  is_followed_by_me: boolean;
}

export interface FeedReel {
  _id: string;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  createdAt: string;
  author: FeedReelAuthor;
  music: { id: string; name: string };
  /** Missing on servers older than the competition flag. */
  competition?: { _id: string; title: string; status: string } | null;
  stats: {
    votes: number;
    comments: number;
    shares: number;
    saves: number;
    tips: number;
    likes?: number;
  };
  user_interactions: {
    has_voted: boolean;
    is_liked?: boolean;
    is_saved: boolean;
    has_tipped: boolean;
  };
}

export interface ReelsPage {
  nextCursor: string | null;
  hasMore: boolean;
  reels: FeedReel[];
}

export type ReelAction = "vote" | "like" | "save";

export interface ReelActionResult {
  reelId: string;
  action_type: ReelAction;
  updated_stats: { votes: number; likes: number; saves: number };
  user_interactions: { has_voted: boolean; is_liked: boolean; is_saved: boolean };
}

/**
 * Caption as shown to people. Older app versions saved "Untitled Reel" when the caption was
 * left empty; that placeholder is shown as no caption.
 */
export function displayCaption(caption?: string | null): string {
  const text = (caption || "").trim();
  return /^untitled reel$/i.test(text) ? "" : text;
}

/** The shape the reel player screens render. */
export interface UiReel {
  /** Stable numeric key derived from the backend id (the player keys maps by number). */
  id: number;
  _backendId: string;
  userId: string;
  username: string;
  profileImage: string;
  caption: string;
  musicName: string;
  video: { uri: string };
  thumbnail: string;
  likes: number;
  votes: number;
  comments: number;
  shares: number;
  saves: number;
  tips: number;
  isLiked: boolean;
  /** Set when the reel is a competition entry: it gets a Vote button instead of Like. */
  competition: { id: string; title: string; status: string } | null;
  isSaved: boolean;
  hasVoted: boolean;
  hasTipped: boolean;
  isFollowed: boolean;
  createdAt: string;
}

export function toUiReel(reel: FeedReel, index = 0): UiReel {
  const numericId = parseInt(reel._id.slice(-8), 16) % 100000000 || index + 1;
  return {
    id: numericId,
    _backendId: reel._id,
    userId: reel.author?._id || "",
    username: reel.author?.username || "Gully Fame Creator",
    profileImage: reel.author?.profile_picture_url || "",
    caption: displayCaption(reel.caption),
    musicName: reel.music?.name || "Original Sound",
    // The API may send server-relative paths ("/videos/a.mp4"); the player needs a full URL.
    video: { uri: resolveMediaUrl(reel.video_url) || "" },
    thumbnail: resolveMediaUrl(reel.thumbnail_url) || "",
    likes: reel.stats?.likes || 0,
    votes: reel.stats?.votes || 0,
    comments: reel.stats?.comments || 0,
    shares: reel.stats?.shares || 0,
    saves: reel.stats?.saves || 0,
    tips: reel.stats?.tips || 0,
    isLiked: !!reel.user_interactions?.is_liked,
    competition: reel.competition
      ? { id: String(reel.competition._id), title: reel.competition.title || "", status: reel.competition.status || "" }
      : null,
    isSaved: !!reel.user_interactions?.is_saved,
    hasVoted: !!reel.user_interactions?.has_voted,
    hasTipped: !!reel.user_interactions?.has_tipped,
    isFollowed: !!reel.author?.is_followed_by_me,
    createdAt: reel.createdAt,
  };
}

/** GET /reels?cursor&limit */
export const listReels = (cursor?: string | null, limit = 10) =>
  apiGet<ReelsPage>("reels", { params: { limit, ...(cursor ? { cursor } : {}) } });

/** One page of the feed mapped for the player. */
export async function listUiReels(cursor?: string | null, limit = 10) {
  const page = await listReels(cursor, limit);
  return { reels: page.reels.map(toUiReel), nextCursor: page.nextCursor, hasMore: page.hasMore };
}

/** POST /reels/:reelId/action { action_type } */
export const toggleReelAction = (reelId: string, action: ReelAction) =>
  apiPost<ReelActionResult>(`reels/${reelId}/action`, { action_type: action });

export const reelsService = {
  listReels,
  toggleReelAction,
  listUiReels,
  /** `{ success, data: { reels: UiReel[], nextCursor, hasMore } }` for the player screens. */
  getReels: (limit = 10, cursor?: string | null) => toResult(() => listUiReels(cursor, limit)),
  toggleLikeReel: (reelId: string) => toResult(() => toggleReelAction(reelId, "like")),
  toggleSaveReel: (reelId: string) => toResult(() => toggleReelAction(reelId, "save")),
  toggleVoteReel: (reelId: string) => toResult(() => toggleReelAction(reelId, "vote")),
};

export default reelsService;
