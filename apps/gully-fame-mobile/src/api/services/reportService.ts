import { apiPost } from "../client";

/**
 * POST /reels/:reelId/report { reason, details? }
 * One report per person per reel; reporting again updates the reason.
 * Your own reels can't be reported.
 */

/** Keep in sync with REPORT_REASONS in the backend's models/ReelReport.js. */
export const REPORT_REASONS = [
  { key: "spam", label: "Spam or misleading" },
  { key: "nudity", label: "Nudity or sexual content" },
  { key: "violence", label: "Violence or dangerous acts" },
  { key: "hate", label: "Hate speech or symbols" },
  { key: "harassment", label: "Bullying or harassment" },
  { key: "self_harm", label: "Suicide or self-harm" },
  { key: "copyright", label: "Copyright or stolen content" },
  { key: "misinformation", label: "False information" },
  { key: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["key"];

export const REPORT_DETAILS_MAX_LENGTH = 500;

export interface ReportResult {
  reportId: string;
  reelId: string;
  reported: boolean;
  alreadyReported: boolean;
}

export const reportReel = (reelId: string, reason: ReportReason, details?: string) =>
  apiPost<ReportResult>(`reels/${reelId}/report`, {
    reason,
    ...(details && details.trim() ? { details: details.trim().slice(0, REPORT_DETAILS_MAX_LENGTH) } : {}),
  });

export const reportService = { reportReel, REPORT_REASONS };

export default reportService;
