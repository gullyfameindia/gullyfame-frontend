import * as FileSystem from "expo-file-system/legacy";
import { apiGet, apiPost, toResult, ApiResult } from "../client";
import { uploadLocalFile, UploadAssetType } from "./uploadService";

/**
 * Reel upload + publish.
 * 1. POST /reels/upload-url -> presigned S3 PUT (file streamed from disk)
 * 2. POST /reels/publish { video_url, thumbnail_url, caption, competitionId, music, ctaLink }
 *    or POST /reels/draft with the same fields (+ reelId to update a draft)
 * GET /reels/draft returns the latest draft ({} when none).
 */

export interface VideoUploadRequest {
  title: string;
  description?: string;
  /** Public URL of an uploaded cover image. */
  thumbnail?: string;
  duration: number;
  resolution: "hd" | "2k" | "4k" | "720p" | "1080p";
  fps: number;
  tags?: string[];
  competitionId?: string;
  /** From the music picker: the audio library id and its display title. */
  music?: { trackId: string; title: string; artist?: string; startOffset?: number; duration?: number };
  ctaLink?: { label: string; url: string };
  /** Set when posting from a saved draft: the server promotes (or updates) that draft. */
  draftReelId?: string;
  /** Place tagged on the post. */
  location?: { name: string; latitude?: number; longitude?: number };
}

export interface PublishedReel {
  _id: string;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  status: "draft" | "published";
  competition: string | null;
  createdAt: string;
}

let activeTask: FileSystem.UploadTask | null = null;

/** Streams a local file to S3 and returns its public URL. */
export async function uploadFileToStorage(
  fileUri: string,
  onPercent?: (percent: number) => void,
  mimeType = "video/mp4",
  assetType: UploadAssetType = "reels"
): Promise<string> {
  try {
    return await uploadLocalFile(fileUri, {
      fileType: mimeType,
      assetType,
      onProgress: (p) => onPercent?.(p.percentage),
      onTask: (task) => {
        activeTask = task;
      },
    });
  } finally {
    activeTask = null;
  }
}

export async function cancelActiveUpload(): Promise<void> {
  try {
    await activeTask?.cancelAsync();
  } catch {
    // Nothing running.
  }
  activeTask = null;
}

/**
 * The backend has no tags field, so hashtags are added to the end of the caption
 * (reel search matches the caption). Tags already written in the caption are not repeated.
 */
export function captionWithTags(caption: string, tags?: string[]): string {
  const text = caption.trim();
  const present = new Set((text.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.toLowerCase()));
  const extra: string[] = [];
  for (const raw of tags || []) {
    const word = String(raw).trim().replace(/^#+/, "").replace(/\s+/g, "");
    const tag = `#${word}`;
    if (!word || present.has(tag.toLowerCase())) continue;
    present.add(tag.toLowerCase());
    extra.push(tag);
  }
  return [text, extra.join(" ")].filter(Boolean).join(text && extra.length ? "\n\n" : "");
}

const reelBody = (videoUrl: string, request: VideoUploadRequest) => ({
  video_url: videoUrl,
  thumbnail_url: request.thumbnail || "",
  caption: captionWithTags(request.description || request.title || "", request.tags),
  ...(request.competitionId ? { competitionId: request.competitionId } : {}),
  music: request.music?.trackId ? { id: request.music.trackId, name: request.music.title } : { id: "", name: "" },
  ...(request.ctaLink?.url ? { ctaLink: request.ctaLink } : {}),
  ...(request.draftReelId ? { reelId: request.draftReelId } : {}),
  // NOTE: the backend does not store this yet (Reel has no location field and /reels/publish
  // ignores unknown fields), so it is sent ahead of that change and is harmless until then.
  ...(request.location?.name ? { location: request.location } : {}),
});

/** POST /reels/publish */
export const publishReel = (videoUrl: string, request: VideoUploadRequest) =>
  apiPost<PublishedReel>("reels/publish", reelBody(videoUrl, request));

/** Kept for the posting job, which consumes `{ success, data: { reel } }`. */
export const createReelFromUpload = (
  videoUrl: string,
  request: VideoUploadRequest
): Promise<ApiResult<{ reel: PublishedReel }>> =>
  toResult(async () => ({ reel: await publishReel(videoUrl, request) }), "Reel published");

/** POST /reels/draft (creates, or updates `reelId` when it is still a draft). */
export const saveDraft = (videoUrl: string, request: VideoUploadRequest, reelId?: string) =>
  apiPost<PublishedReel>("reels/draft", { ...reelBody(videoUrl, request), ...(reelId ? { reelId } : {}) });

/** GET /reels/draft -> the latest draft or null. */
export async function getLatestDraft(): Promise<PublishedReel | null> {
  const data = await apiGet<PublishedReel | Record<string, never>>("reels/draft");
  return data && "_id" in data ? (data as PublishedReel) : null;
}

export const videoUploadService = {
  uploadFileToStorage,
  cancelActiveUpload,
  publishReel,
  createReelFromUpload,
  saveDraft,
  getLatestDraft,
};

export default videoUploadService;
