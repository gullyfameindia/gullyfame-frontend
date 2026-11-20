import { apiGet, apiPost, toResult } from "../client";
import { searchCompetitionsPage, normalizeCompetitionStatus, SearchCompetition } from "./searchService";
import type { FeedReel } from "./reelsService";

/**
 * Competitions.
 * GET  /competitions/:id                 -> details (shape depends on status)
 * GET  /competitions/:id/leaderboard     -> paginated ranking by votes
 * GET  /competitions/:id/reels           -> cursor-paginated entries
 * POST /competitions/:id/join            -> UPCOMING / LIVE only
 * POST /competitions/:id/invite          -> { toUserId }
 * GET  /user/competitions                -> competitions I joined or entered
 * GET  /feed/matrix                      -> LIVE competitions with their top reels
 * There is no "list all competitions" endpoint; GET /search?type=competitions
 * with an empty query lists them all (raw status values) and is used for the
 * live / upcoming / past lists.
 */

export type CompetitionStatus = "LIVE" | "UPCOMING" | "ENDED" | "CANCELLED";

export interface LeaderboardRow {
  id: string;
  name: string;
  profilePictureUrl: string;
  rank: number;
  votes?: number;
  points?: number;
  isCurrentUser?: boolean;
  prizeMoneyWon?: number;
}

interface BaseDetails {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  startDate: string;
  endDate: string;
  prizePool: number;
}

export interface LiveCompetitionDetails extends BaseDetails {
  status: "LIVE";
  totalEntries: number;
  is_current_user_entered: boolean;
  leaderboardPreview: LeaderboardRow[];
}

export interface UpcomingCompetitionDetails extends BaseDetails {
  status: "UPCOMING";
  entryFee: number;
  totalParticipantsJoined: number;
  is_current_user_joined: boolean;
  participantsPreview: { id: string; name: string; profilePictureUrl: string; isCurrentUser: boolean }[];
}

export interface EndedCompetitionDetails extends BaseDetails {
  status: "ENDED";
  totalParticipants: number;
  totalViews: number;
  results: LeaderboardRow[];
  recommendedPastCompetitions: {
    _id: string;
    title: string;
    winnerName: string;
    prizePool: number;
    startDate: string;
    endDate: string;
  }[];
}

export type CompetitionDetails = LiveCompetitionDetails | UpcomingCompetitionDetails | EndedCompetitionDetails;

export interface LeaderboardPage {
  competitionId: string;
  currentPage: number;
  hasMore: boolean;
  leaderboard: LeaderboardRow[];
}

export interface MyCompetition {
  _id: string;
  title: string;
  subtitle: string;
  image: string;
  status: CompetitionStatus;
  prizePool: number;
  entryFee: number;
  startDate: string;
  endDate: string;
  participation: "joined" | "submitted";
}

export interface CompetitionReelsPage {
  competitionId: string;
  nextCursor: string | null;
  hasMore: boolean;
  reels: FeedReel[];
}

export interface MatrixCompetition {
  _id: string;
  title: string;
  prize: number;
  endDate: string;
  totalEntries: number;
  initialReels: FeedReel[];
}

/** A competition row in the browse lists, with a normalized status. */
export interface CompetitionListItem extends SearchCompetition {
  normalizedStatus: CompetitionStatus;
  imageUrl: string;
}

export const getCompetitionDetails = (competitionId: string) =>
  apiGet<CompetitionDetails>(`competitions/${competitionId}`);

export const getLeaderboard = (competitionId: string, page = 1, limit = 20) =>
  apiGet<LeaderboardPage>(`competitions/${competitionId}/leaderboard`, { params: { page, limit } });

export const getCompetitionReels = (competitionId: string, cursor?: string | null, limit = 10) =>
  apiGet<CompetitionReelsPage>(`competitions/${competitionId}/reels`, {
    params: { limit, ...(cursor ? { cursor } : {}) },
  });

export const joinCompetition = (competitionId: string) =>
  apiPost<{ competitionId: string; participantsCount: number }>(`competitions/${competitionId}/join`, {});

export const inviteToCompetition = (competitionId: string, toUserId: string) =>
  apiPost<{ competitionId: string; toUserId: string; invited: boolean }>(`competitions/${competitionId}/invite`, {
    toUserId,
  });

export const getMyCompetitions = (page = 1, limit = 20) =>
  apiGet<{ currentPage: number; hasMore: boolean; total: number; competitions: MyCompetition[] }>(
    "user/competitions",
    { params: { page, limit } }
  );

export const getLiveMatrix = (page = 1, limit = 5) =>
  apiGet<{ currentPage: number; hasMore: boolean; competitions: MatrixCompetition[] }>("feed/matrix", {
    params: { page, limit },
  });

/**
 * Browse competitions by status. Pages through GET /search?type=competitions
 * and keeps the requested status (the backend has no status filter).
 */
export async function listCompetitionsByStatus(
  status: CompetitionStatus,
  maxPages = 5
): Promise<CompetitionListItem[]> {
  const out: CompetitionListItem[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const result = await searchCompetitionsPage("", page, 50);
    for (const c of result.results) {
      const normalizedStatus = normalizeCompetitionStatus(c.status);
      if (normalizedStatus === status) {
        out.push({ ...c, normalizedStatus, imageUrl: c.image || c.image_url || "" });
      }
    }
    if (!result.hasMore) break;
  }
  return out;
}

/**
 * All competitions in one category (a Category id or its name), any status.
 * Uses GET /search?type=competitions&category=...
 */
export async function listCompetitionsByCategory(category: string, maxPages = 5): Promise<CompetitionListItem[]> {
  const out: CompetitionListItem[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const result = await searchCompetitionsPage("", page, 50, category);
    for (const c of result.results) {
      out.push({ ...c, normalizedStatus: normalizeCompetitionStatus(c.status), imageUrl: c.image || c.image_url || "" });
    }
    if (!result.hasMore) break;
  }
  return out;
}

export const competitionService = {
  getCompetitionDetails,
  getLeaderboard,
  getCompetitionReels,
  joinCompetition,
  inviteToCompetition,
  getMyCompetitions,
  getLiveMatrix,
  listCompetitionsByCategory,
  listCompetitionsByStatus,
  getDetails: (id: string) => toResult(() => getCompetitionDetails(id)),
  join: (id: string) => toResult(() => joinCompetition(id), "You're in! Competition joined."),
};

export default competitionService;
