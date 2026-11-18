# Video Editor Timeline UI Rebuild Plan

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Architecture Overview

**Single Source of Truth:** Create a new editor state reducer in Redux that manages:
- `clips: Clip[]` (video clips with start, duration, trimmed boundaries)
- `overlays: Overlay[]` (stickers/images appearing above video)
- `audioTracks: AudioTrack[]` (music, voice, sound effects below video)
- `texts: TextItem[]` (captions, text overlays)
- `currentTime: number` (playhead position in seconds)
- `isPlaying: boolean`
- `selectedItemId: string | null` (current selection)
- `undoStack: EditorState[]` (for undo)
- `redoStack: EditorState[]` (for redo)

**UI Layout:**
1. Top bar: close, title, search, HD toggle, Next button
2. Video preview (9:16 aspect ratio, centered, 50% screen width)
3. Playback controls: play/pause, speed, time display, undo/redo
4. **Timeline area** (the main rebuild target):
   - Overlay track (only when overlays exist)
   - Video track (only when clips exist)
   - Audio track (only when audio exists)
   - Text track (only when text exists)
   - Centered white playhead spanning all visible tracks
   - Horizontal scrolling synced to playhead
5. Bottom toolbar: horizontally scrollable tools (Audio, Text, Voice, Links, Captions, Doodles, Adjust, Filters, Overlay, SoundFX, Cutout, Stickers)

## Design Decisions

1. **Track Visibility Logic:** Tracks render only when first item is added; disappear when last item deleted. Use LayoutAnimation for smooth transitions.
2. **Reanimated for Scrolling:** Use `useAnimatedScrollHandler` on timeline ScrollView to sync playhead with scroll position without setState per frame → 60fps smooth scrolling.
3. **Thumbnails:** Use `expo-video-thumbnails` to generate frame strips (one frame per ~1 second) per clip. Cache in clip object to avoid regeneration.
4. **Redux vs Zustand:** Use Redux Toolkit (already configured in project) rather than introducing zustand for state management.
5. **Zoom Constant:** `PX_PER_SECOND = 40px/sec` (single zoom level; can be made configurable later).
6. **Track Heights:** Video 64px, Overlay 48px, Audio 40px, Text 40px (all with `flexShrink: 0` to prevent clipping).
7. **Transition Handles:** Small white rounded pill rendered between consecutive clips; no drag capability required (decorative).
8. **Edit Badge:** Yellow pencil badge on selected clip corner (click to open clip editor panel if needed).

## Implementation Phases

### Phase 1: State Management
- [ ] 1. Create editor state reducer (editorSlice.ts) with initial empty state.
      Files: src/store/slices/editorSlice.ts
      Verify: `npm run lint` — no errors; confirm Redux store exports editorReducer.

- [ ] 2. Update Redux store configuration to include editor reducer.
      Files: src/store/index.tsx
      Verify: Store compiles and dispatch/useAppSelector work with new state.

### Phase 2: New Timeline Components (Building Blocks)

- [ ] 3. Create TimelineContainer component (parent, manages scrolling and playhead).
      Features: horizontal scrolling with Reanimated shared values, left+right padding (screenWidth/2), fixed playhead position, time display sync.
      Files: src/components/VideoEditor/TimelineContainer.tsx
      Verify: Component renders without errors; console log shows scroll offset matching playhead time calculation.

- [ ] 4. Create ClipItem component (individual video clip with thumbnails).
      Features: rounded rect container, frame thumbnail strip (multiple frames per clip), resizeMode="cover" to fill height, selected border highlight, yellow edit badge on selected state, handles click/selection.
      Files: src/components/VideoEditor/ClipItem.tsx
      Verify: Render a sample clip; thumbnails load and display; selection highlight appears on press.

- [ ] 5. Create VideoTrack component (video clips + transition handles + add button).
      Features: renders clips horizontally, white rounded transition pills between clips, white "+" button after last clip (tappable to add video), shows empty state message if no clips.
      Files: src/components/VideoEditor/VideoTrack.tsx
      Verify: Display 2-3 clips with transitions visible; "+" button appears at end; empty state renders when no clips.

