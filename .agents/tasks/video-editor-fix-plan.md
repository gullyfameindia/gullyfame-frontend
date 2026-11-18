# Video Editor Integration & Visual Rendering Fix Plan

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview
The video editor has state management for all tools (stickers, filters, overlays, adjustments, doodles, cutout) but lacks visual rendering on the video preview. Additionally, some features have UI/UX issues (popups instead of in-place editing) and missing audio playback support. This plan will create a unified rendering layer and fix each tool's implementation.

---

## Root Cause Analysis

### Issue 1: No Visual Rendering Layer
- **Problem**: State is updated in handlers (setStickers, setFilter, etc.) but nothing renders these on the video preview
- **Current State**: `edit.tsx` only renders VideoView + CaptionOverlay. No render layer for stickers, doodles, overlays, filters, or adjustments
- **Solution**: Create VideoPreviewWithOverlays wrapper component that renders all visual layers in correct z-order

### Issue 2: Filters & Adjustments Not Applied
- **Problem**: `filter` and `adjustments` state are set but never used to transform the VideoView
- **Solution**: Apply CSS filter strings or tinted overlays to the VideoView style

### Issue 3: Doodles Show Alert Instead of Drawing Canvas
- **Problem**: DoodlesToolPanel sets `isDrawingMode` but shows Alert instead of enabling actual drawing
- **Solution**: Create CanvasOverlay component with PanResponder for real-time drawing directly on video preview

### Issue 4: Audio Dependencies Missing
- **Problem**: VoiceToolPanel and SoundFXToolPanel use `expo-av` which is not installed (only `expo-audio` is available)
- **Solution**: Replace `expo-av` with `expo-audio` (v57.0.5 is installed in package.json)

### Issue 5: Stickers, Overlays Not Rendered Despite Being in State
- **Problem**: StickerItem and OverlayItem objects are added to state but not rendered on video
- **Solution**: Add StickerOverlay and OverlayRenderer components to render positioned, draggable items

### Issue 6: Cutout Effect Not Applied
- **Problem**: CutoutSettings are set but no visual effect is applied
- **Solution**: Render masked overlay or tinted background when cutout is enabled

---

## Implementation Plan

### 1. Create VideoPreviewWithOverlays Component
Create a new component that wraps the video and renders all visual layers in the correct z-order. This component will be positioned absolutely over the VideoView and use the video dimensions to position elements.

**Files to create:**
- `apps/gully-fame-mobile/src/components/VideoEditor/VideoPreviewWithOverlays.tsx`

**What it does:**
- Wraps VideoView and CaptionOverlay
- Renders in order: VideoView → CaptionOverlay → Filters/Adjustments → Doodles → Stickers → Overlays → Cutout mask
- Each layer is conditionally rendered based on state
- Passes state data to specialized sub-components (StickerLayer, DoodleLayer, etc.)
- Handles video dimensions via useWindowDimensions or inline measurement

**Verify:** Video preview renders without breaking existing captions

---

### 2. Fix Audio Dependencies (VoiceToolPanel & SoundFXToolPanel)
Replace `expo-av` imports with `expo-audio` in both panels. Both panels attempt to use `Audio.Recording` and `Audio.Sound` which are available in expo-audio v57.0.5.

**Files to modify:**
- `apps/gully-fame-mobile/src/components/VideoEditor/VoiceToolPanel.tsx`
- `apps/gully-fame-mobile/src/components/VideoEditor/SoundFXToolPanel.tsx`

**What to fix:**
- Line ~68 in VoiceToolPanel: Change `require('expo-audio')` error handling to properly import module
- Line ~212 in SoundFXToolPanel: Same fix
- Both already do conditional checks for Audio.Sound existence, just need to ensure module loads

**Decision**: Use dynamic require with try-catch fallback since these features work offline. If expo-audio module is not available, show informative message instead of crashing.

**Verify:** Audio recording starts and stops without crash; preview playback (if enabled) works or gracefully shows "not available"

---

### 3. Create Filters & Adjustments Rendering Layer
Apply filter and adjustment values as CSS filter strings or semi-transparent overlay to the VideoView.

**Files to create:**
- `apps/gully-fame-mobile/src/components/VideoEditor/FilterAdjustmentOverlay.tsx`

**What it does:**
- Receives filter and adjustments state
- Converts numeric values to CSS filter string (e.g., `brightness(120%) contrast(110%)`)
- For React Native, uses View style with opacity-based color overlays since CSS filters aren't directly supported
- Applies brightness via opacity + background color, contrast via color matrix, saturation via color effects
- Renders as a semi-transparent View over the video that updates in real-time as sliders move

**Implementation approach:**
- For brightness: Use backgroundColor with opacity (e.g., rgba(0,0,0,0.3) for darker)
- For saturation: Use react-native-color-matrix-image-filters if available, else use simplified overlay approach
- For other adjustments: Use opacity and color overlays as approximations
- These are visual hints; final export uses the full adjusted values

**Verify:** Filter panel shows visual feedback; adjustments panel shows brightness/contrast changes on preview

---

