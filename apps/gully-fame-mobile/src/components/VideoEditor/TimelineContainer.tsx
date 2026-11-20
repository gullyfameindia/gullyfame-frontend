import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import ControlsRow from "./ControlsRow";
import ClipItem from "./ClipItem";
import { clipLength } from "./useClipSequence";
import { EDITOR_ACCENT, TIMELINE_HEIGHT } from "./editorTheme";
import type { AudioTrack, Clip, Overlay } from "@/types/editor.types";

export type LayerKind = "text" | "sticker" | "doodle" | "caption";

/** A text, sticker, doodle or caption shown as a block on the overlay row. */
export interface TimelineLayer {
  id: string;
  kind: LayerKind;
  label: string;
  startTime: number;
  endTime: number;
}

const LAYER_ICON: Record<LayerKind, string> = {
  text: "format-text",
  sticker: "sticker-emoji",
  doodle: "draw",
  caption: "closed-caption-outline",
};

/** Timeline scale: one second of media is this many dp wide (one thumbnail tile). */
export const PX_PER_SECOND = 48;
const OVERLAY_ROW = 32;
const VIDEO_ROW = 60;
const AUDIO_ROW = 32;
const ROW_GAP = 6;

const AUDIO_COLORS = { music: EDITOR_ACCENT, voice: "#2E7D6B", sfx: "#B5532D" };

interface TimelineContainerProps {
  clips: Clip[];
  overlays: Overlay[];
  audioTracks: AudioTrack[];
  layers: TimelineLayer[];
  currentTime: number;
  isPlaying: boolean;
  selectedItemId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onAddClip: () => void;
  onSelectClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onSelectOverlay: (overlayId: string) => void;
  onDeleteOverlay: (overlayId: string) => void;
  onSelectAudio: (trackId: string) => void;
  onDeleteAudio: (trackId: string) => void;
  onSelectLayer: (id: string) => void;
  onDeleteLayer: (id: string, kind: LayerKind) => void;
  onPlayPress: () => void;
  onUndoPress: () => void;
  onRedoPress: () => void;
  /** The user dragged the timeline to this time (seconds). */
  onTimeChange: (time: number) => void;
  /** The user started dragging the timeline (playback should pause). */
  onScrubStart?: () => void;
}

const audioKind = (track: AudioTrack): keyof typeof AUDIO_COLORS =>
  track.id.startsWith("voice-") ? "voice" : track.id.startsWith("soundfx-") ? "sfx" : "music";

const audioLength = (track: AudioTrack) => {
  const end = track.trimEnd || track.originalDuration || track.duration;
  return Math.max(0, end - (track.trimStart || 0));
};

/**
 * Edits-style timeline: ONE horizontal scroll view holds every track, so all blocks share
 * the same time axis. Time 0 sits under the centre playhead; scrolling the content by x
 * means time x / PX_PER_SECOND.
 */
