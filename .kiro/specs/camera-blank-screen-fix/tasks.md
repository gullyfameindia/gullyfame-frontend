# Implementation Plan

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Camera Preview Blank on Real Devices
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Manual Testing Approach**: Since this bug is device-specific and hardware-dependent, use manual testing on real devices
  - Test on real Android physical device: Navigate to camera screen → Observe if preview is blank/black while UI controls render correctly
  - Test on real iOS physical device: Navigate to camera screen → Observe if preview is blank/black while UI controls render correctly
  - Add temporary logging to confirm CameraView renders before isFocused becomes true (timing issue)
  - Test rapid navigation: Navigate to camera screen multiple times → Observe consistent blank screen pattern
  - **EXPECTED OUTCOME**: Test FAILS on unfixed code (blank screen confirms bug exists on real devices)
  - Document counterexamples found: "Camera preview is black on real Android/iOS devices but UI controls render correctly. Emulator works fine."
  - Mark task complete when manual testing is performed, failures are observed, and counterexamples are documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - All Non-Navigation Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Manual Testing Approach**: Property-based testing is not practical for this mobile camera UI scenario. Use comprehensive manual testing on real devices.
  - Observe behavior on UNFIXED code for non-buggy interactions (all interactions AFTER screen loads)
  - Test recording operations: Tap record → Start/stop recording → Verify segments save correctly
  - Test camera controls: Flip camera, toggle flash, adjust zoom, set timer, change aspect ratio → Verify all controls respond correctly
  - Test multi-segment recording: Record 3 segments → Verify all save correctly
  - Test automatic stop: Record until max duration → Verify recording stops automatically
  - Test audio and gallery: Open audio library, open gallery picker → Verify they work correctly
  - Test navigation: Complete recording → Navigate to preview screen → Verify segments passed correctly
  - Test permissions: Deny permissions → Verify permission UI displays correctly
  - Test emulator: Open camera on Android emulator → Verify preview already works (baseline)
  - Test resource cleanup: Navigate away and back → Verify camera re-initializes correctly
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS on unfixed code (confirms baseline behavior to preserve)
  - Document observed behaviors that must be preserved after fix
  - Mark task complete when manual testing is performed on unfixed code and all preservation behaviors are documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 3. Fix for camera blank screen on real devices

  - [ ] 3.1 Implement the fix
    - Open file: `apps/gully-fame-mobile/app/(main)/reels/camera.tsx`
    - Add import statement at top of file: `import { useIsFocused } from '@react-navigation/native';`
    - Add hook declaration inside InstagramReelCamera function (after function starts, around line 395-410): `const isFocused = useIsFocused();`
    - Wrap CameraView component with conditional render in return statement (around line 674-682): `{isFocused && (<CameraView ref={cameraRef} ... />)}`
    - Ensure all UI overlay elements (top bar, controls, buttons) remain outside the conditional so they render immediately
    - This matches the exact pattern used in the working `CameraScreen.tsx` file
    - _Bug_Condition: isBugCondition(input) where input.screen == 'camera.tsx' AND input.device IN ['Android Physical Device', 'iOS Physical Device'] AND CameraView.isRendered == true AND NavigationScreen.isFocused == false_
    - _Expected_Behavior: Camera preview displays live feed immediately when screen gains focus (isFocused returns true), initializing with valid rendering surface_
    - _Preservation: All recording operations, camera controls, permissions, navigation, and resource cleanup must work exactly as before_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Camera Preview Displays on Real Devices
    - **IMPORTANT**: Re-run the SAME manual tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Test on real Android physical device: Navigate to camera screen → Verify live camera preview displays within 1 second
    - Test on real iOS physical device: Navigate to camera screen → Verify live camera preview displays within 1 second
    - Test multiple navigation: Navigate to camera screen 10 times → Verify preview displays correctly every time
    - Test with granted permissions: Verify camera displays immediately upon screen focus
    - **EXPECTED OUTCOME**: All tests PASS on fixed code (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - All Non-Navigation Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME manual tests from task 2 - do NOT write new tests
    - Run all preservation tests from step 2 on FIXED code
    - Test recording: Multi-segment video recording → Verify all segments save correctly
    - Test controls: Flip, flash, timer, zoom, aspect ratio → Verify all respond correctly
    - Test record button: Start/stop recording → Verify proper state management
    - Test automatic stop: Record to max duration → Verify automatic stop works
    - Test audio/gallery: Audio selection, gallery picker → Verify they work correctly
    - Test emulator: Android emulator camera → Verify still works (unchanged)
    - Test permissions: Permission denied → Verify permission UI displays
    - Test camera flip: Front/back camera → Verify switching works correctly
    - Test navigation: Complete recording → Preview screen → Verify segments passed correctly
    - Test cleanup: Navigate away/back → Verify camera re-initializes correctly
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm all recording functionality and UI controls work identically to unfixed code

- [ ] 4. Checkpoint - Ensure all tests pass
  - Verify camera preview displays on real Android and iOS devices
  - Verify all recording operations work correctly
  - Verify all camera controls respond properly
  - Verify navigation and resource cleanup work correctly
  - If any issues arise, ask the user for guidance