### 4. Create Real-Time Drawing Canvas (DoodlesToolPanel)
Replace Alert-based "drawing mode" with an actual canvas overlay that captures touch gestures and draws in real-time.

**Files to create:**
- `apps/gully-fame-mobile/src/components/VideoEditor/DoodleCanvasOverlay.tsx`

**What it does:**
- Renders a transparent SVG or canvas on top of the video preview
- Uses PanResponder to track touch movements
- Draws stroked paths as user drags finger (using Svg from react-native-svg)
- Color and brush size come from DoodlesToolPanel state
- When user releases, creates a DoodlePath object and adds to doodles array
- All drawn paths remain visible and can be undone

**Implementation approach:**
- Use `react-native-svg` (already installed: v15.15.4)
- Create SVG with dynamic path elements
- Use PanResponder onPanResponderMove to track x,y coordinates
- Convert touch coords to video-relative coordinates
- Draw stroked paths in real-time
- On gesture end, save path to state

**Verify:** DoodlesToolPanel "Start Drawing" button enables drawing; finger strokes appear on video in selected color; brush size changes affect line width

---

### 5. Create Sticker Rendering & Interaction Layer
Render stickers as positioned Image components with drag-to-reposition capability.

**Files to create:**
- `apps/gully-fame-mobile/src/components/VideoEditor/StickerLayer.tsx`

**What it does:**
- Renders each StickerItem as an Image component positioned using x,y (normalized 0-1 values)
- Images are draggable via PanResponder
- Pinch-to-scale gesture (if possible with react-native-gesture-handler)
- Stickers show frame around them when selected
- Double-tap to delete or use delete button
- Position updates are saved back to state in real-time

**Implementation approach:**
- Map stickers array to Image components
- Position each using absolute positioning with left/top calculated from normalized x,y
- Use PanResponder for drag (tracking offsetX, offsetY)
- On drag end, convert screen coords back to normalized 0-1 and save
- Store which sticker is selected in local state

**Verify:** Adding a sticker shows it on video preview; dragging moves it; position persists when closing panel and reopening

---

### 6. Create Overlay Rendering Layer
Similar to stickers, render OverlayItems as positioned Image or Video components.

**Files to create:**
- `apps/gully-fame-mobile/src/components/VideoEditor/OverlayLayer.tsx`

**What it does:**
- Renders each OverlayItem (type: 'image' | 'video')
- Position, scale, opacity, and blend mode from OverlayItem state
- Blend mode applied via react-native View style mixBlendMode (if supported) or simulated with opacity
- Rotatable via gesture
- Shows timing info (start/end times in video)

**Implementation approach:**
- For images: Use Image component with source={uri: overlay.uri}
- For videos: VideoView component (from expo-video) — may require separate logic
- Apply opacity via style.opacity = overlay.opacity
- Apply blend mode via style.mixBlendMode (supported in web, limited on native)
- Position and scale similarly to stickers

**Verify:** Adding an image overlay shows it on preview; opacity slider works; position and scale adjustable

---

### 7. Create Cutout Mask Overlay
Render a semi-transparent mask or background color when cutout is enabled.

**Files to create:**
- `apps/gully-fame-mobile/src/components/VideoEditor/CutoutOverlay.tsx`

**What it does:**
- When cutoutSettings.enabled is true, render a semi-transparent overlay with the background color/image
- Simulates the background removal effect (full implementation would require native AI model)
- Overlay is full-screen behind all other layers
- If backgroundImage is set, use Image component; otherwise use backgroundColor

**Implementation approach:**
- Conditional render: only show if enabled
- Use full-screen View with backgroundColor or backgroundImage
- Opacity at 0.3-0.5 to keep video somewhat visible
- Layer order: VideoView → CutoutOverlay → [other effects] → Doodles/Stickers

**Verify:** Enabling cutout in panel shows background color/image tint on video; changing color updates preview

---

### 8. Update edit.tsx to Use VideoPreviewWithOverlays
Modify the video preview section in edit.tsx to use the new wrapper component instead of rendering VideoView directly.

**Files to modify:**
- `apps/gully-fame-mobile/app/(main)/upload/edit.tsx`

**What to change:**
- Replace the `<View style={styles.videoWrapper}>` block (around line 650) with VideoPreviewWithOverlays component
- Pass all visual state: filter, adjustments, doodles, stickers, overlays, cutoutSettings, captions, currentTime, videoDuration, videoWidth, videoHeight
- Component receives VideoView player and CaptionOverlay as children or handles internally
- Update z-index/layering order if needed

**Verify:** Video preview renders all active overlays; switching between tools shows/hides respective layers

---

### 9. Export Service Integration
Ensure export includes all visual layers when generating final video.

**Files to check:**
- `apps/gully-fame-mobile/src/services/videoExportService.ts`

**What to verify:**
- Export function receives all state: stickers, overlays, doodles, filters, adjustments, cutout
- These are passed to the backend video composition service or ffmpeg-kit-react-native
- No changes needed if backend already handles; if client-side, ensure ffmpeg compositions apply filters and overlays

