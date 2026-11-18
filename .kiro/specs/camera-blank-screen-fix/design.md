# Camera Blank Screen Fix - Bugfix Design

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview

The Instagram-style reel camera screen displays a blank/black preview on real Android and iOS devices because the CameraView component renders before the navigation screen gains focus. This causes Android's Camera2 API and iOS's AVFoundation to initialize with an invalid rendering surface. The fix wraps the CameraView render with a focus check using React Navigation's `useIsFocused` hook, ensuring the camera initializes only after the screen is focused with a valid surface. This pattern is already working in `CameraScreen.tsx` and needs to be applied to `camera.tsx`.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the camera screen opens on a real device and CameraView renders before screen focus
- **Property (P)**: The desired behavior - camera preview displays immediately when screen gains focus
- **Preservation**: Existing recording, UI controls, permissions, and navigation behavior that must remain unchanged
- **InstagramReelCamera**: The component in `apps/gully-fame-mobile/app/(main)/reels/camera.tsx` that renders the reel recording interface
- **CameraView**: The Expo Camera component that provides the live camera preview
- **useIsFocused**: React Navigation hook that returns true when the screen is currently focused
- **Camera Surface**: The native rendering target for camera preview (SurfaceTexture on Android, AVCaptureVideoPreviewLayer on iOS)
- **Screen Focus**: The navigation state where a screen is the active, visible screen in the navigation stack

## Bug Details

### Bug Condition

The bug manifests when a user opens the camera screen on a real Android or iOS device. The CameraView component renders immediately during component mount, but the navigation screen has not yet gained focus. This causes the native camera APIs to initialize with an invalid or not-yet-ready rendering surface, resulting in a black screen. The bug does NOT occur on emulators because emulators have different timing characteristics and may not enforce the same surface validity requirements.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ScreenNavigationEvent
  OUTPUT: boolean
  
  RETURN input.screen == 'camera.tsx'
         AND input.device IN ['Android Physical Device', 'iOS Physical Device']
         AND CameraView.isRendered == true
         AND NavigationScreen.isFocused == false
         AND CameraPreview.isVisible == false
