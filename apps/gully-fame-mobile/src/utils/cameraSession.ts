import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Keeps the camera's recorded clip list on disk, so clips are not lost if
 * Android closes the app before the user posts. The video files themselves are
 * already on disk (the camera writes them to the app's cache); this only keeps
 * the list of them. Cleared when the user discards the clips or posts/saves a draft.
 */

const SESSION_KEY = "@gullyfame_camera_session";

interface StoredSession<Clip> {
  /** Competition the clips were recorded for ("" when none). */
  competitionId: string;
  clips: Clip[];
  savedAt: number;
}

/** Sessions older than this are not offered again (cache files may be gone anyway). */
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export async function saveCameraSession<Clip extends { uri: string }>(
  clips: Clip[],
  competitionId: string | null
): Promise<void> {
  try {
    if (clips.length === 0) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return;
    }
    const session: StoredSession<Clip> = { competitionId: competitionId ?? "", clips, savedAt: Date.now() };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Best effort: recording still works without the backup.
  }
}

/**
 * Returns the saved clips for this competition (or for a normal post when
 * competitionId is null), keeping only clips whose files still exist.
 */
export async function loadCameraSession<Clip extends { uri: string }>(
  competitionId: string | null
): Promise<Clip[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const session = JSON.parse(raw) as StoredSession<Clip>;
    if (!session || !Array.isArray(session.clips)) return [];
    if (Date.now() - (session.savedAt || 0) > MAX_AGE_MS) {
      await clearCameraSession();
      return [];
    }
    if ((session.competitionId || "") !== (competitionId ?? "")) return [];
    const checks = await Promise.all(
      session.clips.map(async (clip) => {
        if (!clip || typeof clip.uri !== "string" || !clip.uri.startsWith("file://")) return false;
        try {
          return (await FileSystem.getInfoAsync(clip.uri)).exists;
        } catch {
          return false;
        }
      })
    );
    return session.clips.filter((_, index) => checks[index]);
  } catch {
    return [];
  }
}

export async function clearCameraSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing else to do.
  }
}
