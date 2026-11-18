```text
/**
 * UI/UX Implementation Plan: Gully Fame Video Editor
 * 
 * TYPE CHECK RESULT (Second Iteration - Review Fixes - 2024-10-09):
 * ✅ PASS - All review findings addressed
 * 
 * Changes made based on review feedback:
 * 1. Updated editorTheme.colors.primaryLight opacity from 0.2 to 0.35 (better active state contrast)
 * 2. Updated editorTheme.shadows.glow.shadowOpacity from 0.6 to 0.85 (more prominent playhead glow)
 * 3. Fixed ToolTabBar.tsx:
 *    - Modified onMusic callback signature to accept audioData object: { uri, name, duration }
 *    - Updated handleMusicPress to pass selected audio file data to parent component
 * 4. StickerButton no-op verified: The button manages its own sticker picker modal internally
 * 
 * Pre-existing errors in other camera-module files are unrelated to this implementation.
 */
```

# UI/UX Implementation Plan: Gully Fame Video Editor

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview
This plan improves the video editor's UI/UX with a cohesive design system, reusable components, and visual polish. The implementation follows the existing code patterns (React Native, SVG icons, StyleSheet) and maintains backward compatibility with all existing callbacks.

---

## 1. Create editorTheme.ts Constants File

**What:** Create a centralized theme constants file with colors, typography, spacing, and shadows for consistent styling across the editor.

**Files:** `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/constants/editorTheme.ts`