- [ ] 6. Create OverlayTrack component (renders overlays like video track, with checkerboard background).
      Features: checkerboard pattern background (transparent look), overlay clips with thumbnails, thumbnail height matches track height, start-time alignment with video track.
      Files: src/components/VideoEditor/OverlayTrack.tsx
      Verify: Render overlay sample; checkerboard visible behind; overlay clip positioned correctly relative to video track.

- [ ] 7. Create AudioTrackUI component (refactored audio track display).
      **Note:** Refactor existing AudioTrack.tsx in-place instead of creating new file.
      Features: purple bar for each audio clip (matching reference), truncated title + artist, volume indicator (visual slider feedback, not interactive in timeline), delete action only when selected, no drag/reposition (drag would be Phase 2+ enhancement).
      Files: src/components/VideoEditor/AudioTrack.tsx (in-place refactor)
      Verify: Audio clip renders as purple bar with title/artist visible; selection highlights the clip; no dragging works (yet).

- [ ] 8. Create TextTrack component (text overlays as small bars).
      Features: each text overlay as a small rect bar, color-coded or with text preview, positioned by start time.
      Files: src/components/VideoEditor/TextTrack.tsx
      Verify: Text items render as bars; positioned along timeline.

- [ ] 9. Create Playhead component (fixed white vertical line, Reanimated).
      Features: `position: absolute` at 50% of container width, spans full height of timeline, white color, thin (~2px), stays centered while timeline scrolls beneath it.
      Files: src/components/VideoEditor/Playhead.tsx
      Verify: Playhead renders at center; does not move as content scrolls (content moves, playhead stays fixed).

- [ ] 10. Create ControlsRow component (play/pause, time display, undo/redo).
       Features: left side play button + multi-select icon, center time display (bold current / muted duration stacked), right side undo/redo buttons (disabled when stack empty).
       Files: src/components/VideoEditor/ControlsRow.tsx
       Verify: Buttons render and are tappable; disabled buttons appear dimmed; time display updates.

- [ ] 11. Create BottomToolbar component (horizontally scrollable tool buttons).
       Features: ScrollView horizontal, 12 tools (Audio, Text, Voice, Links, Captions, Doodles, Adjust, Filters, Overlay, SoundFX, Cutout, Stickers), last item partially visible to hint scrolling.
       Files: src/components/VideoEditor/BottomToolbar.tsx
       Verify: All tools visible; scroll works; last tool slightly cut off.

### Phase 3: Integration and Refactoring

- [ ] 12. Refactor EditableTimeline component to use new VideoTrack and integrate with Redux state.
       Remove old code; import new VideoTrack, pass Redux state, dispatch actions on change.
       Files: src/components/VideoEditor/EditableTimeline.tsx
       Verify: Old EditableTimeline removed; new VideoTrack integrated; clips load from Redux.

- [ ] 13. Update edit.tsx (main editor screen) to use new components.
       Remove inline timeline markup, import TimelineContainer, ControlsRow, BottomToolbar, Playhead. Connect Redux state. Remove placeholder content initialization. Add empty-state logic (show only "+" when no clips).
       Files: app/(main)/upload/edit.tsx
       Verify: Screen renders cleanly; no placeholder data on first load; "+" button visible in empty state; Play/Undo/Redo disabled initially.

- [ ] 14. Implement track visibility logic (tracks appear/disappear with LayoutAnimation).
       Use Redux selectors to determine which tracks exist. Wrap track renders with conditional `tracks.length > 0 && <Track />`. Add LayoutAnimation.configureNext() on state changes.
       Files: src/components/VideoEditor/TimelineContainer.tsx (update)
       Verify: Add first video → video track appears animated; add audio → audio track appears; delete last audio → audio track disappears animated.

- [ ] 15. Implement horizontal scrolling sync with Reanimated.
       Use `useAnimatedScrollHandler` on TimelineContainer's ScrollView. Map scrollX to currentTime. Update playback engine to scroll timeline while playing.
       Files: src/components/VideoEditor/TimelineContainer.tsx (update)
       Verify: Scroll content → playhead time updates; time display updates; play video → timeline auto-scrolls to keep playhead centered.

### Phase 4: Thumbnail and Playback

