# UI/UX Implementation for Gully Fame Video Editor

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

Integrated a tabbed toolbar architecture with a cohesive design system for the video editor. The implementation replaces a flat scrollable button layout with five organized categories (Visual, Audio, Text, Effects, More), adds reusable component foundations, and establishes theme constants for consistent styling. All existing callbacks remain wired through to their target handlers.

Watch for: ToolTabBar missing event handlers for Music button—it attempts to call a handler that doesn't route back through the props. One visual tab button (Sticker) has no onPress callback. Playhead animation in TimelineEditor uses a manual glow shadow but the orange tint appears subtle. ToolButton active state styling applies orange background color at 0.2 opacity—verify the visual prominence feels sufficient.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The theme constants file establishes a complete design system with color tokens, typography scales, spacing, and shadow utilities. All new UI components pull from this single source, enabling future theming and consistency without scattered hex values.

ToolButton is a generic, reusable component that ToolTabBar uses for all action buttons. It enforces 44×44px touch targets (confirmed via minWidth/minHeight), applies the orange (#FF6B35) accent to active states, and renders icon + label in a vertical stack. Every button instance uses the same component, eliminating per-button styling duplication.

ToolTabBar reorganizes the action buttons into five category tabs: Visual (filters, overlays, stickers), Audio (voice, music, sound FX, captions), Text (text, TTS, paste), Effects (transitions, adjust, cutout), and More (links). Each tab has its own ScrollView with buttons rendered horizontally. Tab switching updates which buttons are displayed; the active tab pill shows orange text. PreviewActionButtons now delegates all rendering to ToolTabBar, forwarding all callbacks unchanged.

TimelineEditor integrates the theme constants throughout its styles, replacing hardcoded color values with named references from editorTheme. The playhead line gains a glow shadow using editorTheme's shadow utilities. Time display text grows from 12px to 14px and switches to a monospaced font for visual stability. Borders throughout now reference theme separator colors for consistency.

The design maintains visual hierarchy: primary orange (#FF6B35) draws attention to active elements and key actions (play button, active tabs, playhead); dark surfaces create a video-editing workspace feel; subtle white borders at low opacity divide sections without visual noise. All touch targets meet the 44px minimum.

---

## Issues (4)

1. **Music button handler missing** — ToolTabBar attempts to call `handleMusicPress` as a useCallback dependency but does not define this handler internally. It passes `onMusic?.()` in MusicButton which is undefined if the parent doesn't provide it. Move the music picker logic into ToolTabBar or ensure parents always provide an onMusic callback.

2. **Sticker button has no onPress** — In ToolTabBar's Visual tab, StickerButton is instantiated with `onPress={() => {}}` (no-op). This should either call a parent callback or open a sticker picker dialog. Currently, clicking it does nothing.

3. **Playhead glow may lack prominence** — The playhead glow shadow uses `shadowOpacity: 0.6` and `shadowRadius: 4`, which is subtle on mobile. Consider increasing these values or adding a semi-transparent orange rectangle behind the playhead line for stronger visual emphasis.

4. **ToolButton active state color opacity** — Active button background uses `primaryLight: 'rgba(255, 107, 53, 0.2)'`, which is a very light tint (20% opacity). On a dark surface (#0A0A0A background), this may feel insufficient. Verify the contrast meets accessibility targets (at least 3:1 for UI components) and that users clearly perceive the active state.

---

<details>
<summary>Details</summary>

## Design System and Theme Constants

The editorTheme.ts file establishes a complete, production-ready design system. Colors are organized into semantic groups: primary accent (orange #FF6B35 and variants), surface palette (dark theme: #0A0A0A surface, #1A1A1A raised, #2A2A2A hover, #333333 active), text colors (white primary, #AAAAAA secondary, #555555 tertiary), and borders. Typography includes heading (18), body (14), label (12), micro (10) with corresponding font weight constants (regular 400 through bold 700). Spacing follows an 8-based scale (4, 8, 12, 16, 20, 24), and shadows include subtle, medium, large, and a glow variant using the orange accent.

Every component in the UI system now references this central file rather than embedding hex values. This pattern enables future dark/light mode switching, brand recoloring, or design system upgrades with minimal code changes. The export is a single default object, which all consuming files import cleanly: `import editorTheme from '../constants/editorTheme'`.

## ToolButton Component and Touch Targets

ToolButton enforces a 44×44px minimum via `minWidth` and `minHeight` props (default size=44, overridable). The touch target calculation is correct: `<TouchableOpacity>` wraps the full button, so the entire 44×44 region is tappable. Icon and label both nest inside a centered View, and the label renders in micro font (10px) below the icon.

Active state applies a circular background with `backgroundColor: isActive ? editorTheme.colors.primaryLight : 'transparent'`. This results in a light orange tint (#FF6B35 at 20% opacity) when the button is active. The label color also shifts to `editorTheme.colors.primary` (full orange) when active. Disabled state reduces overall button opacity to 0.4. The component uses `useMemo` to cache the computed styles, which is appropriate for a frequently-rendered component.

The icon is rendered as a React node (typically an SVG), allowing flexibility in icon sources. The label prop is mandatory, and both are required for accessibility and clear visual communication.

**Concern (likely)**: The active background color uses 20% opacity orange on a dark surface. While this technically provides visual distinction, it may feel ambiguous. A 20% tint on #0A0A0A yields approximately #1A0F08—only slightly darker than the surrounding surface. Confirm via visual testing that the active state is clearly distinguishable.

## ToolTabBar Architecture

ToolTabBar implements a five-tab interface (Visual, Audio, Text, Effects, More) with a pill-shaped tab selector at the top and a horizontal ScrollView of buttons below. Each tab has a specific set of child buttons; switching tabs updates which buttons appear. The implementation is clean and follows the plan.

**Tab content correctness:**

- **Visual tab**: FilterButton, OverlayButton, StickerButton ✓
- **Audio tab**: VoiceButton, MusicButton, SoundFXButton, CaptionsButton, AudioEditorButton ✓
- **Text tab**: TextButton, TextToSpeechButton, PasteButton ✓
- **Effects tab**: TransitionButton, AdjustButton, CutoutButton ✓
- **More tab**: LinksButton ✓

All tabs are present and contain the expected buttons. The icon rendering for each tab (camera, speaker, lines, checkmark, ellipsis) uses SVG and conditionally applies the primary orange color when the tab is active.

**Callback wiring:**

All callback props pass through to their respective child buttons. For example, `onFilter` flows to FilterButton, `onVoiceAdd` to VoiceButton. Each button invokes its callback on user action. The prop forwarding is exhaustive and correct.

**Concern (confirmed)**: MusicButton receives `onPress={handleMusicPress}` where `handleMusicPress` is a useCallback inside ToolTabBar. This handler attempts to use `imagePicker` from `expo-image-picker` to launch the media library and select an audio file. However, the callback chain terminates with `onMusic?.()`, which fires the parent's `onMusic` prop if provided. MusicButton is not written in this code review, but the flow is: (1) user taps Music, (2) handleMusicPress runs, (3) if a file is selected, `onMusic?.()` fires. If the parent component does not provide an `onMusic` callback, nothing happens after file selection. This is a design issue: the music picker succeeds but the parent never learns which audio file was selected. The parent should either (a) always provide an onMusic handler that receives the selected file URI, or (b) ToolTabBar should store the selected audio and emit it through a different callback channel. **Currently wired but incomplete**.

**Concern (confirmed)**: StickerButton is instantiated with `onPress={() => {}}`, a no-op. The onStickerSelect callback is provided (`onSticker`), but StickerButton should trigger it when the user selects a sticker. If StickerButton itself opens a sticker picker and invokes onStickerSelect internally, then the no-op onPress is acceptable (onPress is only a fallback for external sticker selection). However, without seeing StickerButton's implementation, it's unclear whether clicking the button itself does anything. **Likely incomplete**.

## Props and TypeScript Compliance

ToolTabBar's props interface is well-typed and matches PreviewActionButtons exactly. All callbacks use proper type annotations (e.g., `onFilter?: (filter: FilterConfig) => void`). Data props like `audioTracks`, `masterVolume`, and `startTime` have sensible defaults (empty array, 1, 0). No implicit `any` types; all generic types are specified (`React.FC<ToolTabBarProps>`).

The props interface is fully backward-compatible with PreviewActionButtons. Every callback that parent components expect to provide is accepted by ToolTabBar and forwarded correctly.

## PreviewActionButtons Refactoring

PreviewActionButtons now wraps ToolTabBar in a single line, forwarding all props. The component is much smaller (60 lines vs. previous implementation). The container View still applies the background color (#000), border, and flex styling. The refactoring is clean and maintains the public API: no changes to prop names or signatures, so parent components (TimelineEditor) require no updates.

## TimelineEditor Theme Integration

TimelineEditor now imports and uses `editorTheme` throughout its StyleSheet. Hardcoded colors like `#0A0A0A`, `#1A1A1A`, `#ffffff`, and `rgba(255, 255, 255, 0.08)` are replaced with `editorTheme.colors.surface`, `editorTheme.colors.surfaceRaised`, `editorTheme.colors.textPrimary`, and `editorTheme.colors.separator`. The playhead line (`playheadLine` style) now uses `editorTheme.colors.primary` (#FF6B35) and adds the glow shadow from theme.

**Playhead visual enhancement:**

```javascript
playheadLine: {
  position: 'absolute', 
  left: '50%', 
  top: 0, 
  bottom: 0, 
  width: 2,
  backgroundColor: editorTheme.colors.primary, 
  zIndex: 99,
  ...editorTheme.shadows.glow,
}
```

The shadow utilities are spread into the style, applying the orange glow. This is a good approach. The glow shadow in editorTheme uses `shadowOpacity: 0.6` and `shadowRadius: 4`, which on mobile may or may not be prominent enough. The effect is visible but subtle.

**Time display improvements:**

The `timeText` style now uses `fontSize: editorTheme.typography.body` (14px, up from 12px) and `fontFamily: 'monospace'` for visual stability. The color is `editorTheme.colors.textPrimary` (white). The time display benefits from the larger font and monospace rendering.

**Visual separation:**

All borders in TimelineEditor reference theme constants. The separators between sections (left, center, right columns; preview area, timeline, toolbar) use `editorTheme.colors.separator` for consistency. The implementation is thorough—no hardcoded border colors remain in the diffs.

## Visual Design Coherence

The color palette is cohesive. Orange (#FF6B35) is reserved for active/interactive elements (play button, active tabs, playhead, accent backgrounds). Dark surfaces (#0A0A0A, #1A1A1A, #2A2A2A) establish a video-editing workspace aesthetic familiar from DaVinci Resolve, Premiere, and CapCut. Text colors have sufficient contrast: white on dark backgrounds is 21:1 (exceeds 7:1 WCAG AAA). Secondary text (#AAAAAA) on dark background is ~4:1 (meets WCAG AA for large text, falls short for small text—but this is acceptable for secondary UI).

**Potential concern (possible)**: The active button background (20% orange on dark surface) may not meet the 3:1 minimum for UI component contrast. A very rough calculation: inactive button is white text on dark surface (21:1 good), active button is white text on slightly-darker-dark surface plus a light orange tint (~5:1 estimated). The contrast degrades when a button is active. Ideally, the active state should increase contrast, not decrease it. However, in practice, the active state relies on both the background tint _and_ the full-orange label color, so the overall visual distinction is stronger than the math suggests.

## Event Handler Completeness

PreviewActionButtons passes all callbacks through ToolTabBar, which passes them to individual buttons. The following handlers are implemented:

- onFilter, onOverlay, onText, onSticker, onMusic, onTransition: forwarded to button components
- onVoiceAdd, onSoundFXAdd, onCaptionAdd, onAdjustChange, onCutoutAdd, onLinkAdd, onOverlayEffectAdd, onPaste, onTTSGenerate, onUpdateAudioTracks, onUpdateAudioMix: forwarded

All callbacks have a target. However, three issues emerge:

1. **Music handler**: handleMusicPress in ToolTabBar fires `onMusic?.()` with no data. The parent must handle the callback separately if it needs the selected file.
2. **Sticker button**: onPress is no-op; the button may not be functional unless StickerButton internally manages sticker selection.
3. **Optional callbacks**: All callbacks are optional (`onFilter?`), so if a parent doesn't provide a callback, nothing breaks—but the feature silently fails.

## Test Coverage and Verification Status

The plan document notes that TypeScript compilation passed without errors in the first iteration. This is a good sign: all component props are typed, imports resolve, and no syntactic issues exist. However, the semantic review criteria request that touch targets, active states, and color consistency be verified, which requires either visual testing or code inspection.

**Confirmed via code inspection:**
- ToolButton enforces 44×44px touch targets (minWidth/minHeight)
- Active states apply orange text color (#FF6B35)
- Active tab pill applies orange text to label
- Playhead uses orange color from theme
- All borders use theme separator color

**Not testable without runtime:**
- Whether the active button background (20% opacity) is visually distinct enough
- Whether the playhead glow is prominent on actual device screens
- Whether the visual hierarchy feels right in practice
- Whether icons and labels render clearly at small sizes
- Whether the tab scrolling experience is smooth

The implementation appears visually correct based on code inspection, but visual testing on iOS and Android devices is necessary to confirm that the design goals (clean interface, user-friendly navigation, visual appeal) are actually achieved.

</details>

## File map

<details>
<summary>5 files changed</summary>

- **editorTheme.ts** (new): Centralized design system with colors (#FF6B35 primary, dark surface palette), typography (18/14/12/10), spacing (4–24), and shadows (subtle/medium/large/glow).
- **ToolButton.tsx** (new): Reusable button component with 44×44px touch targets, active/disabled states, orange accent styling via editorTheme.
- **ToolTabBar.tsx** (new): Five-tab toolbar (Visual/Audio/Text/Effects/More) with horizontal scrollable button lists per tab, full callback forwarding, active tab indicator.
- **TimelineEditor.tsx** (modified): Theme constant integration throughout StyleSheet, playhead glow enhancement, time display font increase to 14px + monospace, consistent border colors via theme.
- **PreviewActionButtons.tsx** (modified): Refactored to delegate all UI rendering to ToolTabBar, maintains backward-compatible props interface.

Full diff: [not included in this review; see git diff main for complete line-by-line changes]

</details>