const TimelineContainer: React.FC<TimelineContainerProps> = ({
  clips,
  overlays,
  audioTracks,
  layers,
  currentTime,
  isPlaying,
  selectedItemId,
  canUndo,
  canRedo,
  onAddClip,
  onSelectClip,
  onDeleteClip,
  onSelectOverlay,
  onDeleteOverlay,
  onSelectAudio,
  onDeleteAudio,
  onSelectLayer,
  onDeleteLayer,
  onPlayPress,
  onUndoPress,
  onRedoPress,
  onTimeChange,
  onScrubStart,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const half = screenWidth / 2;
  const scrollRef = useRef<ScrollView>(null);
  const userScrolling = useRef(false);

  const clipLayout = useMemo(() => {
    let x = 0;
    return clips.map((clip) => {
      const width = clipLength(clip) * PX_PER_SECOND;
      const block = { clip, left: x, width };
      x += width;
      return block;
    });
  }, [clips]);
  const totalDuration = clips.reduce((sum, clip) => sum + clipLength(clip), 0);
  const tracksWidth = totalDuration * PX_PER_SECOND;

  // Follow playback (and seeks from elsewhere) unless the user is dragging.
  useEffect(() => {
    if (userScrolling.current) return;
    scrollRef.current?.scrollTo({ x: currentTime * PX_PER_SECOND, animated: false });
  }, [currentTime]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!userScrolling.current) return;
      const t = e.nativeEvent.contentOffset.x / PX_PER_SECOND;
      onTimeChange(Math.min(totalDuration, Math.max(0, t)));
    },
    [onTimeChange, totalDuration]
  );
  const startScrub = useCallback(() => {
    userScrolling.current = true;
    onScrubStart?.();
  }, [onScrubStart]);
  const endScrub = useCallback(() => {
    userScrolling.current = false;
  }, []);

  return (
    <View>
      <ControlsRow
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={totalDuration}
        canUndo={canUndo}
        canRedo={canRedo}
        onPlayPress={onPlayPress}
        onUndoPress={onUndoPress}
        onRedoPress={onRedoPress}
      />

      <View style={styles.timelineArea}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={handleScroll}
          onScrollBeginDrag={startScrub}
          onScrollEndDrag={(e) => {
            // No fling: the drag is over now. With a fling, wait for the momentum to end.
            if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.x) < 0.05) endScrub();
          }}
          onMomentumScrollEnd={endScrub}
        >
          <View style={{ width: tracksWidth + screenWidth + 64, paddingLeft: half }}>
            {/* Overlay track: overlays, stickers and text blocks */}
            <View style={[styles.row, { height: OVERLAY_ROW }]}>
              {overlays.map((o) => (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Overlay. Long press to delete"
                  key={o.id}
                  style={[
                    styles.overlayBlock,
                    { left: o.startTime * PX_PER_SECOND, width: Math.max(24, o.duration * PX_PER_SECOND) },
                    selectedItemId === o.id && styles.blockSelected,
                  ]}
                  onPress={() => onSelectOverlay(o.id)}
                  onLongPress={() => onDeleteOverlay(o.id)}
                >
                  {o.uri ? <Image source={{ uri: o.uri }} style={styles.overlayThumb} contentFit="cover" /> : null}
                  <MaterialCommunityIcons name="layers-outline" size={14} color="#fff" />
                </TouchableOpacity>
              ))}
              {layers.map((layer) => (
                <TouchableOpacity
                  key={layer.id}
                  style={[
                    styles.textBlock,
                    {
                      left: layer.startTime * PX_PER_SECOND,
                      width: Math.max(24, (layer.endTime - layer.startTime) * PX_PER_SECOND),
                    },
                    selectedItemId === layer.id && styles.blockSelected,
                  ]}
                  onPress={() => onSelectLayer(layer.id)}
                  onLongPress={() => onDeleteLayer(layer.id, layer.kind)}
                >
                  <MaterialCommunityIcons name={LAYER_ICON[layer.kind] as any} size={14} color="#000" />
                  <Text style={styles.textLabel} numberOfLines={1}>
                    {layer.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Main video track */}
            <View style={[styles.row, { height: VIDEO_ROW }]}>
              {clipLayout.map(({ clip, left, width }, i) => (
                <View key={clip.id} style={{ position: "absolute", left, width, height: VIDEO_ROW }}>
                  <ClipItem
                    clip={clip}
                    width={width}
                    height={VIDEO_ROW}
                    tileWidth={PX_PER_SECOND}
                    isSelected={selectedItemId === clip.id}
                    onPress={onSelectClip}
                    onDelete={onDeleteClip}
                  />
                  {i < clipLayout.length - 1 && <View style={styles.transition} pointerEvents="none" />}
                </View>
              ))}
              <TouchableOpacity style={[styles.addButton, { left: tracksWidth + 8 }]} onPress={onAddClip} accessibilityLabel="Add clip">
                <Ionicons name="add" size={26} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Audio track: music, voiceover and sound FX */}
            <View style={[styles.row, { height: AUDIO_ROW }]}>
              {audioTracks.map((track) => {
                const kind = audioKind(track);
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[
                      styles.audioBlock,
                      {
                        left: track.startTime * PX_PER_SECOND,
                        width: Math.max(24, audioLength(track) * PX_PER_SECOND),
                        backgroundColor: AUDIO_COLORS[kind],
                      },
                      selectedItemId === track.id && styles.blockSelected,
                    ]}
                    onPress={() => onSelectAudio(track.id)}
                    onLongPress={() => onDeleteAudio(track.id)}
                  >
                    <MaterialCommunityIcons
                      name={kind === "voice" ? "microphone" : kind === "sfx" ? "volume-high" : "music-note"}
                      size={13}
                      color="#fff"
                    />
                    <Text style={styles.audioLabel} numberOfLines={1}>
                      {track.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.playhead} pointerEvents="none" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Fixed height (never flex): the toolbar below must always stay on screen.
  timelineArea: {
    height: TIMELINE_HEIGHT,
    backgroundColor: "#0a0a0a",
    paddingTop: 8,
  },
  row: { marginBottom: ROW_GAP },
  overlayBlock: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 6,
    backgroundColor: "#3a3a3a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 4,
    overflow: "hidden",
  },
  overlayThumb: { ...StyleSheet.absoluteFill, opacity: 0.6 },
  textBlock: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 6,
    backgroundColor: "#FFD54F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 4,
    overflow: "hidden",
  },
  textLabel: { color: "#000", fontSize: 11, fontWeight: "600", flexShrink: 1 },
  audioBlock: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 4,
    overflow: "hidden",
  },
  audioLabel: { color: "#fff", fontSize: 11, fontWeight: "600", flexShrink: 1 },
  blockSelected: { borderWidth: 2, borderColor: EDITOR_ACCENT },
  transition: {
    position: "absolute",
    right: -5,
    top: 14,
    width: 10,
    height: VIDEO_ROW - 28,
    borderRadius: 5,
    backgroundColor: "#fff",
    zIndex: 2,
  },
  addButton: {
    position: "absolute",
    top: 8,
    width: 44,
    height: VIDEO_ROW - 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  playhead: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 2,
    marginLeft: -1,
    // Drawn after the scroll view, so it needs no zIndex (a zIndex here drew it over tool panels).
    backgroundColor: "#fff",
  },
});

export default TimelineContainer;
