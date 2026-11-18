# FFmpeg Filter Preset System

> **Outdated (note added 2026-11-18):** `ffmpegFilters.ts`, `filterHelpers.ts` and the functions shown below (`applyPresetToImage`, `applyPresetToVideo`, `getClipFilterName`, ...) no longer exist. Filters are now baked at export in `bakeEdits.ts` (FFmpeg runner in `ffmpeg.ts`; filter types in `../types/filters.ts`). Keep this file only as background on the FFmpeg filter strings.

This module implements Snapchat-style creative filters using FFmpeg for both images and videos.

## Overview

- **Preview**: Uses `react-native-color-matrix-image-filters` for real-time visual preview (UI only)
- **Export**: Uses `ffmpeg-kit-react-native` to apply filters and create filtered media files

## Files

- `camera-module/types/filters.ts` - Filter preset types and definitions
- `camera-module/utils/ffmpegFilters.ts` - FFmpeg filter application functions

## Usage

### 1. Select a Filter in UI

When user selects a filter in the preview screen, store it in the clip's metadata:

```typescript
import type { FilterPreset } from '../types/filters';

// Store filter preset in clip
clip.filterPreset = selectedPreset;
```

### 2. Apply Filter at Export Time

```typescript
import { applyPresetToImage, applyPresetToVideo } from '../utils/ffmpegFilters';
import * as FileSystem from 'expo-file-system';

// For Images
async function exportImageWithFilter(clip: CameraClip, outputPath: string) {
  if (clip.filterPreset) {
    const filteredPath = await applyPresetToImage(
      clip.uri,
      outputPath,
      clip.filterPreset
    );
    return filteredPath;
  }
  // No filter, just copy original
  await FileSystem.copyAsync({ from: clip.uri, to: outputPath });
  return outputPath;
}

// For Videos
async function exportVideoWithFilter(clip: CameraClip, outputPath: string) {
  if (clip.filterPreset) {
    const filteredPath = await applyPresetToVideo(
      clip.uri,
      outputPath,
      clip.filterPreset
    );
    return filteredPath;
  }
  // No filter, just copy original
  await FileSystem.copyAsync({ from: clip.uri, to: outputPath });
  return outputPath;
}
```

## Filter Presets

Available presets (defined in `camera-module/types/filters.ts`):

- **Original** - No filter
- **Grayscale** - Black and white
- **Warm** - Warm temperature, increased contrast/saturation
- **Cool** - Cool temperature, increased contrast
- **Vintage** - Desaturated, warm, with vignette
- **Dramatic** - High contrast, high saturation
- **Soft** - Reduced contrast, softer look
- **Cinematic** - Film-like with vignette
- **Vibrant** - High saturation and contrast
- **Moody** - Darker, desaturated, cool tones

## Filter Parameters

Each preset can have:

- `brightness`: -1.0 to 1.0 (0 = no change)
- `contrast`: 0.0 to 3.0 (1.0 = no change)
- `saturation`: 0.0 to 3.0 (1.0 = no change, 0.0 = grayscale)
- `gamma`: 0.1 to 10.0 (1.0 = no change)
- `temperature`: -1.0 to 1.0 (0 = neutral, positive = warm, negative = cool)
- `tint`: -1.0 to 1.0 (0 = neutral, positive = magenta, negative = green)
- `vignette`: Optional vignette effect with angle, x0, y0
- `grain`: Optional grain effect with strength

## FFmpeg Filter Chain

The system converts presets to FFmpeg filter chains like:

```
eq=brightness=0.1:contrast=1.2:saturation=1.3:gamma=1.0,colorbalance=rs=0.3:bs=-0.3,vignette=angle=1.57:x0=0.5:y0=0.5
```

## Notes

- Filters are applied only at export time (not during preview)
- Preview uses `react-native-color-matrix-image-filters` for real-time visual feedback
- Both images and videos use the same preset system
- FFmpeg processing happens asynchronously
- Original files are preserved; filtered output is saved to a new path

