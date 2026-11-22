import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/safeBack";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { showToast } from "@/store/slices/postingSlice";
import { resetEditor, setFilter, setFrameAspect, startSession, updateClip } from "@/store/slices/editorSlice";
import type { Clip } from "@/types/editor.types";
import PreviewMedia, { type PreviewMediaType } from "../components/preview/PreviewMedia";
import PreviewToolRail, { type PreviewRailTool } from "../components/preview/PreviewToolRail";
import PreviewBottomBar, { type PreviewBarTool } from "../components/preview/PreviewBottomBar";
import EditLayers from "../components/preview/EditLayers";
import TrashZone from "../components/preview/TrashZone";
import TextEditorOverlay from "../components/preview/TextEditorOverlay";
import { useTextEditing } from "../components/preview/useTextEditing";
import FilterSheet from "../components/preview/FilterSheet";
import { DEFAULT_FILTER_INTENSITY } from "../components/preview/filterPresets";
import type { FrameSize } from "../utils/bakeOverlays";
import { bakeEdits } from "../utils/bakeEdits";
import { PHOTO_DEFAULT_DURATION, readVideoDuration } from "../utils/clipImport";


/**
 * Post-capture preview (Moj style). Opened from the camera's Next for both
 * video and photo, distinguished by the `mediaType` route param.
 * Edit state lives in the Redux editorSlice, shared with the full editor.
 */
