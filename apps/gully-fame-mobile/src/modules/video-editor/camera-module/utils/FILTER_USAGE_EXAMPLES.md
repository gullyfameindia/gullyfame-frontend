# Filter Change Detection - Usage Examples

> **Outdated (note added 2026-11-18):** `ffmpegFilters.ts`, `filterHelpers.ts` and the functions shown below (`applyPresetToImage`, `applyPresetToVideo`, `getClipFilterName`, ...) no longer exist. Filters are now baked at export in `bakeEdits.ts` (FFmpeg runner in `ffmpeg.ts`; filter types in `../types/filters.ts`). Keep this file only as background on the FFmpeg filter strings.

## How to Check if a Filter Has Changed

Use the utility functions in `camera-module/utils/filterHelpers.ts` to check filter states.

### 1. Check if a Preset Has Actual Filter Values

```typescript
import { hasFilterChanges } from '../utils/filterHelpers';
import type { FilterPreset } from '../types/filters';

const preset: FilterPreset = {
  name: 'Vintage',
  contrast: 0.9,
  saturation: 0.75,
};

if (hasFilterChanges(preset)) {
  console.log('Filter has changes - will apply at export');
} else {
  console.log('No filter changes - Original');
}

// Returns false for Original or presets with no actual values
hasFilterChanges({ name: 'Original' }); // false
hasFilterChanges(null); // false
hasFilterChanges(undefined); // false
```

### 2. Check if a Clip Has a Filter Applied

```typescript
import { clipHasFilter, getClipFilterName } from '../utils/filterHelpers';
import type { CameraClip } from '../types/camera.types';

const clip: CameraClip = {
  id: '1',
  uri: 'file:///path/to/video.mp4',
  duration: 10,
  type: 'video',
  source: 'camera',
  filterPreset: {
    name: 'Cinematic',
    contrast: 0.2,
    saturation: 1.15,
  },
};

// Check if clip has a filter
if (clipHasFilter(clip)) {
  console.log('Clip has filter applied');
  console.log('Filter name:', getClipFilterName(clip)); // "Cinematic"
} else {
  console.log('Clip has no filter (Original)');
  console.log('Filter name:', getClipFilterName(clip)); // "Original"
}

// For clip without filter
const originalClip: CameraClip = {
  id: '2',
  uri: 'file:///path/to/image.jpg',
  duration: 0,
  type: 'photo',
  source: 'gallery',
  // filterPreset not set
};

clipHasFilter(originalClip); // false
getClipFilterName(originalClip); // "Original"
```

### 3. Compare Two Filter Presets

```typescript
import { areFiltersDifferent } from '../utils/filterHelpers';

const preset1 = { name: 'Vintage', contrast: 0.9 };
const preset2 = { name: 'Vintage', contrast: 0.9 };
const preset3 = { name: 'Dramatic', contrast: 1.4 };

areFiltersDifferent(preset1, preset2); // false - same values
areFiltersDifferent(preset1, preset3); // true - different values
areFiltersDifferent(preset1, null); // true - one has filter, one doesn't
areFiltersDifferent(null, null); // false - both Original
```

### 4. Conditional Export Based on Filter

```typescript
import { clipHasFilter } from '../utils/filterHelpers';
import { applyPresetToImage, applyPresetToVideo } from './ffmpegFilters';
import * as FileSystem from 'expo-file-system';

async function exportClip(clip: CameraClip, outputPath: string): Promise<string> {
  // Check if clip has a filter
  if (clipHasFilter(clip) && clip.filterPreset) {
    // Apply filter using FFmpeg
    if (clip.type === 'photo') {
      return await applyPresetToImage(clip.uri, outputPath, clip.filterPreset);
    } else {
      return await applyPresetToVideo(clip.uri, outputPath, clip.filterPreset);
    }
  } else {
    // No filter - just copy original file
    await FileSystem.copyAsync({ from: clip.uri, to: outputPath });
    return outputPath;
  }
}
```

### 5. Show Filter Indicator in UI

```typescript
import { clipHasFilter, getClipFilterName } from '../utils/filterHelpers';

function ClipThumbnail({ clip }: { clip: CameraClip }) {
  const hasFilter = clipHasFilter(clip);
  const filterName = getClipFilterName(clip);

  return (
    <View>
      <Image source={{ uri: clip.uri }} />
      {hasFilter && (
        <View style={styles.filterBadge}>
          <Text>{filterName}</Text>
        </View>
      )}
    </View>
  );
}
```

### 6. Track Filter Changes in State

```typescript
import { useState, useEffect } from 'react';
import { hasFilterChanges, areFiltersDifferent } from '../utils/filterHelpers';

function PreviewEditor({ clip }: { clip: CameraClip }) {
  const [selectedFilter, setSelectedFilter] = useState<FilterConfig | null>(clip.filterPreset || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Check if current filter differs from original clip filter
    const originalFilter = clip.filterPreset || null;
    const changed = areFiltersDifferent(selectedFilter, originalFilter);
    setHasUnsavedChanges(changed);
  }, [selectedFilter, clip.filterPreset]);

  const handleFilterChange = (filter: FilterConfig) => {
    setSelectedFilter(hasFilterChanges(filter) ? filter : null);
  };

  return (
    <View>
      {hasUnsavedChanges && <Text>Unsaved filter changes</Text>}
      {/* ... rest of UI */}
    </View>
  );
}
```

## Summary

- **`hasFilterChanges(preset)`** - Check if a preset has actual filter values
- **`clipHasFilter(clip)`** - Check if a clip has a filter applied
- **`getClipFilterName(clip)`** - Get the filter name or "Original"
- **`areFiltersDifferent(preset1, preset2)`** - Compare two presets

Use these functions to:
- Conditionally apply filters at export time
- Show filter indicators in UI
- Track unsaved changes
- Skip FFmpeg processing for Original/no-filter clips

