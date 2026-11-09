import { useState, useEffect, useCallback } from "react";
import { validatePickedAsset } from "@/utils/fileValidation";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, ActivityIndicator, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addClip,
  removeClip,
  addOverlay,
  removeOverlay,
  addAudioTrack,
  setMusic,
  removeAudioTrack,
  removeText,
  addSticker,
  removeSticker,
  removeDoodle,
  setDoodles,
  setCaptions,
  setAdjust,
  setFilter,
  setCurrentTime,
  setIsPlaying,
  setSelectedItemId,
  undo,
  redo,
} from "@/store/slices/editorSlice";
import TimelineContainer from "@/components/VideoEditor/TimelineContainer";
import BottomToolbar, {
  ToolId,
} from "@/components/VideoEditor/BottomToolbar";
import MusicLibraryModal from "@/components/MusicLibraryModal";
import VoiceToolPanel from "@/components/VideoEditor/VoiceToolPanel";
import CaptionsToolPanel, {
  Caption,
} from "@/components/VideoEditor/CaptionsToolPanel";
import AdjustToolPanel from "@/components/VideoEditor/AdjustToolPanel";
import DoodlesToolPanel from "@/components/VideoEditor/DoodlesToolPanel";
import SoundFXToolPanel from "@/components/VideoEditor/SoundFXToolPanel";
import StickersToolPanel, {
  StickerItem as PanelSticker,
} from "@/components/VideoEditor/StickersToolPanel";
import OverlayToolPanel, {
  OverlayItem,
} from "@/components/VideoEditor/OverlayToolPanel";
import CutoutToolPanel, {
  CutoutSettings,
} from "@/components/VideoEditor/CutoutToolPanel";
import VideoPreviewWithOverlays from "@/components/VideoEditor/VideoPreviewWithOverlays";
import { useClipSequence } from "@/components/VideoEditor/useClipSequence";
import { PREVIEW_RADIUS } from "@/components/VideoEditor/editorTheme";
import TrashZone from "@modules/video-editor/camera-module/components/preview/TrashZone";
import TextEditorOverlay from "@modules/video-editor/camera-module/components/preview/TextEditorOverlay";
import FilterSheet from "@modules/video-editor/camera-module/components/preview/FilterSheet";
import { useTextEditing } from "@modules/video-editor/camera-module/components/preview/useTextEditing";
import type { LayerKind } from "@/components/VideoEditor/TimelineContainer";
import * as ImagePicker from "expo-image-picker";
import { importGalleryAsset } from "@modules/video-editor/camera-module/utils/clipImport";


