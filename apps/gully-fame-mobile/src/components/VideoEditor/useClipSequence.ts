import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVideoPlayer, type VideoPlayer } from "expo-video";

import type { Clip } from "@/types/editor.types";

export const clipStart = (clip: Clip) => clip.trimStart ?? 0;
export const clipEnd = (clip: Clip) => clip.trimEnd ?? clip.duration;
export const clipLength = (clip: Clip) => Math.max(0, clipEnd(clip) - clipStart(clip));

export interface ClipSequence {
  player: VideoPlayer;
  /** Clip on screen now (undefined when there are no clips). */
  clip: Clip | undefined;
  index: number;
  isPlaying: boolean;
  /** Seconds from the start of the whole sequence. */
  time: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Jump to a point in the whole sequence (seconds). */
  seek: (time: number) => void;
}

const TICK = 0.1;

/**
 * Plays a list of clips back to back on ONE expo-video player.
 * Video clips play between their trim points; photo clips are held on screen for their
 * duration (the caller draws the image). At the end it stops and rewinds to the start.
 */
export function useClipSequence(clips: Clip[]): ClipSequence {
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = TICK;
  });
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const localTimeRef = useRef(0);
  useEffect(() => {
    localTimeRef.current = localTime;
  }, [localTime]);
  // Where to start the next clip that loads (seconds into that clip's trimmed range).
  const pendingOffset = useRef(0);

  const offsets = useMemo(() => {
    const starts: number[] = [];
    let sum = 0;
    for (const c of clips) {
      starts.push(sum);
      sum += clipLength(c);
    }
    return { starts, total: sum };
  }, [clips]);

  const safeIndex = Math.min(index, Math.max(0, clips.length - 1));
  const clip = clips[safeIndex];
  const clipKey = clip ? `${clip.id}|${clip.uri}|${clipStart(clip)}|${clipEnd(clip)}` : "";

  // The clip that already asked to advance (timeUpdate keeps firing near the end).
  const advancedKey = useRef<string | null>(null);
  // The clip the player has finished loading. End events before that come from the
  // previous (or empty) source: Android reports "ended" while replaceAsync swaps sources.
  const loadedKey = useRef<string | null>(null);
  const advance = useCallback(() => {
    if (advancedKey.current === clipKey) return;
    advancedKey.current = clipKey;
    pendingOffset.current = 0;
    setLocalTime(0);
    if (safeIndex < clips.length - 1) {
      setIndex(safeIndex + 1);
      return;
    }
    // End of the sequence: stop and rewind.
    setIsPlaying(false);
    if (safeIndex === 0) {
      // Same clip stays loaded, so rewind it here (the load effect won't rerun).
      advancedKey.current = null;
      if (clips[0]?.type !== "photo") player.currentTime = clipStart(clips[0]);
    } else {
      setIndex(0);
    }
  }, [clipKey, safeIndex, clips, player]);

  // Load the current clip into the player (videos) or pause the player (photos).
  useEffect(() => {
    if (!clip) return;
    if (index !== safeIndex) setIndex(safeIndex);
    const offset = pendingOffset.current;
    advancedKey.current = null;
    setLocalTime(offset);
    if (clip.type === "photo") {
      player.pause();
      return;
    }
    let cancelled = false;
    loadedKey.current = null;
    player
      .replaceAsync({ uri: clip.uri })
      .then(() => {
        if (cancelled) return;
        player.currentTime = clipStart(clip) + offset;
        loadedKey.current = clipKey;
        if (isPlaying) player.play();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipKey, player]);

  // Play/pause follows isPlaying (video clips only).
  useEffect(() => {
    if (!clip || clip.type === "photo") return;
    if (isPlaying) player.play();
    else player.pause();
  }, [isPlaying, clip, player]);

  // Video clips: track time and stop at the trim end.
  useEffect(() => {
    if (!clip || clip.type === "photo") return;
    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      const local = currentTime - clipStart(clip);
      setLocalTime(Math.max(0, local));
      if (loadedKey.current === clipKey && currentTime >= clipEnd(clip) - 0.05) advance();
    });
    const endSub = player.addListener("playToEnd", () => {
      if (loadedKey.current === clipKey) advance();
    });
    return () => {
      timeSub.remove();
      endSub.remove();
    };
  }, [clip, clipKey, player, advance]);

  // Photo clips: a timer stands in for the player clock.
  useEffect(() => {
    if (!clip || clip.type !== "photo" || !isPlaying) return;
    // Wall-clock based so a busy JS thread can't slow the photo down.
    const startedAt = Date.now() - localTimeRef.current * 1000;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed >= clipLength(clip)) {
        clearInterval(id);
        setLocalTime(clipLength(clip));
        advance();
      } else {
        setLocalTime(elapsed);
      }
    }, TICK * 1000);
    return () => clearInterval(id);
  }, [clip, isPlaying, advance]);

  const seek = useCallback(
    (time: number) => {
      if (clips.length === 0) return;
      const t = Math.min(Math.max(0, time), Math.max(0, offsets.total - 0.01));
      let i = offsets.starts.findIndex((start, k) => t < start + clipLength(clips[k]));
      if (i < 0) i = clips.length - 1;
      const offset = t - offsets.starts[i];
      if (i === safeIndex) {
        setLocalTime(offset);
        if (clips[i].type !== "photo") player.currentTime = clipStart(clips[i]) + offset;
      } else {
        pendingOffset.current = offset;
        setIndex(i);
      }
    },
    [clips, offsets, safeIndex, player]
  );

  const play = useCallback(() => setIsPlaying(clips.length > 0), [clips.length]);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p && clips.length > 0), [clips.length]);

  const time = clip ? Math.min(offsets.total, (offsets.starts[safeIndex] ?? 0) + localTime) : 0;
  return { player, clip, index: safeIndex, isPlaying, time, duration: offsets.total, play, pause, toggle, seek };
}
