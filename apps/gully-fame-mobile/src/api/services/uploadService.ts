import * as FileSystem from "expo-file-system/legacy";
import { FileSystemUploadType } from "expo-file-system/legacy";
import { apiPost, ApiError } from "../client";

/**
 * Direct-to-S3 uploads.
 *
 * POST /reels/upload-url { fileName, fileType, assetType } -> { uploadUrl, fileUrl, key }
 * then PUT the raw file bytes to `uploadUrl` with the same Content-Type.
 * The backend only accepts assetType "reels" or "voiceovers" (anything else
 * lands in "reels"). The file is streamed from disk, so large videos never
 * load into JS memory.
 */

export type UploadAssetType = "reels" | "voiceovers" | "profiles";

export interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const EXTENSION_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export function guessMimeType(uri: string, fallback = "application/octet-stream"): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIME[ext] || fallback;
}

export function fileNameFromUri(uri: string, fallbackExt = "bin"): string {
  const raw = uri.split("?")[0].split("/").pop() || "";
  const safe = raw.replace(/[^A-Za-z0-9._-]/g, "_");
  return safe.includes(".") ? safe : `${safe || "upload"}_${Date.now()}.${fallbackExt}`;
}

export async function requestUploadUrl(
  fileName: string,
  fileType: string,
  assetType: UploadAssetType = "reels"
): Promise<PresignedUpload> {
  const data = await apiPost<PresignedUpload>("reels/upload-url", { fileName, fileType, assetType });
  if (!data?.uploadUrl || !data?.fileUrl) {
    throw new ApiError("Could not prepare the upload. Please try again.");
  }
  return data;
}

/** Writes a `data:` URI to a cache file so it can be streamed like any other file. */
async function materializeDataUri(dataUri: string): Promise<{ uri: string; mime: string }> {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUri);
  if (!match) throw new ApiError("Unsupported image format.");
  const [, mime, base64] = match;
  const ext = Object.keys(EXTENSION_MIME).find((k) => EXTENSION_MIME[k] === mime) || "bin";
  const uri = `${FileSystem.cacheDirectory}upload_${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, mime };
}

/**
 * Uploads a local file (file://, content:// or data:) and returns its public URL.
 */
export async function uploadLocalFile(
  localUri: string,
  options: {
    fileType?: string;
    assetType?: UploadAssetType;
    onProgress?: (p: UploadProgress) => void;
    /** Receives the running task so callers can cancel it. */
    onTask?: (task: FileSystem.UploadTask) => void;
  } = {}
): Promise<string> {
  let uri = localUri;
  let fileType = options.fileType;

  if (uri.startsWith("data:")) {
    const written = await materializeDataUri(uri);
    uri = written.uri;
    fileType = fileType || written.mime;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new ApiError("The selected file could not be found.");

  fileType = fileType || guessMimeType(uri);
  const presigned = await requestUploadUrl(fileNameFromUri(uri), fileType, options.assetType);

  const task = FileSystem.createUploadTask(
    presigned.uploadUrl,
    uri,
    {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": fileType },
    },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (!options.onProgress || !totalBytesExpectedToSend) return;
      options.onProgress({
        loaded: totalBytesSent,
        total: totalBytesExpectedToSend,
        percentage: Math.round((totalBytesSent / totalBytesExpectedToSend) * 100),
      });
    }
  );

  options.onTask?.(task);
  const result = await task.uploadAsync();
  if (!result) throw new ApiError("Upload cancelled", { isCancelled: true });
  if (result.status < 200 || result.status >= 300) {
    throw new ApiError("Upload failed. Please check your connection and try again.", {
      status: result.status,
    });
  }
  return presigned.fileUrl;
}

export const isLocalUri = (uri?: string | null): uri is string =>
  !!uri && /^(file:|content:|data:|ph:|assets-library:)/i.test(uri);
