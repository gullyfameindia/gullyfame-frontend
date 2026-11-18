# Phase 1 Implementation Review: Recording to Preview Flow

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

**Verdict: APPROVED**

Watch for: Single-clip bypass skips merge but mergedUri state init is clean; retake clears all clips correctly; Next button properly disables below 1s total duration; PreviewScreen fully replaces old behavior; VideoView + useVideoPlayer used correctly; Zustand store shape matches requirements.

---

## High-level view

CameraScreen adds duration calculation and a timeline breakdown row showing each clip's duration and the total. The Next button correctly disables when total duration is under 1 second or no clips exist. A conditional hides the capture button once the timer duration is reached, preventing over-recording. Retake now clears all clips instead of just the last one, matching the intended "restart recording" behavior.

PreviewScreen is a new full-screen video preview that displays either a single clip directly or a merged multi-clip video. It uses expo-video's `useVideoPlayer` and `VideoView` (not the deprecated expo-av `Video`). For multi-clip inputs it calls `exportAndCombineClips` on mount and shows merge progress. It exposes all five controls as overlays: Back (with discard confirmation), Retake (with confirmation), Edit (which triggers the edit callback with the merged URI), Save to Gallery, and Next. Empty state is handled when clips is empty.

EditorScreen orchestrates the flow with a `showTimeline` boolean that toggles between PreviewScreen and TimelineEditor. The edit callback correctly updates clips to use the merged video URI and sets `showTimeline = true` to transition to editing.

Zustand store uses v5 API with `persist` middleware backed by AsyncStorage. All required fields are present (clips, URIs for merged/edited/thumbnail, metadata, upload state). All setter actions follow the expected pattern.

---

<details>
<summary>Issues (0)</summary>

No blocking concerns.

</details>

<details>
<summary>Details</summary>

### CameraScreen: Duration calculation, timeline display, and timer-based controls

The total duration calculation is accurate: `const totalDuration = clips.reduce((sum, c) => sum + (c.duration ?? 0), 0)`. The Next button correctly disables when `totalDuration < 1` with reduced opacity: `[styles.nextActionBtn, !canProceedToNext && { opacity: 0.5 }]` applied to the TouchableOpacity, where `canProceedToNext = clips.length > 0 && totalDuration >= 1`. This prevents navigation with zero or sub-second recordings.

The clip duration timeline is shown as a horizontal ScrollView below the ClipList only when clips exist and not recording. Each clip displays in a badge with its 1-decimal duration: `{idx + 1}: {((clip.duration ?? 0) / 1).toFixed(1)}s`. A final badge shows the total and max: `Total: {totalDuration.toFixed(1)}s / {timerDuration}s max`. This gives users immediate feedback on total recorded time vs. the timer limit.

Capture button auto-hide is implemented as a conditional render: `{!(timerDuration > 0 && totalDuration >= timerDuration) && <TouchableOpacity ... />}`. Once the timer duration is reached, the button does not render; only Retake and Next buttons remain visible, forcing the user to either proceed or reset. This prevents accidental over-recording past the timer limit.

Retake behavior confirms the action: `Alert.alert("Discard all clips?", ...)` then calls `setClips([])` to clear the entire array. All clips are discarded in one action, resetting the UI and recording state. This matches the intended "retake = restart" semantics.

All existing controls (flash toggle, gallery picker, camera switch, music modal, filter grid, timer/speed/resolution modals) remain unmodified. The clip list and duration timeline sit below the main controls without interfering with the existing layout or interaction patterns.

### PreviewScreen: New full-screen video preview

PreviewScreen is a complete replacement that shows merged or single-clip video as a full-screen preview. The component receives `clips`, `onBack`, `onClipUpdate`, `onExportComplete`, and `onEditPress` props, enabling clean integration into EditorScreen's orchestration.

Merge logic is correct: on mount, if `clips.length > 1`, `exportAndCombineClips` is called and a merge progress UI (spinner + percentage) is shown until complete. For single clips, `clips[0].uri` is used directly without merge. Once merge completes (or immediately for single clips), the mergedUri is set and the video preview becomes interactive.