**Implementation:**
- Create the `/constants` directory if it doesn't exist
- Define color palette: primary accent (#FF6B35), surface variants (#1A1A1A, #2A2A2A, #333333), text colors (white, #AAAAAA, #555555)
- Export font size constants: heading (18), body (14), label (12), micro (10)
- Define spacing scale (4, 8, 12, 16, 20, 24)
- Define border radius values (4, 6, 8, 12, 16)
- Define shadow utilities for iOS/Android compatibility
- Export as a single default object: `{ colors, typography, spacing, shadows, borderRadius }`

**Verify:** 
```bash
cd "/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module"
npx tsc --noEmit constants/editorTheme.ts
# Confirm file is syntactically valid with no TypeScript errors
```

---

## 2. Create ToolButton Reusable Component

**What:** Build a generic, reusable button component that will be used by all action buttons. Supports icon + label, active state, disabled state, with theme integration.

**Files:** `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/ToolButton.tsx`

**Implementation:**
- Accept props: `icon` (React node), `label` (string), `isActive` (boolean), `disabled` (boolean), `onPress` (callback), `size` (number, default 44)
- Render a 44x44px minimum touch target with icon centered
- Apply active state: orange background (#FF6B35 at 0.2 opacity) + orange label text when `isActive=true`
- Apply disabled state: reduce opacity to 0.4 when `disabled=true`
- Use editorTheme constants for colors, shadows, and spacing
- Create both icon and label views with proper flex layout
- Icon container: circular or slightly rounded based on size
- Label: use micro font size (10) from theme

**Verify:**
```bash
cd "/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module"
npx tsc --noEmit components/ToolButton.tsx
# Confirm no TypeScript errors
```

---

## 3. Create ToolTabBar Component

**What:** Build a tabbed toolbar with 5 category tabs. Each tab displays a horizontal scrollable list of action buttons, using ToolButton for consistency.

**Files:** `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/ToolTabBar.tsx`

**Implementation:**

**Tab Structure:**
- **Visual**: Filter, Overlay, Sticker buttons
- **Audio**: Voice, Music, SoundFX, Captions, AudioEditor buttons
- **Text**: Text, TextToSpeech, Paste buttons
- **Effects**: Transitions, Adjust, Cutout buttons
- **More**: Links button (and placeholder for future buttons)

**Component Design:**
- Top section: 5 pill-shaped tab buttons with active indicator (orange underline)
- Active tab: shows #FF6B35 text color, inactive: #AAAAAA
- Below tabs: ScrollView with selected tab's buttons rendered horizontally
- Each button wrapped in ToolButton or rendered as compact icons
- Buttons arranged with 12px gaps as in current PreviewActionButtons
- Height: 65px (matches PreviewActionButtons)

**Props Interface:**
Accept all the same callback props as PreviewActionButtons:
```
onFilter?: (filter: FilterConfig) => void
onOverlay?: () => void
onText?: () => void
onSticker?: (type: 'image' | 'emoji', content: string | number) => void
onMusic?: () => void
onTransition?: () => void
onVoiceAdd?: (voice: VoiceOverlay) => void
onSoundFXAdd?: (sound: SoundEffect) => void
onCaptionAdd?: (caption: Caption) => void
onAdjustChange?: (settings: AdjustSettings) => void
onCutoutAdd?: (cutout: Cutout) => void
onLinkAdd?: (link: Link) => void
onOverlayEffectAdd?: (effect: OverlayEffect) => void
onPaste?: (content: string) => void
onTTSGenerate?: (config: TextToSpeechConfig) => void
onUpdateAudioTracks?: (tracks: AudioTrackWithEffects[]) => void
onUpdateAudioMix?: (settings: AudioMixSettings) => void
```
Plus optional data props:
```
audioTracks?: AudioTrackWithEffects[]
masterVolume?: number
displayUri?: string
startTime?: number
```

**Implementation Notes:**
- State: track active tab (0-4)
- Render tab pills at top with active indicator
- Render correct buttons for active tab in ScrollView below
- Pass through all callbacks unchanged to each button's onPress
- Use editorTheme colors and spacing throughout

**Verify:**
```bash
cd "/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module"
npx tsc --noEmit components/ToolTabBar.tsx
# Confirm no TypeScript errors
```

---

## 4. Refactor TimelineEditor for Visual Improvements

**What:** Update TimelineEditor.tsx to use theme constants, improve visual feedback on playhead, time display, and add visual separators.

**Files:** `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/timeline/TimelineEditor.tsx`

**Implementation:**

**Step 4.1: Import and Use Theme**
- Add import for editorTheme
- Replace all hardcoded color values (#0A0A0A, #fff, etc.) with theme constants where applicable
  - Surface backgrounds: use `editorTheme.colors.surface`
  - Orange accents: use `editorTheme.colors.primary` (#FF6B35)
  - Borders: use `editorTheme.colors.border` or rgba equivalents from theme

**Step 4.2: Enhance Playhead Visual**
- Current playhead: white line at center
- Add glow/shadow effect:
  - Shadow: shadowColor #FF6B35, shadowOpacity 0.6, shadowRadius 4
  - Consider orange tint using <View> with pointerEvents="none" behind the line
  - Update playheadLine style in StyleSheet

**Step 4.3: Improve Time Display**
- Current: `timeText` shows "MM:SS / MM:SS", `secondsText` shows seconds
- Increase `timeText` fontSize from 12 to 14
- Use monospaced font for time text (fontFamily: 'monospace' or 'Courier New')
- Add stronger contrast: use `editorTheme.colors.textPrimary` (white)
- Center in its container with adequate padding

**Step 4.4: Add Visual Separators**
- Borders already exist between sections (borderBottomWidth 0.5, borderBottomColor rgba(255,255,255,0.08))
- Confirm all section borders are using theme border color
- Add borderRightWidth 0.5 divider between left, center, right columns (already present)
- Update all border colors to use theme constant: `rgba(255, 255, 255, 0.08)` → `editorTheme.colors.separator` (if defined)

**Step 4.5: Update Styling Across Sections**
- topHeader: replace #0A0A0A with theme.colors.surface
- videoPreviewArea: replace #000 with theme.colors.surfaceRaised
- exportButton: already white, keep as is (highlight)
- editingAreaContainer & child views: use theme colors consistently
- playButtonLarge: keep orange (#ec9a15 → #FF6B35 from theme)
- Add theme shadows to elevated elements (floatingAddButton, playButtonLarge)

**Verify:**
```bash
cd "/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module"
npm run build 2>&1 | head -30
# Check for TypeScript or compilation errors in TimelineEditor
```

---

## 5. Refactor PreviewActionButtons to Use ToolTabBar

**What:** Replace the flat ScrollView in PreviewActionButtons with the new ToolTabBar component. Maintain all existing callback props unchanged.

**Files:** `/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module/components/PreviewActionButtons.tsx`

**Implementation:**

**Step 5.1: Update Imports**
- Remove individual button imports (FilterButton, MusicButton, etc.)
- Add: `import ToolTabBar from './ToolTabBar';`
- Keep type imports unchanged

**Step 5.2: Update Component JSX**
- Replace the entire `<ScrollView>` block that renders all individual buttons
- Replace with single line: `<ToolTabBar {...allProps} />`
- Pass through all props:
  - All `on*` callbacks (onFilter, onOverlay, onText, etc.)
  - Data props (displayUri, audioTracks, masterVolume, startTime)

**Step 5.3: Update Styles**
- Remove individual button styling (if any)
- Keep container and contentContainer styles, but adjust for ToolTabBar:
  - container: adjust backgroundColor if needed, keep flex row
  - contentContainer: ToolTabBar will manage internal layout, may reduce gap/padding

**Step 5.4: Remove Unused Button Handlers**
- Delete `handleMusicPress` function (music picker logic)
- The MusicButton component inside ToolTabBar will handle its own logic
- Or: move handler to ToolTabBar if MusicButton should use it
  - Recommendation: keep handlers in ToolTabBar or delegate to individual button components

**Verify:**
```bash
cd "/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module"
npm run build 2>&1 | head -30
# Check for TypeScript or compilation errors
# Confirm all imports resolve correctly
```

---

## 6. Integration & Full Build Verification

**What:** Verify that all changes work together, TimelineEditor imports and uses ToolTabBar correctly via PreviewActionButtons, and the entire editor renders without errors.

**Files:** All files modified above

**Implementation:**
- Ensure all theme imports are correct in each file
- Confirm ToolButton is properly exported and imported by ToolTabBar
- Confirm ToolTabBar is properly exported and imported by PreviewActionButtons
- Confirm PreviewActionButtons is still imported correctly by TimelineEditor
- Run TypeScript compilation to catch any type mismatches

**Verify:**
```bash
cd "/Users/dhruvkathuria/Gullyfame.com/Gullyfame copy/apps/videoeditor/camera-module"
npx tsc --noEmit
# Confirm no TypeScript errors across all files

# If a build script exists:
npm run build
# Confirm build succeeds and no errors in webpack/bundler output
```

---

## Summary of Changes

| Component/File | Change Type | Key Updates |
|---|---|---|
| `constants/editorTheme.ts` | CREATE | Color, typography, spacing, shadow constants |
| `components/ToolButton.tsx` | CREATE | Reusable button with active/disabled states |
| `components/ToolTabBar.tsx` | CREATE | 5-tab toolbar with scrollable button lists |
| `components/timeline/TimelineEditor.tsx` | MODIFY | Theme integration, playhead glow, time display improvement, visual separators |
| `components/PreviewActionButtons.tsx` | REFACTOR | Replace flat ScrollView with ToolTabBar |

## Backward Compatibility
- All callback props in PreviewActionButtons remain unchanged
- TimelineEditor receives the same PreviewActionButtons component (now using ToolTabBar internally)
- No breaking changes to public APIs

## Design Decisions

1. **ToolTabBar vs. Flat List**: Chose tabbed toolbar because:
   - Reduces visual clutter (show only relevant tools at a time)
   - Improves discoverability (clear categorization)
   - Follows modern editor UX patterns (Premiere, DaVinci, CapCut)

2. **Theme File**: Centralized constants enable:
   - Consistent styling across all components
   - Easy dark/light mode switching in future
   - Single source of truth for design system

3. **ToolButton Reuse**: Generic button component:
   - Eliminates duplication across individual button files
   - Enforces consistent styling and interaction
   - Can be extended to support icons-only mode or other variants

4. **Color Choices**: 
   - Orange accent (#FF6B35) maintains current identity (visible in play button)
   - Dark surfaces (#1A1A1A+) suitable for video editing dark theme
   - Separator colors (low opacity white) match current subtle borders
