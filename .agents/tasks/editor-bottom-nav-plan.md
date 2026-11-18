# Implementation Plan: Fix Bottom Toolbar and Integrate Backend Video Upload

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

**Objective:** Fix the bottom toolbar visibility issues in the video editor, resolve prop type mismatches, fix the export progress bug, and integrate backend video upload functionality.

---

## Task A: Fix Bottom Toolbar Height and Layout

**Issue:** The `bottomToolbar` in TimelineEditor uses a fixed `height: 65` which does not expand to accommodate all action buttons. The `isReady` guard prevents the toolbar from rendering while thumbnails load.

**Decision:** 
- Remove the fixed height constraint and use flexible sizing with minimum height.
- Conditionally render a placeholder when thumbnails are not ready, rather than hiding the entire toolbar.
- This ensures the toolbar is always visible and renders correctly as items load.

- [ ] 1. Update TimelineEditor.tsx to fix the bottomToolbar style and conditional rendering.
      Change `bottomToolbar` style from fixed `height: 65` to `minHeight: 65` with flexible sizing.
      Remove the `isReady` guard around PreviewActionButtons and render a loading state instead.
      Files: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/timeline/TimelineEditor.tsx`
      Verify: No build errors after TypeScript compilation. Toolbar is visible before and after thumbnails load.

---

## Task B: Fix onSticker Prop Type Mismatch

**Issue:** 
- StickerButton in PreviewActionButtons calls `onStickerSelect?.('image', sticker)` with two arguments.
- PreviewActionButtons passes `onSticker` prop which has type `(sticker?: string | number) => void` (single argument).
- TimelineEditor passes `(type, content) => onSelectOverlay?.(type, content)` which expects two arguments.
- The mismatch causes the `type` argument to be discarded.

**Decision:** 
- Fix PreviewActionButtons.tsx to define the correct prop type matching the actual usage: `(type: 'image' | 'emoji', content: string | number) => void`.
- Thread the correct type through all button components that call `onSticker` (StickerButton).
- This aligns the contract between consumer (TimelineEditor), provider (PreviewActionButtons), and caller (StickerButton).

- [ ] 2. Fix the onSticker prop type in PreviewActionButtons.tsx and thread it to StickerButton.
      Update PreviewActionButtons interface: change `onSticker?: (sticker?: string | number) => void` to `onSticker?: (type: 'image' | 'emoji', content: string | number) => void`.
      Update StickerButton.tsx: change `onStickerSelect?: (type: 'image' | 'emoji', content: string | number) => void` prop name to match the prop passed from PreviewActionButtons (keep the signature correct).
      In PreviewActionButtons, update the StickerButton call: `<StickerButton onStickerSelect={onSticker} />` (no changes needed, already correct pattern).
      Files: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/PreviewActionButtons.tsx`
      Verify: TypeScript compilation with no type errors. Stickers render and emit correct (type, content) tuples.

---

## Task C: Fix ExportScreen Progress Bar Interpolation

**Issue:** The progress bar uses `inputRange: [0, 100]` but progress values are 0.0–1.0 floats. The animation never visually reaches the end.

**Decision:** 
- Change the interpolation range to match the actual progress value range: `inputRange: [0, 1]`.
- This ensures the progress bar fills completely when progress reaches 1.0.

