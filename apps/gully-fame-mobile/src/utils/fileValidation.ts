import type { ImagePickerAsset } from "expo-image-picker";

/**
 * Client-side checks for files the user picks before they are processed or uploaded.
 *
 * These are a UX guard (fail fast with a clear message, avoid reading a huge file into memory),
 * not a security boundary: the backend must still validate type and size on its side.
 */

export type MediaKind = "image" | "video";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "3gp", "webm"]);

const extensionOf = (uri: string): string => {
  const clean = uri.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
};

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

function detectKind(asset: Pick<ImagePickerAsset, "uri" | "type" | "mimeType">): MediaKind | null {
  const mime = asset.mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/") && !mime.includes("svg")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime) return null; // a known, unsupported type (pdf, svg, audio, ...)

  if (asset.type === "image") return "image";
  if (asset.type === "video") return "video";

  const ext = extensionOf(asset.uri);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
}

/**
 * Returns a user-facing message when the picked asset must not be used, or null when it is fine.
 * `fileSize` is optional in the picker result; when the platform does not report it the size
 * check is skipped.
 */
export function validatePickedAsset(
  asset: Pick<ImagePickerAsset, "uri" | "type" | "mimeType" | "fileSize">,
  allowed: readonly MediaKind[] = ["image"]
): string | null {
  if (!asset?.uri) return "We couldn't read that file. Please pick another one.";

  const kind = detectKind(asset);
  if (!kind || !allowed.includes(kind)) {
    return allowed.length === 1 && allowed[0] === "image"
      ? "Please choose a photo (JPG, PNG, WebP or HEIC)."
      : "Please choose a photo or a video.";
  }

  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (typeof asset.fileSize === "number" && asset.fileSize > limit) {
    return `That ${kind} is too large. The limit is ${formatMb(limit)}.`;
  }
  return null;
}