- [ ] 16. Implement clip thumbnail generation and caching.
       Use expo-video-thumbnails to generate frame strip (one frame per ~1 second). Cache URI in clip object. Render multiple Image components in ClipItem to fill clip width.
       Files: src/components/VideoEditor/ClipItem.tsx (update)
       Verify: Fresh clip → thumbnails generate and display; scroll fast → thumbnails already cached, display instantly; placeholder color shows while loading.

- [ ] 17. Implement playhead synchronization with player.
       Monitor player's currentTime via VideoView or useVideoPlayer hook. Update Redux currentTime. This drives Playhead and ScrollView position.
       Files: app/(main)/upload/edit.tsx (update)
       Verify: Play video → playhead moves in sync; seek on playhead → player seeks; pause → playhead stops.

### Phase 5: Cleanup and Validation

- [ ] 18. Fix TypeScript errors and remove `any` types.
       Run `npm run lint` and resolve all errors. Ensure all types are defined, no use of `any`.
       Files: all modified files
       Verify: `npm run lint` returns 0 errors for edited files.

- [ ] 19. Test on multiple screen sizes (360x640, 800x600, iPad).
       Manually test on emulator or device. Verify no clipping, scrolling smooth, layout responsive.
       Files: all timeline components
       Verify: Devices 360x640 and 1280x800 render correctly; no visual overflow.