- [ ] 3. Fix the progress bar interpolation range in ExportScreen.tsx.
      Change `inputRange: [0, 100]` to `inputRange: [0, 1]` in the progressWidth interpolation.
      Files: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/ExportScreen.tsx`
      Verify: Export a test video, observe the progress bar fills from 0% to 100% smoothly.

---

## Task D: Create Video Upload API Service

**Issue:** ExportScreen saves to local gallery only; there is no backend integration for uploading videos to the server.

**Decision:**
- Create a new service file `/apps/videoeditor/camera-module/services/videoApiService.ts`.
- Export a typed `uploadVideo` function that accepts a local file URI, metadata, and optional progress callback.
- Use XMLHttpRequest (not fetch) for upload progress tracking, as React Native fetch does not support upload progress.
- Use `EXPO_PUBLIC_API_BASE_URL` from environment (fallback to production URL if not set).
- POST to `/videos/upload` endpoint with multipart/form-data.
- Include proper error handling and typed response shapes.

**Reasoning:**
- XMLHttpRequest is the only reliable way to track upload progress in React Native/Expo.
- Environment-based URL allows different endpoints per build without code changes.
- Typed responses enable proper error recovery and status tracking.
- Separating the service from ExportScreen keeps the component focused on UI.

- [ ] 4. Create videoApiService.ts with uploadVideo function and types.
      Create file: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/services/videoApiService.ts`
      
      The service must export:
      - Type `VideoMetadata = { title: string; description?: string; tags?: string[] }` 
      - Type `UploadResult = { success: boolean; videoId?: string; url?: string; error?: string }`
      - Function `uploadVideo(localUri: string, metadata: VideoMetadata, onProgress?: (pct: number) => void): Promise<UploadResult>`
      
      Implementation details:
      - Use XMLHttpRequest to POST to `${apiBaseUrl}/videos/upload` (multipart/form-data).
      - Read file from localUri using `expo-file-system` and add to FormData as `video` field.
      - Add metadata (title, description, tags) as separate FormData fields.
      - Track upload progress: `(e.loaded / e.total) * 100` and call `onProgress(percent)` if provided.
      - On success (200-299 status), parse JSON response and return `UploadResult`.
      - On failure, return `UploadResult` with error details.
      - Handle network errors gracefully (return error result, do not throw).
      
      Files: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/services/videoApiService.ts`
      Verify: Service compiles without TypeScript errors. Function signature matches the intended usage pattern.

---

## Task E: Integrate API Service into ExportScreen

**Issue:** ExportScreen lacks backend upload integration. Video is saved locally but not synced to the server.

**Decision:**
- After successful local gallery save, call `uploadVideo` from the new service.
- Show upload progress in the UI after the local export step.
- Handle upload errors without blocking the local save (gallery save success is already achieved).
- Provide user feedback: alert on upload completion/failure, allow retry on failure.
- Keep the flow non-blocking: if upload fails, the video is still safely in the gallery.

**Reasoning:**
- Local save first ensures the user never loses the video.
- Separate upload phase allows for retry and better error visibility.
- Non-blocking upload failure prevents user frustration (they have their video locally).

- [ ] 5. Integrate uploadVideo into ExportScreen and add upload phase UI.
      Modify: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/ExportScreen.tsx`
      
      Changes:
      - Import `uploadVideo` and types from videoApiService.
      - Add state: `uploadingToBackend: boolean`, `uploadProgress: number`, `uploadError: string | null`.
      - After `setProgress(1)` and gallery save succeeds (before the success alert):
        - Call `uploadVideo(exportedUri, { title: 'Video from Editor', description: '', tags: [] }, (pct) => setUploadProgress(pct))`.
        - Update status to "Uploading to server..." and show upload progress.
        - On success: show alert "Video uploaded successfully!" and close.
        - On error: show alert with retry option; allow user to close without retrying.
      - UI flow: `Preparing → Processing clips → Saving to gallery → Uploading to server → Complete`.
      - If upload fails, the "Success" screen still shows (video is in gallery), with an additional note about the backend upload failing.
      
      Files: `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/ExportScreen.tsx`
      Verify: Export a test video, observe full flow: local save then backend upload. Confirm progress updates correctly. Test error cases (disable network, use invalid URI) to verify error handling.

---

## Task F: Comprehensive Integration Test

**Issue:** Individual fixes must work together without breaking the timeline editor experience.

**Decision:** 
- Verify the entire export flow: load clips → edit → export → local save → backend upload.
- Confirm toolbar visibility before and after thumbnail load.
- Test sticker selection to confirm correct (type, content) tuples reach the backend.

- [ ] 6. Run full integration test of the edited video export flow.
      Steps:
      1. Launch TimelineEditor with test clips.
      2. Verify bottom toolbar is visible before thumbnails load (show loading state).
      3. Verify all action buttons render and are interactive once thumbnails load.
      4. Add a sticker and verify it renders on the canvas.
      5. Trigger export and confirm: local save → backend upload flow.
      6. Verify progress bar animates from 0% to 100% smoothly.
      7. Confirm success alert shows and navigation closes cleanly.
      
      Files: Full video editor workflow (TimelineEditor, PreviewActionButtons, ExportScreen, videoApiService).
      Verify: No runtime errors or crashes. Toolbar visible throughout. Upload completes or fails gracefully. All buttons are responsive.

---

## Summary of Changes

| Task | File | Change | Impact |
|------|------|--------|--------|
| A | TimelineEditor.tsx | Fix toolbar height & conditional rendering | Toolbar always visible |
| B | PreviewActionButtons.tsx | Fix onSticker prop type | Correct sticker type signature |
| C | ExportScreen.tsx | Fix progress interpolation range | Progress bar animates correctly |
| D | videoApiService.ts (new) | Create upload service | Backend upload capability |
| E | ExportScreen.tsx | Integrate upload service | Export now uploads to backend |
| F | Full workflow | Integration test | All features working together |

---

## Notes for Implementation

- The services directory does not exist yet; create it at `/apps/videoeditor/camera-module/services/`.
- Use `expo-file-system` (already in dependencies) to read local file URIs for upload.
- The environment variable `EXPO_PUBLIC_API_BASE_URL` is set to `https://gullyfame.com/v1/api` in production.
- ExportScreen already has `expo-media-library` and `expo-file-system` imported; no new dependencies needed.
- All changes are TypeScript; maintain strict type checking throughout.
- The project uses React Native and Expo; ensure all APIs used are compatible with both platforms.