END FUNCTION
```

### Examples

- **Android Physical Device**: User navigates to camera screen → CameraView renders immediately → Screen not yet focused → Camera2 API initializes with invalid SurfaceTexture → Black preview with working UI controls
- **iOS Physical Device**: User navigates to camera screen → CameraView renders immediately → Screen not yet focused → AVFoundation initializes with invalid preview layer → Black preview with working UI controls
- **Android Emulator**: User navigates to camera screen → CameraView renders → Timing allows focus to occur before surface initialization → Camera preview works correctly (NOT a bug condition)
- **Edge Case - Permission Denied**: User has denied camera permissions → Permission UI displays → Camera should not initialize → Black screen is EXPECTED (NOT a bug condition)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Multi-segment video recording must continue to work exactly as before
- All camera controls (flip, flash, timer, zoom, aspect ratio) must continue to respond correctly
- Record button tap to start/stop recording must continue to work with proper state management
- Automatic recording stop at maximum duration must continue to work
- Audio track selection and gallery picker must continue to work correctly
- Android emulator camera preview must continue to work (already working)
- Permission request UI must continue to display when permissions are denied
- Camera flip between front and back must continue to switch correctly
- Navigation to preview screen with recording segments must continue to work
- Camera resource cleanup on screen close/navigation must continue to work properly

**Scope:**
All inputs and interactions that do NOT involve the initial camera screen navigation on a real device should be completely unaffected by this fix. This includes:
- All user interactions with UI controls after the screen has loaded
- Recording operations and segment management
- Navigation to/from the camera screen
- Permission handling flows
- Emulator camera behavior (already working)

## Hypothesized Root Cause

Based on the bug description and the working fix in `CameraScreen.tsx`, the root cause is:

1. **Premature CameraView Rendering**: The CameraView component renders during the initial component mount in the return statement, which happens before React Navigation completes the screen focus transition.

2. **Invalid Surface Initialization**: When CameraView renders before screen focus:
   - **Android**: Camera2 API attempts to bind to a SurfaceTexture that is not yet attached to a visible window, causing initialization to fail silently
   - **iOS**: AVFoundation's AVCaptureVideoPreviewLayer attempts to render to a layer that is not yet in the view hierarchy, causing preview to fail

3. **Navigation Timing Issue**: React Navigation's focus event fires AFTER the component has already mounted and rendered, which is too late for the camera initialization that happens during CameraView's initial render.

4. **Emulator Behavior Difference**: Emulators have different timing characteristics, possibly allowing the focus to occur before surface initialization completes, masking the issue during development.

## Correctness Properties

Property 1: Bug Condition - Camera Preview Displays on Real Devices

_For any_ navigation event where the camera screen opens on a real Android or iOS device, the fixed InstagramReelCamera component SHALL delay CameraView rendering until the screen gains focus (isFocused returns true), causing the camera to initialize with a valid surface and display the live preview feed immediately.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - All Non-Navigation Behavior Unchanged

_For any_ user interaction or system event that is NOT the initial camera screen navigation (recording operations, control interactions, permission flows, navigation away from screen, resource cleanup), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing recording functionality, UI control responses, permission handling, and navigation flows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

The fix requires only 2 changes to a single file: `apps/gully-fame-mobile/app/(main)/reels/camera.tsx`

**File**: `apps/gully-fame-mobile/app/(main)/reels/camera.tsx`

**Change 1: Add Import**
Add the `useIsFocused` hook import to the existing React Navigation imports.

**Location**: Top of file, around line 1-30 (import section)

**Specific Change**:
Add this import statement:
```typescript
import { useIsFocused } from '@react-navigation/native';
```

**Change 2: Add Focus Check and Wrap CameraView**

**Location**: Inside `InstagramReelCamera` component function

**Specific Changes**:

1. **Add hook declaration** (after component function starts, around line 395-410):
   ```typescript
   export default function InstagramReelCamera() {
     const isFocused = useIsFocused(); // ADD THIS LINE
     const params = useLocalSearchParams();
     // ... rest of existing state declarations
   ```

2. **Wrap CameraView with conditional render** (around line 674-682 in the return statement):
   ```typescript
   return (
     <View style={styles.container}>
       {/* Camera - Only render when screen is focused */}
       {isFocused && (
         <CameraView
           ref={cameraRef}
           style={StyleSheet.absoluteFillObject}
           facing={state.cameraFacing}
           enableTorch={state.flash === 'on'}
           zoom={state.zoom - 1}
           mode="video"
         />
       )}
       {/* All other UI elements remain outside the conditional */}
   ```

**Implementation Notes**:
- The `useIsFocused` hook returns `true` when the screen is focused and `false` otherwise
- By wrapping CameraView in `{isFocused && (...)}`, we ensure it only renders when the screen is focused
- All UI overlay elements (top bar, controls, buttons) remain outside the conditional so they render immediately
- This matches the exact pattern used in the working `CameraScreen.tsx` file
- No other changes to camera logic, permissions, recording, or controls are needed

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (confirming blank screen on real devices), then verify the fix works correctly (camera preview displays) and preserves existing behavior (recording and controls still work).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the root cause is premature CameraView rendering before screen focus.

**Test Plan**: Manual testing on real devices with unfixed code to observe the blank screen, then add logging to confirm CameraView renders before isFocused becomes true.

**Test Cases**:
1. **Android Physical Device Test**: Open camera screen on real Android device → Observe blank preview with working UI controls → Confirm CameraView rendered before focus (will fail on unfixed code)
2. **iOS Physical Device Test**: Open camera screen on real iPhone → Observe blank preview with working UI controls → Confirm CameraView rendered before focus (will fail on unfixed code)
3. **Emulator Baseline Test**: Open camera screen on Android emulator → Observe working camera preview → Confirm this is NOT the bug condition (should pass on unfixed code)
4. **Rapid Navigation Test**: Quickly navigate to camera screen and back multiple times on real device → Observe consistent blank screen pattern → Confirm timing issue (will fail on unfixed code)

**Expected Counterexamples**:
- Camera preview is black/blank on real Android and iOS devices but works on emulators
- UI controls render correctly but camera feed is not visible
- Possible causes confirmed: CameraView rendering before screen focus, causing invalid surface initialization

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (opening camera screen on real device), the fixed function produces the expected behavior (live camera preview displays).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := InstagramReelCamera_fixed(input)
  ASSERT expectedBehavior(result)
END FOR

WHERE expectedBehavior(result) IS DEFINED AS:
  result.cameraPreview.isVisible == true
  AND result.cameraPreview.showsLiveFeed == true
  AND result.uiControls.areVisible == true
  AND result.timeToDisplay <= 1000ms
```

**Test Plan**: Manual testing on real Android and iOS devices with FIXED code, confirming camera preview displays immediately.

**Test Cases**:
1. **Android Device Fixed Test**: Open camera screen on real Android device → Camera preview displays live feed within 1 second
2. **iOS Device Fixed Test**: Open camera screen on real iPhone → Camera preview displays live feed within 1 second
3. **Multiple Navigation Test**: Navigate to camera screen 10 times → Camera preview displays correctly every time
4. **Different Permission States Test**: Test with granted permissions → Camera displays immediately

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (all other interactions), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT InstagramReelCamera_original(input) = InstagramReelCamera_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is NOT practical for this mobile UI scenario. Instead, comprehensive manual testing and unit testing of recording logic is recommended because:
- Mobile camera interactions are stateful and hardware-dependent
- Recording operations involve native modules that are difficult to mock comprehensively
- UI interactions require real user gestures and timing
- Property-based testing works best for pure functions, not stateful UI components

**Test Plan**: Systematically test all existing functionality on FIXED code to confirm identical behavior to unfixed code (except for the camera preview bug itself).

**Test Cases**:

1. **Recording Preservation**: 
   - Tap record button → Start recording → Tap again → Stop recording → Verify segment saved
   - Record multiple segments → Verify all segments saved correctly
   - Record until max duration → Verify automatic stop works

2. **Camera Controls Preservation**:
   - Tap flip button → Verify camera switches between front and back
   - Tap flash button → Verify flash toggles between on/off/auto with visual indicator
   - Adjust zoom → Verify zoom changes smoothly between 1x, 2x, 3x
   - Set timer → Verify countdown works before recording starts
   - Change aspect ratio → Verify preview adjusts to 9:16, 1:1, 16:9

3. **Navigation Preservation**:
   - Complete recording → Navigate to preview screen → Verify segments passed correctly
   - Tap close button → Verify returns to previous screen
   - Open gallery → Verify gallery picker opens

4. **Audio Selection Preservation**:
   - Tap audio button → Open audio library → Select audio → Verify audio attached to recording

5. **Permission Handling Preservation**:
   - Test with denied permissions → Verify permission request UI displays
   - Grant permissions → Verify camera initializes correctly

6. **Emulator Behavior Preservation**:
   - Test on Android emulator → Verify camera still works (should be unchanged)

7. **Resource Cleanup Preservation**:
   - Record video → Navigate away → Return to camera → Verify camera re-initializes correctly
   - Record video → Close screen → Verify no memory leaks or resource issues

### Unit Tests

Manual testing is the primary validation method for this fix because:
- The bug is device-specific and requires real hardware to reproduce
- Camera APIs interact with native modules that cannot be easily mocked
- The fix is minimal (2 changes) and primarily affects initialization timing

**Recommended Unit Tests** (if testing infrastructure exists):
- Mock test that CameraView only renders when isFocused is true
- Mock test that UI controls render regardless of isFocused value
- Test that component unmounts cleanly when navigating away

### Property-Based Tests

Property-based testing is NOT recommended for this fix because:
- The bug is deterministic based on navigation timing, not input variation
- Camera hardware interactions cannot be meaningfully randomized
- Mobile UI state is complex and stateful, making property generation impractical
- Manual testing on real devices provides stronger validation than simulated property tests

### Integration Tests

Integration testing will be performed manually on real devices:

1. **Full Recording Flow on Android**:
   - Open camera screen → Verify preview displays
   - Record 3 segments with different cameras (front/back)
   - Add audio track
   - Navigate to preview → Verify all segments play correctly

2. **Full Recording Flow on iOS**:
   - Open camera screen → Verify preview displays
   - Record 2 segments with flash and timer
   - Change aspect ratio mid-recording
   - Navigate to preview → Verify segments merged correctly

3. **Rapid Context Switching**:
   - Open camera → Navigate away → Return → Open camera → Repeat 5 times
   - Verify camera initializes correctly every time
   - Verify no crashes or resource exhaustion

4. **Permission Flow Integration**:
   - Deny camera permission → Open camera → Verify permission request
   - Grant permission → Verify camera initializes with live preview
   - Revoke permission in settings → Return to app → Verify permission request again

5. **Multi-Device Validation**:
   - Test on multiple Android devices (different manufacturers and OS versions)
   - Test on multiple iOS devices (different models and iOS versions)
   - Confirm consistent behavior across devices