const PostCapturePreviewScreen: React.FC = () => {
  const params = useLocalSearchParams<{
    clips?: string;
    mediaType?: string;
    competitionId?: string;
    competitionName?: string;
    entryFee?: string;
  }>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();

  const sessionKey = useAppSelector((state) => state.editor.sessionKey);
  const storeClips = useAppSelector((state) => state.editor.clips);
  const texts = useAppSelector((state) => state.editor.texts);
  const adjust = useAppSelector((state) => state.editor.adjust);
  const filter = useAppSelector((state) => state.editor.filter);
  const [processing, setProcessing] = useState<{ label: string; progress?: number } | null>(null);
  /** Which rail/bar sheet is open over the preview. */
  const [sheet, setSheet] = useState<"filters" | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  // Every screen lays items out in the preview's frame shape; the editor reads this.
  useEffect(() => {
    if (frameSize.width > 0 && frameSize.height > 0) dispatch(setFrameAspect(frameSize.width / frameSize.height));
  }, [frameSize, dispatch]);
  const { editor: textEditor, openNew: openNewText, openEdit: editText, finish: finishText, cancel: cancelText } = useTextEditing(0);
  const [drag, setDrag] = useState({ dragging: false, overTrash: false });
  // Releasing an item below this screen Y deletes it.
  const trashTop = windowHeight - insets.bottom - 130;
  const editingUi = !!textEditor || drag.dragging || !!sheet;

  const paramClips = useMemo<Clip[]>(() => {
    try {
      const parsed = JSON.parse(params.clips ?? "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c: any) => typeof c?.uri === "string")
        .map((c: any, i: number) => {
          const type = c.type === "photo" ? "photo" : "video";
          return {
            id: String(c.id ?? `clip-${i}`),
            uri: c.uri,
            // Camera durations are timer estimates; the real length is read from the file below.
            duration: type === "photo" ? PHOTO_DEFAULT_DURATION : Number(c.duration) || 0,
            type,
            source: c.source === "gallery" ? "gallery" : "camera",
          } as Clip;
        });
    } catch {
      return [];
    }
  }, [params.clips]);

  // A single photo is a photo post; photos mixed with videos become 5 s segments of a video.
  const mediaType: PreviewMediaType =
    paramClips.length === 1 && (params.mediaType === "photo" || paramClips[0]?.type === "photo") ? "photo" : "video";

  // A new capture starts a new session; returning from the editor keeps the existing one.
  // Only the focused preview may start one, once per capture, so a stale instance
  // further down the stack can never fight over the shared store.
  const sessionReady = !!params.clips && sessionKey === params.clips;
  const startedKeyRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!isFocused || !params.clips || startedKeyRef.current === params.clips) return;
    startedKeyRef.current = params.clips;
    if (sessionKey !== params.clips) {
      dispatch(startSession({ key: params.clips, mediaType, clips: paramClips }));
      // A filter picked on the camera carries over as the starting filter.
      try {
        const presetId = JSON.parse(params.clips)?.[0]?.filter?.presetId;
        if (presetId) dispatch(setFilter({ id: presetId, intensity: DEFAULT_FILTER_INTENSITY }));
      } catch {
        // Clips were already validated above; no filter to carry over.
      }
    }
  }, [isFocused, params.clips, sessionKey, mediaType, paramClips, dispatch]);

  const clips = sessionReady ? storeClips : paramClips;

  // Replace the camera's timer estimate with each video's true length, once per session.
  const probedKeyRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!sessionReady || probedKeyRef.current === sessionKey) return;
    probedKeyRef.current = sessionKey;
    storeClips
      .filter((clip) => clip.type === "video")
      .forEach(async (clip) => {
        const duration = await readVideoDuration(clip.uri, clip.duration);
        if (Math.abs(duration - clip.duration) > 0.01) dispatch(updateClip({ id: clip.id, updates: { duration } }));
      });
  }, [sessionReady, sessionKey, storeClips, dispatch]);

  const passThroughParams = useMemo(
    () => ({
      ...(params.competitionId && { competitionId: params.competitionId }),
      ...(params.competitionName && { competitionName: params.competitionName }),
      ...(params.entryFee && { entryFee: params.entryFee }),
    }),
    [params.competitionId, params.competitionName, params.entryFee]
  );

  const handleBack = useCallback(() => {
    if (clips.length === 0) {
      safeBack("/(main)/home");
      return;
    }
    Alert.alert("Discard clips?", "Go back to the camera. You can keep your clips to record more.", [
      { text: "Cancel", style: "cancel" },
      { text: "Keep clips", onPress: () => safeBack("/(main)/home") },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          dispatch(resetEditor());
          // Pops back to the existing camera (navigate would push a second one) and tells it to clear its clips.
          router.dismissTo({ pathname: "/(main)/camera", params: { reset: String(Date.now()) } });
        },
      },
    ]);
  }, [clips.length, dispatch]);

  const openEditor = useCallback(() => {
    // The editor reads and writes the same editorSlice session; its Done returns here.
    router.push({ pathname: "/(main)/upload/edit", params: { mediaType, ...passThroughParams } });
  }, [mediaType, passThroughParams]);

  const handleRailTool = useCallback((tool: PreviewRailTool) => {
    if (tool === "filters") setSheet("filters");
  }, []);
  const handleBarTool = useCallback(
    (tool: PreviewBarTool) => {
      if (tool === "editClips" || tool === "editPhoto") openEditor();
      if (tool === "text") openNewText();
    },
    [openEditor, openNewText]
  );

  /** Bakes the edits in one FFmpeg pass and goes straight to the caption screen. Never opens the editor. */
  const handleNext = useCallback(async () => {
    if (processing || clips.length === 0) return;
    try {
      setProcessing({ label: "Processing..." });
      const result = await bakeEdits({
        mediaType,
        clips,
        texts,
        filter,
        frame: frameSize,
        onProgress: (progress) => setProcessing({ label: "Processing...", progress }),
      });
      const duration = mediaType === "photo" ? PHOTO_DEFAULT_DURATION : result.duration;

      router.push({
        pathname: "/(main)/upload/post",
        params: {
          clips: JSON.stringify([{ id: `final-${Date.now()}`, uri: result.uri, duration, type: mediaType }]),
          mediaType,
          editMetadata: JSON.stringify({ mediaType, sourceClipCount: clips.length, baked: result.baked }),
          ...passThroughParams,
        },
      });
    } catch (error: any) {
      dispatch(showToast({ message: `Couldn't process your ${mediaType}. ${error?.message ?? "Please try again."}`, kind: "error" }));
    } finally {
      setProcessing(null);
    }
  }, [processing, clips, mediaType, passThroughParams, texts, filter, frameSize, dispatch]);

  if (clips.length === 0) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Nothing to preview. Record a clip or take a photo first.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => safeBack("/(main)/home")}>
          <Text style={styles.emptyBtnText}>Back to camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.mediaArea}>
        <PreviewMedia
          // Remount the player when the editor changes the clip list.
          key={clips.map((clip) => clip.id).join("|")}
          mediaType={mediaType}
          clips={clips}
          active={isFocused && !processing}
          showMuteToggle={!editingUi}
          topInset={12}
          onFrameLayout={setFrameSize}
          filter={filter}
          adjust={adjust}
          overlay={(time: number | undefined) => (
              <EditLayers
                frameWidth={frameSize.width}
                frameHeight={frameSize.height}
                trashTop={trashTop}
                time={time}
                hiddenTextId={textEditor?.id}
                onEditText={editText}
                onDragChange={(dragging, overTrash) => setDrag({ dragging, overTrash })}
              />
          )}
        />

        {!editingUi && (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={10} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={30} color="#fff" />
            </TouchableOpacity>
            <PreviewToolRail mediaType={mediaType} onPress={handleRailTool} />
          </>
        )}
      </View>

      <View style={editingUi && styles.hidden} pointerEvents={editingUi ? "none" : "auto"}>
        <PreviewBottomBar
          mediaType={mediaType}
          bottomInset={insets.bottom}
          busy={!!processing}
          onPress={handleBarTool}
          onNext={handleNext}
        />
      </View>

      {drag.dragging && <TrashZone bottomInset={insets.bottom} active={drag.overTrash} />}

      {sheet === "filters" && (
        <FilterSheet
          mediaType={mediaType}
          sourceUri={clips[0].uri}
          filter={filter}
          bottomInset={insets.bottom}
          onChange={(next) => dispatch(setFilter(next))}
          onDone={() => setSheet(null)}
        />
      )}

      {textEditor && (
        <TextEditorOverlay
          initial={textEditor.draft}
          topInset={insets.top}
          onDone={finishText}
          onCancel={cancelText}
        />
      )}

      {processing && (
        <View style={styles.processing}>
          <ActivityIndicator color="#FFD000" size="large" />
          <Text style={styles.processingText}>
            {processing.label}
            {processing.progress !== undefined ? ` ${Math.round(processing.progress * 100)}%` : ""}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  mediaArea: { flex: 1 },
  backBtn: { position: "absolute", top: 16, left: 16, width: 44, height: 44, justifyContent: "center" },
  emptyText: { color: "#fff", fontSize: 16, textAlign: "center" },
  emptyBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: "#FFD000" },
  emptyBtnText: { color: "#000", fontWeight: "700" },
  hidden: { opacity: 0 },
  processing: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: { color: "#fff", fontSize: 15, fontWeight: "600", marginTop: 14 },
});

export default PostCapturePreviewScreen;