The video player uses expo-video's `useVideoPlayer` hook and `VideoView` component, not the deprecated expo-av `Video`. The player is configured with `loop: true` and `muted` state is synced via `useEffect`. The mute button toggles `isMuted` state, updating both the player and the button icon (volume-high vs. volume-mute).

All five controls are present as overlays:
- **Back** (top-left): shows a confirmation alert "Going back will discard your recording" before calling onBack.
- **Retake** (bottom-left): shows a confirmation alert "This will discard your current recording" then calls `onClipUpdate([])` and `onBack()` to clear clips and return to camera.
- **Edit** (bottom-center, pencil icon): calls `onEditPress(mergedUri, clips)` to pass the merged video URI and clip array to EditorScreen.
- **Save to Gallery** (bottom-center, download icon): requests MediaLibrary permission and saves the merged video using `MediaLibrary.saveToLibraryAsync(mergedUri)`.
- **Mute** (top-right): toggles audio on/off.
- **Next** (bottom-right, styled gold): calls `onExportComplete()` to proceed to the timeline editor.

Empty state is handled: if `clips.length === 0`, the component returns a minimal view with "No media found" text.

Error and merge-in-progress states are handled as full-screen overlays, preventing interaction during merge and showing clear error messages with retry/cancel options.

### EditorScreen: State toggle between preview and timeline

EditorScreen introduces a `showTimeline` boolean state that conditionally renders either PreviewScreen or TimelineEditor. On mount, it parses incoming clips from router params with safe fallbacks (validates array structure, checks URIs exist, catches JSON parse errors).

The `handleEditPress` callback receives `mergedUri` and `updatedClips` from PreviewScreen's Edit button. It updates the first clip to use the merged URI: `const clipsWithMergedUri = updatedClips.map((clip, idx) => idx === 0 ? { ...clip, uri: mergedUri } : clip)`, then sets `showTimeline = true` to transition to the timeline editor.

The `handleEditorComplete` callback is passed to both PreviewScreen (onExportComplete) and TimelineEditor (onNext). It navigates to the post/upload screen with the final clips payload and any competition metadata from router params.

Back navigation from either screen calls `handleEditorBack`, which routes back to the previous screen (camera).

### Zustand store: Reel upload state with persistence

The store imports correctly from zustand v5: `create` from `'zustand'` and `persist`, `createJSONStorage` from `'zustand/middleware'`. The store wraps its reducer in `persist()` with AsyncStorage as the backing store: `storage: createJSONStorage(() => AsyncStorage)`.

The state shape includes all required fields: clips (CameraClipArray), mergedVideoUri, editedVideoUri, thumbnailUri, caption, hashtags, music, visibility, uploadProgress, uploadState ('idle'|'uploading'|'success'|'error'), and uploadError. Each has a corresponding setter action (setClips, setMergedUri, setEditedUri, etc.) following the pattern `(value) => set({ fieldName: value })`. A reset action restores all fields to initialState.

The store name is `'reel-upload-store'` and persists to AsyncStorage, allowing state to survive app restarts during upload workflows.

</details>

---

## File map

<details>
<summary>Changed files</summary>

- **CameraScreen.tsx**: Added `totalDuration` calculation, Next button enable/disable based on total duration ≥ 1s, clip timeline/duration display, capture button auto-hide when timer reached, Retake button behavior changed to clear all clips with confirmation.
- **PreviewScreen.tsx**: Complete replacement. New full-screen video preview with expo-video VideoView, merge logic, all five controls (Back, Retake, Edit, Next, Mute, Save to Gallery), progress and error states, empty state handling.
- **reelUploadStore.ts**: New Zustand v5 store with persist middleware and AsyncStorage backing. Holds clips, URIs, metadata, and upload state with setters and reset action.
- **editor.tsx**: Added `showTimeline` state toggle to conditionally render PreviewScreen or TimelineEditor, added clip parsing on mount with error handling, added `handleEditPress` to transition from preview to timeline with merged URI.

Full diff: `git diff main -- apps/gully-fame-mobile/src/modules/video-editor/camera-module/screens/CameraScreen.tsx apps/gully-fame-mobile/src/modules/video-editor/camera-module/screens/PreviewScreen.tsx apps/gully-fame-mobile/src/stores/reelUploadStore.ts apps/gully-fame-mobile/app/(main)/upload/editor.tsx`

</details>
