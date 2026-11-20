import { apiGet, toResult } from "../client";
import type { FeedReel } from "./reelsService";

/**
 * GET /search?q&type&page&limit (type: all | users | competitions | reels).
 * "all" returns the top 3 of each kind; the typed searches are paginated.
 * An empty `q` matches everything, which is how full lists are browsed.
 */

export interface SearchUser {
  _id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string;
  followers_count: number;
  is_followed_by_me: boolean;
}

export interface SearchCompetition {
  _id: string;
  title: string;
  /** Raw status as stored: LIVE, live, UPCOMING, CREATED, APPROVED, ENDED, COMPLETED, CANCELLED. */
  status: string;
  prize: number;
  participants: number;
  /** "image" on typed search, "image_url" on type=all. */
  image?: string;
  image_url?: string;
  /** Typed competition search only. */
  startDate?: string | null;
  endDate?: string | null;
}

export interface SearchAllResult {
  top_users: SearchUser[];
  top_competitions: SearchCompetition[];
  top_reels: FeedReel[];
}

export interface SearchPage<T> {
  currentPage: number;
  hasMore: boolean;
  results: T[];
}

const DEFAULT_LIMIT = 15;

export const searchAll = (q: string) => apiGet<SearchAllResult>("search", { params: { q, type: "all" } });

export const searchUsersPage = (q: string, page = 1, limit = DEFAULT_LIMIT) =>
  apiGet<SearchPage<SearchUser>>("search", { params: { q, type: "users", page, limit } });

/** `category` (a Category id or name) limits results to that category. */
export const searchCompetitionsPage = (q: string, page = 1, limit = DEFAULT_LIMIT, category?: string) =>
  apiGet<SearchPage<SearchCompetition>>("search", {
    params: { q, type: "competitions", page, limit, ...(category ? { category } : {}) },
  });

export const searchReelsPage = (q: string, page = 1, limit = DEFAULT_LIMIT) =>
  apiGet<SearchPage<FeedReel>>("search", { params: { q, type: "reels", page, limit } });

/** Normalizes the competition status values the backend stores. */
export function normalizeCompetitionStatus(status?: string): "LIVE" | "UPCOMING" | "ENDED" | "CANCELLED" {
  const s = (status || "").toUpperCase();
  if (s === "LIVE") return "LIVE";
  if (s === "ENDED" || s === "COMPLETED") return "ENDED";
  if (s === "CANCELLED") return "CANCELLED";
  return "UPCOMING";
}

export const searchService = {
  globalSearch: (q: string) => toResult(() => searchAll(q)),
  searchUsers: (q: string, page = 1) => toResult(() => searchUsersPage(q, page)),
  searchCompetitions: (q: string, page = 1) => toResult(() => searchCompetitionsPage(q, page)),
  searchReels: (q: string, page = 1) => toResult(() => searchReelsPage(q, page)),
};

export default searchService;