export default function EditScreen() {
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  // Redux state
  const clips = useAppSelector((state: any) => state.editor.clips);
  const overlays = useAppSelector((state: any) => state.editor.overlays);
  const audioTracks = useAppSelector((state: any) => state.editor.audioTracks);
  const texts = useAppSelector((state: any) => state.editor.texts);
  const stickers = useAppSelector((state: any) => state.editor.stickers);
  const doodles = useAppSelector((state: any) => state.editor.doodles);
  const captions = useAppSelector((state: any) => state.editor.captions);
  const adjust = useAppSelector((state: any) => state.editor.adjust);
  const filter = useAppSelector((state: any) => state.editor.filter);
  const frameAspect = useAppSelector((state: any) => state.editor.frameAspect) ?? 9 / 16;
  const selectedItemId = useAppSelector((state: any) => state.editor.selectedItemId);
  const undoStack = useAppSelector((state: any) => state.editor.undoStack);
  const redoStack = useAppSelector((state: any) => state.editor.redoStack);

  // Local state
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [hdEnabled, setHdEnabled] = useState(true);

  // Cutout is not built yet (no segmentation model); its settings stay local.
  const [cutoutSettings, setCutoutSettings] = useState<CutoutSettings>({
    enabled: false,
    feathering: 50,
    threshold: 50,
    backgroundColor: "transparent",
  });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [doodleBrushColor, setDoodleBrushColor] = useState("#EC9A15");
  const [doodleBrushSize, setDoodleBrushSize] = useState(5);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const trashTop = windowHeight - insets.bottom - 130;
  const [drag, setDrag] = useState({ dragging: false, overTrash: false });

  // All clips play back to back on one player; photo clips are drawn over it.
  const sequence = useClipSequence(clips);
  const currentTime = sequence.time;
  const isPlaying = sequence.isPlaying;
  const currentVideoUri = clips.find((c: any) => c.type !== "photo")?.uri ?? "";
  const { editor: textEditor, openNew: openNewText, openEdit: editText, finish: finishText, cancel: cancelText } = useTextEditing(currentTime);

  // Keep the shared store in step (tool panels read currentTime/isPlaying from it).
  useEffect(() => {
    dispatch(setCurrentTime(currentTime));
  }, [currentTime, dispatch]);
  useEffect(() => {
    dispatch(setIsPlaying(isPlaying));
  }, [isPlaying, dispatch]);

  // Stop playback when another screen covers the editor.
  const isFocused = useIsFocused();
  const { pause: pauseSequence } = sequence;
  useEffect(() => {
    if (!isFocused) pauseSequence();
  }, [isFocused, pauseSequence]);

  // Initialize editor state from params
  // Opened from the preview, the session's clips are already in the store.
  // Legacy entry points still pass clips as a param.
  const [hasSessionClips] = useState(() => clips.length > 0);
  useEffect(() => {
    if (params.clips && !hasSessionClips) {
      try {
        const parsedClips = JSON.parse(params.clips as string);
        parsedClips.forEach((clip: any) => {
          dispatch(
            addClip({
              id: clip.id || `clip-${Date.now()}`,
              uri: clip.uri,
              duration: clip.duration || 0,
              type: clip.type || "video",
              source: clip.source || "gallery",
            })
          );
        });
      } catch { /* intentionally ignored */
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [params.clips, dispatch, hasSessionClips]);

  // The editorSlice is not reset on close: the preview owns the session and keeps the edits.

  // Format time display (mm:ss)

  const togglePlayPause = sequence.toggle;

  // Handle tool selection
  const handleToolSelect = useCallback(
    (tool: ToolId) => {
      // Text uses the same full-screen editor as the preview screen.
      if (tool === "text") {
        setSelectedTool(null);
        openNewText();
        return;
      }
      setSelectedTool(tool === selectedTool ? null : tool);
    },
    [selectedTool, openNewText]
  );

  // Add a video or photo from the gallery (true duration in seconds, rotation normalised).
  const [importingClip, setImportingClip] = useState(false);
  const handleAddClip = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos", "images"],
        allowsEditing: false,
        quality: 1,
      });
      const asset = result.canceled ? undefined : result.assets?.[0];
      if (!asset) return;

      const invalid = validatePickedAsset(asset, ["image", "video"]);
      if (invalid) {
        Alert.alert("Couldn't add this clip", invalid);
        return;
      }

      setImportingClip(true);
      const media = await importGalleryAsset(asset);
      dispatch(
        addClip({
          id: `clip-${Date.now()}`,
          uri: media.uri,
          duration: media.duration,
          type: media.type,
          source: "gallery",
        })
      );
    } catch (error: any) {
      Alert.alert("Couldn't add this clip", error?.message ?? "Please try another one.");
    } finally {
      setImportingClip(false);
    }
  }, [dispatch]);

  // Handle adding audio
  const handleAddAudio = useCallback(
    (audioTrack: any) => {
      dispatch(
        setMusic({
          id: `audio-${Date.now()}`,
          trackId: audioTrack._id,
          title: audioTrack.title,
          artist: audioTrack.artist,
          url: audioTrack.url ?? audioTrack.audioUrl,
          startTime: currentTime,
          duration: audioTrack.duration,
          volume: 0.8,
          trimStart: 0,
          trimEnd: 0,
          originalDuration: audioTrack.duration,
        })
      );
    },
    [currentTime, dispatch]
  );

  // Handle adding voice recording
  const handleAddVoice = useCallback(
    (voiceRecording: { uri: string; duration: number; title: string }) => {
      dispatch(
        addAudioTrack({
          id: `voice-${Date.now()}`,
          title: voiceRecording.title,
          artist: "Voice Recording",
          url: voiceRecording.uri,
          startTime: currentTime,
          duration: voiceRecording.duration,
          volume: 1.0,
          trimStart: 0,
          trimEnd: 0,
          originalDuration: voiceRecording.duration,
        })
      );
    },
    [currentTime, dispatch]
  );

  const handleCaptionsGenerated = useCallback(
    (generated: Caption[]) => dispatch(setCaptions(generated.map((c) => ({ ...c, type: "caption" as const })))),
    [dispatch]
  );

  // Doodle drawing is rebuilt in a later step; for now only "clear all" reaches the store.
  const handleDoodlesChange = useCallback(
    (paths: unknown[]) => {
      if (paths.length === 0) dispatch(setDoodles([]));
    },
    [dispatch]
  );

  // Handle adding sound FX
  const handleAddSoundFX = useCallback(
    (soundFX: { id: string; name: string; url: string; duration: number }) => {
      dispatch(
        addAudioTrack({
          id: `soundfx-${Date.now()}`,
          trackId: soundFX.id,
          title: soundFX.name,
          artist: "Sound FX",
          url: soundFX.url,
          startTime: currentTime,
          duration: soundFX.duration,
          volume: 1.0,
          trimStart: 0,
          trimEnd: 0,
          originalDuration: soundFX.duration,
        })
      );
    },
    [currentTime, dispatch]
  );

  // Handle adding sticker
  const handleAddSticker = useCallback(
    (sticker: Omit<PanelSticker, "id">) => {
      dispatch(
        addSticker({
          id: `sticker-${Date.now()}`,
          type: "sticker",
          name: sticker.name,
          imageUrl: sticker.imageUrl,
          category: sticker.category,
          x: 0.5,
          y: 0.45,
          scale: 1,
          rotation: 0,
          size: 0.3,
          startTime: currentTime,
          endTime: null,
        })
      );
    },
    [currentTime, dispatch]
  );

  /** Layers shown as blocks on the timeline's overlay row. */
  const totalLength = clips.reduce(
    (sum: number, clip: any) => sum + ((clip.trimEnd ?? clip.duration) - (clip.trimStart ?? 0)),
    0
  );
  const layers = [
    ...texts.map((t: any) => ({ id: t.id, kind: "text" as LayerKind, label: t.text, startTime: t.startTime, endTime: t.endTime ?? totalLength })),
    ...stickers.map((t: any) => ({ id: t.id, kind: "sticker" as LayerKind, label: t.name, startTime: t.startTime, endTime: t.endTime ?? totalLength })),
    ...doodles.map((t: any) => ({ id: t.id, kind: "doodle" as LayerKind, label: "Doodle", startTime: t.startTime, endTime: t.endTime ?? totalLength })),
    ...captions.map((t: any) => ({ id: t.id, kind: "caption" as LayerKind, label: t.text, startTime: t.startTime, endTime: t.endTime })),
  ];
  const deleteLayer = useCallback(
    (id: string, kind: LayerKind) => {
      if (kind === "text") dispatch(removeText(id));
      else if (kind === "sticker") dispatch(removeSticker(id));
      else if (kind === "doodle") dispatch(removeDoodle(id));
      else dispatch(setCaptions(captions.filter((c: any) => c.id !== id)));
    },
    [dispatch, captions]
  );

  // Handle adding overlay
  const handleAddOverlay = useCallback(
    (overlay: Omit<OverlayItem, "id">) => {
      dispatch(
        addOverlay({
          id: `overlay-${Date.now()}`,
          type: overlay.type as "sticker" | "image" | "shape",
          uri: overlay.uri,
          startTime: overlay.startTime,
          // The panel sends start/end times; the store keeps a duration.
          duration: Math.max(0, overlay.endTime - overlay.startTime),
          x: overlay.x || 0,
          y: overlay.y || 0,
          width: overlay.width || 100,
          height: overlay.height || 100,
          rotation: overlay.rotation || 0,
          opacity: overlay.opacity || 1,
          scaleX: 1,
          scaleY: 1,
        })
      );
    },
    [dispatch]
  );

  // Handle cutout settings
  const handleApplyCutout = useCallback((settings: CutoutSettings) => {
    setCutoutSettings(settings);
  }, []);

  // Handle undo
  const performUndo = useCallback(() => {
    dispatch(undo());
  }, [dispatch]);

  // Handle redo
  const performRedo = useCallback(() => {
    dispatch(redo());
  }, [dispatch]);

  // Done: the edits already live in the shared editorSlice, so just return to the preview.
  // Export happens on the preview's Next, never here.
  const handleDone = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Welcome to Edits</Text>
          <Ionicons name="chevron-down" size={16} color="#fff" style={styles.titleIcon} />
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hdButton}
            onPress={() => setHdEnabled(!hdEnabled)}
          >
            <Text
              style={[styles.hdButtonText, hdEnabled && styles.hdButtonTextActive]}
            >
              HD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleDone}
            disabled={clips.length === 0}
          >
            <Text style={styles.nextButtonText}>Done</Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Video Preview */}
      <View style={styles.videoContainer}>
        <View style={[styles.videoWrapper, { aspectRatio: frameAspect }]}>
          {sequence.clip ? (
            <VideoPreviewWithOverlays
              player={sequence.player}
              photoUri={sequence.clip.type === "photo" ? sequence.clip.uri : undefined}
              currentTime={currentTime}
              overlays={overlays}
              cutoutSettings={cutoutSettings}
              trashTop={trashTop}
              hiddenTextId={textEditor?.id}
              onEditText={editText}
              onDragChange={(dragging, overTrash) => setDrag({ dragging, overTrash })}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <MaterialIcons name="videocam" size={48} color="#666" />
              <Text style={styles.videoPlaceholderText}>No video</Text>
            </View>
          )}
        </View>
      </View>

      {/* Fixed-height timeline, then the toolbar pinned to the bottom (photos too). */}
      <>
          <TimelineContainer
            clips={clips}
            overlays={overlays}
            audioTracks={audioTracks}
            layers={layers}
            currentTime={currentTime}
            isPlaying={isPlaying}
            selectedItemId={selectedItemId}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onAddClip={handleAddClip}
            onSelectClip={(clipId: string) => dispatch(setSelectedItemId(clipId))}
            onDeleteClip={(clipId: string) => dispatch(removeClip(clipId))}
            onSelectOverlay={(overlayId: string) => dispatch(setSelectedItemId(overlayId))}
            onDeleteOverlay={(overlayId: string) => dispatch(removeOverlay(overlayId))}
            onSelectAudio={(trackId: string) => dispatch(setSelectedItemId(trackId))}
            onDeleteAudio={(trackId: string) => dispatch(removeAudioTrack(trackId))}
            onSelectLayer={(id: string) => dispatch(setSelectedItemId(id))}
            onDeleteLayer={deleteLayer}
            onPlayPress={togglePlayPause}
            onUndoPress={performUndo}
            onRedoPress={performRedo}
            onTimeChange={sequence.seek}
            onScrubStart={sequence.pause}
          />

          <BottomToolbar selectedTool={selectedTool} onSelectTool={handleToolSelect} />
      </>

      {/* Tool-specific panels */}
      {selectedTool === "audio" && (
        <MusicLibraryModal
          visible
          onCancel={() => setSelectedTool(null)}
          onSelect={(track) => {
            handleAddAudio(track);
            setSelectedTool(null);
          }}
        />
      )}

      {selectedTool === "voice" && (
        <VoiceToolPanel
          onClose={() => setSelectedTool(null)}
          onAddVoice={handleAddVoice}
          currentTime={currentTime}
        />
      )}

      {selectedTool === "captions" && (
        <CaptionsToolPanel
          onClose={() => setSelectedTool(null)}
          onCaptionsGenerated={handleCaptionsGenerated}
          videoUri={currentVideoUri}
          videoDuration={totalLength}
          initialCaptions={captions}
        />
      )}

      {selectedTool === "adjust" && (
        <AdjustToolPanel
          onClose={() => setSelectedTool(null)}
          onAdjustmentsChange={(next) => dispatch(setAdjust(next))}
          initialAdjustments={adjust}
        />
      )}

      {selectedTool === "filters" && clips[0] && (
        <FilterSheet
          mediaType={clips[0].type === "photo" ? "photo" : "video"}
          sourceUri={clips[0].uri}
          filter={filter}
          bottomInset={insets.bottom}
          onChange={(next) => dispatch(setFilter(next))}
          onDone={() => setSelectedTool(null)}
        />
      )}

      {selectedTool === "doodles" && (
        <DoodlesToolPanel
          onClose={() => {
            setSelectedTool(null);
            setIsDrawingMode(false);
          }}
          onDoodlesChange={handleDoodlesChange}
          currentTime={currentTime}
          videoDuration={clips.reduce(
            (sum: number, clip: any) => sum + ((clip.trimEnd || clip.duration) - (clip.trimStart || 0)),
            0
          )}
          initialDoodles={[]}
          isDrawingMode={isDrawingMode}
          onDrawingModeChange={setIsDrawingMode}
          brushColor={doodleBrushColor}
          onBrushColorChange={setDoodleBrushColor}
          brushSize={doodleBrushSize}
          onBrushSizeChange={setDoodleBrushSize}
        />
      )}

      {selectedTool === "soundfx" && (
        <SoundFXToolPanel
          onClose={() => setSelectedTool(null)}
          onAddSoundFX={handleAddSoundFX}
          currentTime={currentTime}
        />
      )}

      {selectedTool === "stickers" && (
        <StickersToolPanel
          onClose={() => setSelectedTool(null)}
          onAddSticker={handleAddSticker}
          currentTime={currentTime}
          videoDuration={clips.reduce(
            (sum: number, clip: any) => sum + ((clip.trimEnd || clip.duration) - (clip.trimStart || 0)),
            0
          )}
        />
      )}

      {selectedTool === "overlay" && (
        <OverlayToolPanel
          onClose={() => setSelectedTool(null)}
          onAddOverlay={handleAddOverlay}
          currentTime={currentTime}
          videoDuration={clips.reduce(
            (sum: number, clip: any) => sum + ((clip.trimEnd || clip.duration) - (clip.trimStart || 0)),
            0
          )}
          existingOverlays={overlays}
        />
      )}

      {selectedTool === "cutout" && (
        <CutoutToolPanel
          onClose={() => setSelectedTool(null)}
          onApplyCutout={handleApplyCutout}
          currentSettings={cutoutSettings}
        />
      )}

      {drag.dragging && <TrashZone bottomInset={insets.bottom} active={drag.overTrash} />}

      {textEditor && (
        <TextEditorOverlay
          initial={textEditor.draft}
          topInset={insets.top}
          onDone={finishText}
          onCancel={cancelText}
        />
      )}

      {importingClip && (
        <View style={styles.exportModal}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.exportModalMessage}>Preparing clip...</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#000",
  },
  closeButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
  },
  titleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  titleIcon: {
    marginLeft: 4,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchButton: {
    padding: 4,
  },
  hdButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#666",
  },
  hdButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  hdButtonTextActive: {
    color: "#fff",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    minWidth: 80,
    justifyContent: "center",
  },
  nextButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },

  // Video Preview
  // Takes the space left between the top bar and the timeline; the 9:16 preview fits inside.
  videoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  videoWrapper: {
    height: "100%",
    aspectRatio: 9 / 16,
    borderRadius: PREVIEW_RADIUS,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholderText: {
    color: "#666",
    fontSize: 14,
    marginTop: 8,
  },

  // Export Progress
  exportModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  exportModalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  exportModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  exportModalMessage: {
    color: "#888",
    fontSize: 14,
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#EC9A15",
  },
  progressText: {
    color: "#EC9A15",
    fontSize: 14,
    fontWeight: "600",
  },
});
