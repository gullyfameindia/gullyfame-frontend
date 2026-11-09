import { FFmpegKit, FFprobeKit, ReturnCode, type FFmpegSession } from "ffmpeg-kit-react-native";
import * as FileSystem from "expo-file-system/legacy";

/** Thrown when an FFmpeg session fails; carries the full session log. */
export class FFmpegError extends Error {
  readonly logs: string;
  readonly returnCode: number | null;

  constructor(message: string, logs: string, returnCode: number | null) {
    super(message);
    this.name = "FFmpegError";
    this.logs = logs;
    this.returnCode = returnCode;
  }
}

export interface FFmpegRun {
  durationMs: number;
}

/**
 * H.264 encoder settings for every re-encode. The Android build substitutes
 * com.moizhassan.ffmpeg:ffmpeg-kit-16kb (android/build.gradle), which ships
 * libopenh264 but not libx264, so x264 options like -preset/-crf don't apply.
 */
export const H264_ENCODE_ARGS = ["-c:v", "libopenh264", "-b:v", "8M", "-pix_fmt", "yuv420p"];
export const H264_ENCODE = H264_ENCODE_ARGS.join(" ");

/** FFmpeg wants plain filesystem paths, not file:// URIs. */
export const toFFmpegPath = (uri: string) => uri.replace(/^file:\/\//, "");

export interface RunFFmpegOptions {
  /** Length of the output in ms; with onProgress, reports 0..1 from FFmpeg's statistics. */
  durationMs?: number;
  onProgress?: (fraction: number) => void;
}

/**
 * The single entry point for running FFmpeg in the app.
 * Pass an argument array (preferred, no quoting issues) or a legacy command string.
 * Throws FFmpegError with the session logs instead of failing silently.
 */
export async function runFFmpeg(
  args: string[] | string,
  label = "ffmpeg",
  options: RunFFmpegOptions = {}
): Promise<FFmpegRun> {
  const started = Date.now();
  const { durationMs, onProgress } = options;
  let session: FFmpegSession;
  if (onProgress && durationMs) {
    session = await new Promise<FFmpegSession>((resolve, reject) => {
      const onStats = (stats: { getTime(): number }) => onProgress(Math.min(1, Math.max(0, stats.getTime() / durationMs)));
      const run = Array.isArray(args)
        ? FFmpegKit.executeWithArgumentsAsync(args, resolve, undefined, onStats)
        : FFmpegKit.executeAsync(args, resolve, undefined, onStats);
      run.catch(reject);
    });
  } else {
    session = Array.isArray(args) ? await FFmpegKit.executeWithArguments(args) : await FFmpegKit.execute(args);
  }
  const returnCode = await session.getReturnCode();
  const durationTaken = Date.now() - started;

  if (!ReturnCode.isSuccess(returnCode)) {
    const logs = (await session.getAllLogsAsString()) ?? "";
    const code = returnCode?.getValue() ?? null;
    // Development only: FFmpeg logs contain local file paths, so they never reach release logcat.
    if (__DEV__) {
      // One line per entry: Android's logcat truncates single entries over ~4 KB.
      logs.split("\n").slice(-40).forEach((line) => line.trim() && console.warn(`[${label}] ${line}`));
    }
    throw new FFmpegError(`${label} failed (FFmpeg return code ${code})`, logs, code);
  }

  return { durationMs: durationTaken };
}

/** Hardware H.264 (Android MediaCodec). Much faster than libopenh264 but not on every device. */
const MEDIACODEC_ENCODE_ARGS = ["-c:v", "h264_mediacodec", "-b:v", "6M", "-pix_fmt", "yuv420p"];
let videoEncoder: Promise<string[]> | null = null;

/**
 * Encoder args for edit exports: MediaCodec when a one-off probe encode succeeds
 * on this device, otherwise libopenh264 (logged, so the slower path is never a surprise).
 * x264's -preset/-crf don't exist in this build (no libx264).
 */
export function videoEncodeArgs(): Promise<string[]> {
  videoEncoder ??= (async () => {
    const out = toFFmpegPath(`${FileSystem.cacheDirectory}encoder_probe.mp4`);
    const session = await FFmpegKit.executeWithArguments([
      "-f", "lavfi", "-i", "color=c=gray:s=320x240:d=0.5", ...MEDIACODEC_ENCODE_ARGS, "-y", out,
    ]);
    const ok = ReturnCode.isSuccess(await session.getReturnCode());
    await FileSystem.deleteAsync(`file://${out}`, { idempotent: true });
    if (ok) {
      return MEDIACODEC_ENCODE_ARGS;
    }
    return H264_ENCODE_ARGS;
  })();
  return videoEncoder;
}

/** Audio codecs the MP4 muxer accepts as they are. */
const MP4_AUDIO_CODECS = new Set(["aac", "mp3", "alac", "opus", "ac3", "eac3"]);

/**
 * Audio args for an MP4 output: stream copy when MP4 can hold the source codec, otherwise
 * AAC. Some recorders write AMR (amr_nb/amr_wb), which MP4 rejects ("Could not find tag for codec").
 */
export function mp4AudioArgs(audioCodec: string | null): string[] {
  return !audioCodec || MP4_AUDIO_CODECS.has(audioCodec) ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "128k"];
}

export interface MediaProbe {
  /** Display size, honouring rotation metadata. */
  width: number;
  height: number;
  hasAudio: boolean;
  /** Codec of the first audio stream (e.g. "aac", "amr_nb"); null without audio. */
  audioCodec: string | null;
  /** Seconds; 0 for still images or when unknown. */
  duration: number;
  /** Display rotation from the container metadata, in degrees (0, 90, 180, 270). */
  rotation: number;
}

/** Display size of the first video/image stream, honouring rotation metadata. */
export async function probeMediaSize(path: string): Promise<{ width: number; height: number }> {
  const { width, height } = await probeMedia(path);
  return { width, height };
}

export async function probeMedia(path: string): Promise<MediaProbe> {
  const session = await FFprobeKit.getMediaInformation(toFFmpegPath(path));
  const info = session.getMediaInformation();
  const streams = info?.getStreams() ?? [];
  const stream = streams.find((st) => st.getWidth() > 0 && st.getHeight() > 0);
  if (!stream) {
    const logs = (await session.getAllLogsAsString()) ?? "";
    throw new FFmpegError(`Could not read the size of ${path}`, logs, null);
  }
  const props = stream.getAllProperties() ?? {};
  const sideRotation = (props.side_data_list ?? []).find((d: any) => d.rotation !== undefined)?.rotation;
  const rotation = ((Math.round(Number(sideRotation ?? props.tags?.rotate ?? 0)) % 360) + 360) % 360;
  const audio = streams.find((st) => st.getType() === "audio");
  const hasAudio = !!audio;
  const audioCodec = audio?.getCodec() ?? null;
  const duration = Number(info?.getDuration()) || 0;
  return rotation % 180 === 90
    ? { width: stream.getHeight(), height: stream.getWidth(), hasAudio, audioCodec, duration, rotation }
    : { width: stream.getWidth(), height: stream.getHeight(), hasAudio, audioCodec, duration, rotation };
}
