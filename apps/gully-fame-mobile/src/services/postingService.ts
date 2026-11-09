import { store } from "@/store";
import {
  postingDone,
  postingCleared,
  postingFailed,
  postingProgress,
  postingStarted,
  type PostingStage,
} from "@/store/slices/postingSlice";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
  cancelActiveUpload,
  createReelFromUpload,
  saveDraft,
  uploadFileToStorage,
  type VideoUploadRequest,
} from "@/api/services/videoUploadService";
import { joinCompetition } from "@/api/services/competitionService";
import { ApiError } from "@/api/client";
import { saveReelToLocalCache } from "@/hooks/useUserReels";
import { convertPhotoToVideo, type PhotoMusic } from "@modules/video-editor/camera-module/utils/photoToVideo";

/**
 * Background posting. The job lives in this module (not in a screen), so leaving the caption
 * screen never cancels it. The posting banner reads its progress from the `posting` slice.
 *
 * Stages: preparing -> (converting, photos) -> uploading -> publishing -> done.
 * Each finished stage is remembered on the job, so Retry resumes from the stage that failed
 * and never repeats an upload or a publish that already succeeded. The baked file is kept
 * until the post succeeds.
 */
export interface PostingJob {
  mediaType: "video" | "photo";
  /** "publish" (default) goes live; "draft" saves to POST /reels/draft. */
  mode?: "publish" | "draft";
  /** The baked file (a video, or a photo that still has to be converted). */
  fileUri: string;
  request: VideoUploadRequest;
  /** Photo posts only: the chosen music, mixed into the converted video. */
  music?: PhotoMusic | null;
  // Filled in as stages complete (a retry skips every stage already done):
  videoUri?: string;
  thumbnailUrl?: string;
  uploadedUrl?: string;
  reel?: any;
}

let job: PostingJob | null = null;
let running = false;
let cancelled = false;

const dispatch = store.dispatch;
const stagesFor = (mediaType: "video" | "photo"): PostingStage[] =>
  mediaType === "photo"
    ? ["preparing", "converting", "uploading", "publishing", "done"]
    : ["preparing", "uploading", "publishing", "done"];

/** Overall progress band of each stage, 0..100. */
const BANDS: Record<PostingStage, [number, number]> = {
  preparing: [0, 5],
  converting: [5, 25],
  processing: [5, 25],
  uploading: [25, 90],
  publishing: [90, 99],
  done: [100, 100],
};
const report = (stage: PostingStage, fraction: number) => {
  const [from, to] = BANDS[stage];
  dispatch(postingProgress({ stage, progress: from + (to - from) * Math.min(1, Math.max(0, fraction)) }));
};

class Cancelled extends Error {}
const checkCancelled = () => {
  if (cancelled) throw new Cancelled();
};

async function run() {
  if (!job) return;
  running = true;
  cancelled = false;
  const current = job;
  try {
    report("preparing", 0);
    checkCancelled();

    // WORKAROUND (no photo post type on the backend): the baked photo becomes a 5 s video.
    if (current.mediaType === "photo" && !current.videoUri) {
      report("converting", 0);
      current.videoUri = await convertPhotoToVideo(current.fileUri, current.music ?? null, (f) => report("converting", f));
    }
    checkCancelled();

    if (!current.uploadedUrl) {
      report("uploading", 0);
      current.uploadedUrl = await uploadFileToStorage(current.videoUri ?? current.fileUri, (percent) =>
        report("uploading", percent / 100)
      );
    }
    checkCancelled();

    // Cover image: the photo itself, or a frame from the video. A cover that
    // fails doesn't stop the post (feed cards fall back to a placeholder).
    if (!current.thumbnailUrl) {
      try {
        const coverUri =
          current.mediaType === "photo"
            ? current.fileUri
            : (await VideoThumbnails.getThumbnailAsync(current.videoUri ?? current.fileUri, { time: 500, quality: 0.7 })).uri;
        current.thumbnailUrl = await uploadFileToStorage(coverUri, undefined, "image/jpeg");
      } catch {
        // Publish without a cover.
      }
    }
    if (current.thumbnailUrl) current.request.thumbnail = current.thumbnailUrl;
    checkCancelled();

    if (!current.reel) {
      report("publishing", 0);
      if (current.mode === "draft") {
        current.reel = await saveDraft(current.uploadedUrl, current.request);
      } else {
        // A competition entry also registers the user (already joined is fine).
        if (current.request.competitionId) {
          try {
            await joinCompetition(current.request.competitionId);
          } catch (error) {
            if ((error as ApiError)?.key !== "already_joined") throw error;
          }
        }
        const result = await createReelFromUpload(current.uploadedUrl, current.request);
        if (!result.success) throw new Error(result.message || "Publishing failed");
        current.reel = result.data?.reel ?? {};
      }
    }

    // Published reels show on the profile right away; drafts don't.
    if (current.mode !== "draft") {
      try {
        await saveReelToLocalCache(
          current.reel?._id || current.reel?.id
            ? current.reel
            : {
                id: `reel-${Date.now()}`,
                title: current.request.title,
                description: current.request.description,
                videoUrl: current.uploadedUrl,
                video_url: current.uploadedUrl,
                thumbnail_url: current.thumbnailUrl ?? "",
                createdAt: new Date().toISOString(),
              }
        );
      } catch { /* intentionally ignored */
      }
    }

    job = null;
    dispatch(postingDone());
    setTimeout(() => {
      if (store.getState().posting.phase === "done") dispatch(postingCleared());
    }, 3500);
  } catch (error: any) {
    if (error instanceof Cancelled || cancelled) {
      dispatch(postingCleared());
      return;
    }
    dispatch(postingFailed(error?.message || "Something went wrong"));
  } finally {
    running = false;
  }
}

/** Starts a post. Returns false when one is already running (a double tap can't post twice). */
export function startPosting(newJob: PostingJob): boolean {
  if (running || store.getState().posting.phase === "running") return false;
  job = newJob;
  dispatch(postingStarted({ mediaType: newJob.mediaType, mode: newJob.mode, stages: stagesFor(newJob.mediaType) }));
  void run();
  return true;
}

/** Resumes the failed post from the stage that failed. */
export function retryPosting(): boolean {
  if (running || !job) return false;
  dispatch(postingStarted({ mediaType: job.mediaType, mode: job.mode, stages: stagesFor(job.mediaType) }));
  void run();
  return true;
}

/** Abandons the post (the baked file stays in the cache). */
export async function cancelPosting(): Promise<void> {
  cancelled = true;
  await cancelActiveUpload();
  if (!running) {
    job = null;
    dispatch(postingCleared());
  }
  job = null;
}

export const isPosting = () => running || store.getState().posting.phase === "running";
