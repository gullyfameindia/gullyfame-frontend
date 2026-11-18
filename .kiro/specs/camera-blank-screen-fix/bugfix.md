# Bugfix Requirements Document

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Introduction

The Instagram-style reel camera screen (`apps/gully-fame-mobile/app/(main)/reels/camera.tsx`) displays a blank/black screen instead of the live camera preview on real Android and iOS devices. This bug is caused by the CameraView component rendering before the navigation screen gains focus, which causes Android's Camera2 API to initialize with an invalid surface. The issue does not occur on emulators but prevents users from recording reels on physical devices. The fix pattern already exists in the codebase at `apps/gully-fame-mobile/src/screens/CameraScreen.tsx` and needs to be applied to the affected file.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the camera screen (`camera.tsx`) is opened on a real Android device THEN the system renders a blank/black camera preview area while UI controls render correctly

1.2 WHEN the camera screen (`camera.tsx`) is opened on a real iOS device THEN the system renders a blank/black camera preview area while UI controls render correctly

1.3 WHEN CameraView component mounts before the navigation screen gains focus THEN the system initializes the camera with an invalid rendering surface causing a black screen

### Expected Behavior (Correct)

2.1 WHEN the camera screen is opened on a real Android device THEN the system SHALL display the live camera preview feed immediately upon screen focus

2.2 WHEN the camera screen is opened on a real iOS device THEN the system SHALL display the live camera preview feed immediately upon screen focus

2.3 WHEN the navigation screen gains focus THEN the system SHALL render the CameraView component with a valid surface showing the live camera feed

2.4 WHEN camera permissions are granted THEN the system SHALL initialize the camera only after the screen is focused to ensure a valid rendering surface

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the camera is actively recording video THEN the system SHALL CONTINUE TO record video segments correctly

3.2 WHEN users interact with camera controls (flip, flash, timer, zoom, aspect ratio) THEN the system SHALL CONTINUE TO respond to these controls as expected

3.3 WHEN users tap the record button THEN the system SHALL CONTINUE TO start/stop recording with proper state management

3.4 WHEN recording reaches maximum duration THEN the system SHALL CONTINUE TO automatically stop recording

3.5 WHEN users add audio tracks or open the gallery THEN the system SHALL CONTINUE TO handle these interactions correctly

3.6 WHEN the camera screen loads on Android emulator THEN the system SHALL CONTINUE TO display the camera preview (emulator already works)

3.7 WHEN permissions are denied THEN the system SHALL CONTINUE TO display the permission request UI

3.8 WHEN the camera is flipped between front and back THEN the system SHALL CONTINUE TO switch camera facing correctly

3.9 WHEN recording segments are completed THEN the system SHALL CONTINUE TO navigate to the preview screen with correct parameters

3.10 WHEN the screen is closed or navigated away THEN the system SHALL CONTINUE TO clean up camera resources properly