**Verify:** Exporting video includes all effects; exported video has stickers, filters, adjusted values

---

## Testing Checklist

- [ ] **Filters**: Select a filter → preview shows visual hint → export includes filter values
- [ ] **Adjustments**: Move brightness slider → video preview darkens/brightens in real-time
- [ ] **Stickers**: Add sticker → appears on video → drag to reposition → position saved
- [ ] **Overlays**: Add image overlay → appears on video → opacity/blend mode controls work
- [ ] **Doodles**: Tap "Start Drawing" → draw on video → path appears in real-time → "Done" saves path
- [ ] **Cutout**: Enable cutout → background color appears as tint → disable removes tint
- [ ] **Voice**: Tap mic → record audio → playback works or shows "not available" gracefully
- [ ] **Sound FX**: Select sound effect → preview works (if enabled) → add to timeline succeeds
- [ ] **Export**: Create video with all effects → verify exported video contains all layers and effects
- [ ] **Bottom nav**: All tools open their panels without crashing; no "Audio feature temporarily disabled" message

---

## Technical Decisions

### 1. Filter/Adjustment Application
**Decision**: Use semi-transparent overlay approach (View with backgroundColor + opacity) for native React Native. This provides visual feedback without requiring CSS filters or native module compilation.
**Rationale**: expo-av is not installed, and native rebuilds are not available. This approach works immediately and provides sufficient preview feedback. Final export applies full values on backend.

### 2. Drawing Canvas Library
**Decision**: Use react-native-svg for SVG-based drawing (already installed).
**Rationale**: SVG is already a dependency (v15.15.4), reducing bundle size and avoiding additional packages.

### 3. Audio Module
**Decision**: Use expo-audio (installed) instead of expo-av. Dynamic require with try-catch fallback.
**Rationale**: expo-audio is already a dependency (v57.0.5), matches the project's Expo SDK version, and provides Sound and Recording APIs needed.

### 4. Overlay Rendering Order
**Decision**: VideoView → Filters/Adjustments → Cutout → Doodles → Stickers → Overlays → Captions
**Rationale**: Cutout effect should be behind all content; doodles and stickers should be editable; captions stay on top for visibility.

### 5. Position & Scale State
**Decision**: Store as normalized values (0-1 for position, scale factor) to be resolution-independent.
**Rationale**: Allows same state to work on different screen sizes; easier to export and re-render at different resolutions.

---

## Files Summary

### New Files (8)
1. `VideoPreviewWithOverlays.tsx` - Master rendering component
2. `FilterAdjustmentOverlay.tsx` - Filter & adjustment visual layer
3. `DoodleCanvasOverlay.tsx` - Real-time drawing canvas
4. `StickerLayer.tsx` - Sticker rendering & interaction
5. `OverlayLayer.tsx` - Overlay image/video rendering
6. `CutoutOverlay.tsx` - Cutout background effect

### Modified Files (3)
1. `edit.tsx` - Replace video preview rendering with VideoPreviewWithOverlays
2. `VoiceToolPanel.tsx` - Fix expo-audio import, remove expo-av dependency
3. `SoundFXToolPanel.tsx` - Fix expo-audio import, remove expo-av dependency

### No Changes Needed (Services Already Correct)
- `stickerEmojiService.ts` - API integration is complete
- `filterLibraryService.ts` - API integration is complete
- `soundFXService.ts` - API integration is complete
- All *ToolPanel.tsx files - State management is correct; only rendering is needed

---

## Implementation Order

1. **Fix audio dependencies** (2 files, low effort) - unblock VoiceToolPanel and SoundFXToolPanel
2. **Create FilterAdjustmentOverlay** - simple overlay approach
3. **Create DoodleCanvasOverlay** - moderate complexity with PanResponder
4. **Create StickerLayer** - draggable positioned elements
5. **Create OverlayLayer** - similar to StickerLayer
6. **Create CutoutOverlay** - simple background overlay
7. **Create VideoPreviewWithOverlays** - wrapper that composes all layers
8. **Update edit.tsx** - integrate wrapper component
9. **Verify export integration** - test with videoExportService

---

## Expected Outcomes

After implementing this plan:
- ✅ Stickers appear on video preview and are draggable
- ✅ Filters show visual feedback on preview
- ✅ Adjustments (brightness, contrast, etc.) apply to preview in real-time
- ✅ Doodles show drawing canvas instead of popup; users draw in real-time
- ✅ Overlays render with position, scale, opacity, blend mode controls
- ✅ Cutout shows background effect when enabled
- ✅ Voice recording works without "expo-av" error
- ✅ Sound effects load and can be added (preview optional)
- ✅ All visual elements are preserved in exported video
- ✅ Bottom nav bar works for all tools without crashes

---

## Notes

- Export service backend integration is assumed to be working; if issues arise during export testing, coordinate with backend team
- Blend modes (multiply, screen, overlay) may not render exactly as expected on React Native; approximation with opacity is acceptable for preview
- Touch gesture handling may need fine-tuning based on device and screen size
- All components follow existing code style and use project's color scheme (#EC9A15 brand color, #1a1a1a background)