- [ ] 20. Remove all hardcoded placeholder content and fallback strings.
       Audit edit.tsx and all components for "New caption", "Track title", "Artist name", "APRIL", demo data. Remove or comment out.
       Files: app/(main)/upload/edit.tsx, src/components/VideoEditor/* (all)
       Verify: Grep for placeholder strings returns 0 matches; fresh open shows only empty state.

- [ ] 21. Build and test the app.
       Run `npm run android` or iOS build. Verify no crash on open; editor screen loads; timeline renders empty state correctly.
       Files: all
       Verify: Build succeeds; app runs; editor screen functional.

---

## Acceptance Criteria Verification

- [ ] Fresh open shows no overlays, captions, audio, video — only "+" button in video area. Play/Undo/Redo disabled.
- [ ] Adding first video shows clean thumbnail strip, "+" at end, centered playhead. Tracks appear smooth (LayoutAnimation).
- [ ] Adding second clip shows white transition handle between clips.
- [ ] Adding audio adds audio track below video; removing last audio removes track.
- [ ] Adding overlay/sticker adds overlay track above video with checkerboard background.
- [ ] No clipping on 360x640 or large screens. Scrolling stays smooth (Reanimated 60fps).
- [ ] All TypeScript errors fixed. Lint clean.
- [ ] Build succeeds. App runs without crashes.
- [ ] Time display syncs with playhead and scroll position.
- [ ] Play/pause button works; timeline auto-scrolls during playback.

---

## Key Implementation Notes

### Dimensions & Spacing (all in `dp` / React Native units)
- Screen width padding: `screenWidth / 2` on both sides of timeline content
- Video track height: `64px` (or `TRACK_HEIGHT_VIDEO`)
- Overlay track height: `48px`
- Audio track height: `40px`
- Text track height: `40px`
- Playhead line width: `2px`
- Clip border radius: `8px`
- Transition handle radius: `20px` (pill shape)

### Reanimated Pattern
```typescript
const scrollOffset = useSharedValue(0);
const animatedHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    scrollOffset.value = event.contentOffset.x;
  },
});
// Use scrollOffset.value to map X position to time: time = x / PX_PER_SECOND
```

### Redux Dispatch Patterns
```typescript
const dispatch = useAppDispatch();
// Add clip: dispatch(editorActions.addClip(clipData))
// Remove clip: dispatch(editorActions.removeClip(clipId))
// Update time: dispatch(editorActions.setCurrentTime(seconds))
```

### Redux Selectors
```typescript
const clips = useAppSelector((state) => state.editor.clips);
const audioTracks = useAppSelector((state) => state.editor.audioTracks);
const currentTime = useAppSelector((state) => state.editor.currentTime);
```

### Thumbnail Caching Strategy
Store base64 or file URI in clip object:
```typescript
interface Clip {
  id: string;
  uri: string;
  duration: number;
  thumbnails?: {  // NEW: cached thumbnails
    timeSeconds: number[];  // e.g., [0, 1, 2, 3, ...]
    uris: string[];  // parallel array of thumbnail URIs
  };
}
```

### LayoutAnimation on Track Appear/Disappear
```typescript
LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
// Then setState that adds/removes track
```

---

## Files Modified or Created

### New Files (11)
1. `src/store/slices/editorSlice.ts` — Redux editor state reducer
2. `src/components/VideoEditor/TimelineContainer.tsx` — Timeline scrolling + playhead parent
3. `src/components/VideoEditor/ClipItem.tsx` — Individual video clip UI
4. `src/components/VideoEditor/VideoTrack.tsx` — Video clips + transitions + add button
5. `src/components/VideoEditor/OverlayTrack.tsx` — Overlay track with checkerboard
6. `src/components/VideoEditor/TextTrack.tsx` — Text overlays track
7. `src/components/VideoEditor/Playhead.tsx` — Fixed center playhead line
8. `src/components/VideoEditor/ControlsRow.tsx` — Play/time/undo/redo controls
9. `src/components/VideoEditor/BottomToolbar.tsx` — Tool selection toolbar
10. `src/services/editorStateManager.ts` (optional) — Helper for undo/redo logic
11. `src/types/editor.types.ts` — TypeScript interfaces for editor state

### Files Modified (4)
1. `src/store/index.tsx` — Add editorReducer to store config
2. `app/(main)/upload/edit.tsx` — Major refactor: use new components, remove placeholder, Redux integration
3. `src/components/VideoEditor/EditableTimeline.tsx` — Refactor to use VideoTrack
4. `src/components/VideoEditor/AudioTrack.tsx` — In-place refactor for new UI

### Files to Remove or Archive (0)
None; all old components preserved (commented or archived if needed for reference).

---

## Build & Test Commands

```bash
# Lint check (run before final commit)
npm run lint --workspace=apps/gully-fame-mobile

# Type check
cd apps/gully-fame-mobile && npx tsc --noEmit

# Run on Android/iOS emulator
npm run android
npm run ios

# Manual inspection points:
# 1. Open editor screen — verify no crash, empty state shows "+"
# 2. Tap "+" in video area — add a clip, verify track appears and thumbnails load
# 3. Add another clip — verify transition handle appears
# 4. Tap audio tool → add audio — verify audio track appears below video
# 5. Delete last audio → verify audio track disappears
# 6. Tap play — verify timeline scrolls and playhead stays centered
# 7. Resize window (if on web simulator) — verify no clipping
```

---

## Rationale for Key Decisions

**Reanimated vs setState:** Reanimated's `useAnimatedScrollHandler` runs on the UI thread, avoiding main thread JS execution for every scroll frame. This ensures 60fps smooth scrolling even on lower-end devices.

**Redux vs Zustand:** Redux is already configured for the project. Zustand is unused. Redux Toolkit slices are easier to integrate with existing patterns (useAppDispatch, useAppSelector from the store).

**Zoom = 40px/sec:** Instagram Edits reference shows ~40px per second at typical screen scale. Not too zoomed (hard to fit long clips), not too zoomed out (hard to see detail). Can be made configurable with a zoom slider in future.

**Track Heights:** Video 64px = ~4 rows of text or large thumbnails. Overlay 48px = smaller, since overlays are often stickers. Audio 40px = thin bar with minimal text. Text 40px = same as audio.

**Thumbnail Strategy:** One frame every ~1 second is a good balance. Fewer frames = missing detail; more = slower generation and more memory. Caching in the clip object avoids regeneration on re-render.

**LayoutAnimation:** React Native LayoutAnimation is simple and performant for appearing/disappearing tracks. Reanimated could also be used but adds complexity for a simple transition.

**Fixed Playhead:** Playhead at 50% screen width (center) is standard in professional editors (DaVinci Resolve, Premiere, CapCut). Keeps the playhead always in view.

---

## Rollback Plan (if needed mid-implementation)

1. Revert to backup of edit.tsx and VideoEditor folder before starting.
2. Keep old components in a `_old/` folder; if new approach fails, restore from there.
3. Git commits at each phase allow reverting to a stable state between phases.

---

*Plan created by planning agent. Implement strictly in order; do not skip or reorder items.*
