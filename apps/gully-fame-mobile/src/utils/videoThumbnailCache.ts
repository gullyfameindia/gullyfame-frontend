import AsyncStorage from "@react-native-async-storage/async-storage";
import * as VideoThumbnails from "expo-video-thumbnails";

// Generates a poster frame for videos the backend sent without a thumbnail, and remembers it.
// At most three videos are processed at once so scrolling a long grid stays smooth.

const STORAGE_PREFIX = "@gullyfame_video_thumb_";
const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
const failedThisSession = new Set<string>();
const queue: (() => void)[] = [];
let running = 0;
const MAX_CONCURRENT = 3;
// A slow or unreachable video must not hold a slot forever and stall the queue.
const TIMEOUT_MS = 12000;

function runNext() {
  if (running >= MAX_CONCURRENT) return;
  const job = queue.shift();
  if (job) {
    running += 1;
    job();
  }
}

// Expired pre-signed links (403) make the native decoder hang until the timeout, so check
// the link with a 1-byte request first and fail fast when it is not reachable.
async function isReachable(url: string): Promise<boolean> {
  if (!/^https?:/i.test(url)) return true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: controller.signal });
    return res.ok || res.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function getCachedThumbnail(videoUrl: string): string | null {
  return memory.get(videoUrl) ?? null;
}

export function getVideoThumbnail(videoUrl: string): Promise<string | null> {
  const known = memory.get(videoUrl);
  if (known) return Promise.resolve(known);
  if (failedThisSession.has(videoUrl)) return Promise.resolve(null);
  const pending = inflight.get(videoUrl);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    queue.push(async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_PREFIX + videoUrl);
        if (stored) {
          memory.set(videoUrl, stored);
          resolve(stored);
          return;
        }
        if (!(await isReachable(videoUrl))) {
          failedThisSession.add(videoUrl);
          resolve(null);
          return;
        }
        const { uri } = await Promise.race([
          VideoThumbnails.getThumbnailAsync(videoUrl, { time: 500, quality: 0.6 }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
        ]);
        memory.set(videoUrl, uri);
        AsyncStorage.setItem(STORAGE_PREFIX + videoUrl, uri).catch(() => {});
        resolve(uri);
      } catch {
        failedThisSession.add(videoUrl);
        resolve(null);
      } finally {
        running -= 1;
        inflight.delete(videoUrl);
        runNext();
      }
    });
    runNext();
  });

  inflight.set(videoUrl, promise);
  return promise;
}
