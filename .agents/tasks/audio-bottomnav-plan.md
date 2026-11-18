# Video Editor Audio & Bottom Navigation Integration Plan

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview
This plan fixes the disabled audio tool panel and builds a unified backend service layer for all 10 editor tools in the bottom navigation bar. The work decomposes into 3 independent features: (1) Audio panel fix, (2) Service layer creation, (3) Component integration.

---

## Design Decisions

### 1. Service Layer Architecture
**Decision:** Create dedicated service files in `src/api/services/` following the existing soundFXService pattern.

**Rationale:** The codebase already has 30+ service files using a consistent pattern. Replicating this pattern ensures consistency, maintainability, and leverages existing error handling and auth mechanisms. Each service handles request/response normalization and returns typed `ApiResponse<T>` objects. Public endpoints automatically skip auth via `skipAuth: true` in the apiClient interceptor.

### 2. API Endpoints
**Decision:** Map bottom nav tools to Postman collection endpoints:
- **Audio**: GET `/public/audio?sort=trending` (already working via musicLibraryService)
- **Filters**: GET `/public/filters` (via filterLibraryService)
- **Stickers**: GET `/public/stickers` (via stickerEmojiService)
- **Sound FX**: GET `/public/soundfx` (via soundFXService)
- **Captions**: POST `/reels/auto-caption` (new captionsService)
- **Voice**: Uses expo-audio recorder (local) + voiceoverService for uploads
- **Text**: Local state only (no backend call)
- **Adjust**: Local state only (brightness/contrast/saturation/exposure)
- **Doodles**: Local state only (canvas drawing)
- **Transitions**: Not in Postman collection; implement as local state or fallback

**Rationale:** The Postman collection reveals clear backend endpoints for list/search operations. Components that modify local state (text, adjust, doodles) do not need backend calls until export time. Voice recording uses native expo-audio + voiceoverService. Transitions may be local or require separate spec.

### 3. Error Handling & User Feedback
**Decision:** All tool panels show: (a) loading spinner while fetching, (b) error Alert on API failure, (c) empty state message if no data, (d) fallback data or UI gracefully.

**Rationale:** Matches existing UI patterns seen in AudioToolPanel and SoundFXToolPanel. Provides clear feedback to users. Logging to console for debugging.

### 4. AudioToolPanel Fix
**Decision:** Uncomment the real AudioToolPanel import and JSX; remove the disabled placeholder.

**Rationale:** AudioToolPanel.tsx is already correctly implemented using real expo-audio APIs (Audio.Sound.createAsync, requestRecordingPermissionsAsync). The disable message was added as a temporary workaround. Enabling it is a simple fix that unblocks the audio feature.

---

## Implementation Steps

### FEAT-001: Fix Audio Tool Panel (Small Effort)

**What:** Enable the disabled audio tool by uncommenting AudioToolPanel and removing the disabled placeholder JSX in edit.tsx.

**Files:**
- `apps/gully-fame-mobile/app/(main)/upload/edit.tsx` (lines ~22, ~675-682)
- `apps/gully-fame-mobile/src/components/VideoEditor/AudioToolPanel.tsx` (no changes needed)

**Verify:** 
```bash
npm run lint
npm run android  # Build and test — click Audio in bottom nav, verify panel opens
```

---

### FEAT-002: Create & Enhance Service Layer (Medium Effort)

**What:** Build dedicated service files for each editor tool, following the soundFXService pattern. Normalize response fields, handle both public and user-authenticated endpoints, provide typed return values.

**Files to Create/Enhance:**
- `src/api/services/filterLibraryService.ts` — enhance if incomplete, add `listFilters()`, `getFilterById()`, `searchFilters()` using GET `/public/filters`
- `src/api/services/stickerEmojiService.ts` — enhance if incomplete, add `listStickers()`, `getStickerById()`, `searchStickers()` using GET `/public/stickers`
- `src/api/services/captionsService.ts` (NEW) — add `autoCaption(videoUri: string)` using POST `/reels/auto-caption`
- `src/api/services/voiceoverService.ts` — review for `recordVoiceOver()` method
- `src/api/services/cameraService.ts` — review for photo/video capture methods
- `src/api/services/musicLibraryService.ts` — already complete (audio tracks)
- `src/api/services/soundFXService.ts` — already complete (sound effects)

**Pattern to Follow:**
```typescript
import apiClient from "../axios";
import { ApiResponse } from "../types";

export interface MyItem {
  _id: string;
  title: string;
  // ... other fields
}

export async function listMyItems(page = 1, limit = 20): Promise<ApiResponse<MyItem[]>> {
  try {
    const response = await apiClient.get("/public/my-items", {
      params: { page, limit },
      skipAuth: true  // Use skipAuth: true for public endpoints
    });
    
    const data = response.data as any;
    if (data.code === 1 && data.data) {
      // Normalize response fields
      const items = (data.data.items || data.data || []).map((item: any) => ({
        _id: item._id ?? item.id,
        title: item.title ?? item.name,
        // ...
      }));
      return { success: true, data: items, message: "Fetched successfully" };
    }
    return { success: false, message: "Failed", data: undefined };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message, data: undefined };
  }
}

export const myService = { listMyItems, /* ... */ };
export default myService;
```

**Verify:**
```bash
npm run lint  # No TypeScript errors
```

---

### FEAT-003: Integrate Tool Panels with Services (Large Effort)

**What:** Update all tool panel components to call service methods instead of direct API calls or fallback data. Add proper loading, error, and empty states.

**Files to Update:**
- `src/components/VideoEditor/StickersToolPanel.tsx` — use `stickerEmojiService.listStickers()` instead of direct API call
- `src/components/VideoEditor/FiltersToolPanel.tsx` — use `filterLibraryService.listFilters()`
- `src/components/VideoEditor/SoundFXToolPanel.tsx` — use `soundFXService.listSoundFX()` (already partially done, ensure it's complete)
- `src/components/VideoEditor/CaptionsToolPanel.tsx` — use `captionsService.autoCaption()` to generate captions
- `src/components/VideoEditor/TextToolPanel.tsx` — no backend call needed; ensure local state works
- `src/components/VideoEditor/VoiceToolPanel.tsx` — no backend call needed during recording; use voiceoverService for storage
- `src/components/VideoEditor/AdjustToolPanel.tsx` — no backend call needed (local adjustments)
- `src/components/VideoEditor/DoodlesToolPanel.tsx` — no backend call needed (local drawing)
- `src/components/VideoEditor/OverlayToolPanel.tsx` — no backend call needed (local overlay)
- `src/components/VideoEditor/CutoutToolPanel.tsx` — no backend call needed (local cutout)

**Pattern for Component:**
```typescript
import { useState, useEffect } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import stickerEmojiService from "@/api/services/stickerEmojiService";

export default function StickersToolPanel({ onClose, onAddSticker }) {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStickers();
  }, []);

  const fetchStickers = async () => {
    setLoading(true);
    const result = await stickerEmojiService.listStickers();
    if (result.success) {
      setStickers(result.data);
    } else {
      Alert.alert("Error", result.message);
    }
    setLoading(false);
  };

  if (loading) return <ActivityIndicator />;
  if (stickers.length === 0) return <Text>No stickers found</Text>;

  return (
    // Render stickers list
  );
}
```

**Verify:**
```bash
npm run lint  # No TypeScript errors
npm run android  # Build and test each tool panel
# Manual test: Click each tool in bottom nav, verify panel opens, data loads, no errors
```

---

## API Endpoints Reference

From Postman collection analysis:

| Tool | Method | Endpoint | Auth | Service |
|------|--------|----------|------|---------|
| Audio | GET | `/public/audio?sort=trending` | Public | musicLibraryService |
| Audio | POST | `/user/audio/{id}/save` | User | musicLibraryService |
| Audio | GET | `/user/audio/saved` | User | musicLibraryService |
| Filters | GET | `/public/filters` | Public | filterLibraryService |
| Stickers | GET | `/public/stickers` | Public | stickerEmojiService |
| Sound FX | GET | `/public/soundfx` | Public | soundFXService |
| Captions | POST | `/reels/auto-caption` | User | captionsService |
| Text | — | — | — | (Local state) |
| Voice | — | — | — | (Local + voiceoverService) |
| Adjust | — | — | — | (Local state) |
| Doodles | — | — | — | (Local state) |
| Transitions | — | — | — | (Local state or TBD) |

---

## File Summary

### New Files
- `src/api/services/captionsService.ts`

### Enhanced Files
- `src/api/services/filterLibraryService.ts` (if incomplete)
- `src/api/services/stickerEmojiService.ts` (if incomplete)
- `src/api/services/voiceoverService.ts` (review)
- `src/api/services/cameraService.ts` (review)

### Updated Files
- `app/(main)/upload/edit.tsx` (uncomment AudioToolPanel)
- `src/components/VideoEditor/StickersToolPanel.tsx`
- `src/components/VideoEditor/FiltersToolPanel.tsx`
- `src/components/VideoEditor/SoundFXToolPanel.tsx`
- `src/components/VideoEditor/CaptionsToolPanel.tsx`
- `src/components/VideoEditor/TextToolPanel.tsx`
- `src/components/VideoEditor/VoiceToolPanel.tsx`
- `src/components/VideoEditor/AdjustToolPanel.tsx`
- `src/components/VideoEditor/DoodlesToolPanel.tsx`

### Unchanged
- `src/api/axios.ts` (already handles auth and errors)
- `src/api/types.ts` (ApiResponse<T> already defined)
- `src/components/VideoEditor/AudioToolPanel.tsx` (already correct)
- `src/components/VideoEditor/OverlayToolPanel.tsx` (local overlay data)
- `src/components/VideoEditor/CutoutToolPanel.tsx` (local cutout settings)

---

## Build & Test Commands

```bash
# Lint check
npm run lint

# Build for Android
npm run android

# Build for iOS
npm run ios

# Run tests (if configured)
npm test

# Check specific component compiles
npx tsc --noEmit src/api/services/filterLibraryService.ts
```

---

## Verification Checklist

- [ ] Audio tool panel opens without "temporarily disabled" message
- [ ] All service files compile without TypeScript errors
- [ ] All tool panels render and load data from backend
- [ ] Loading spinners show while fetching
- [ ] Error alerts show on API failure
- [ ] Empty state message shows when no data
- [ ] No console errors or warnings
- [ ] Each tool button in bottom nav is clickable
- [ ] Postman collection endpoints match service URLs
- [ ] Auth headers automatically attached (user endpoints)
- [ ] Public endpoints skip auth (skipAuth: true)

---

## Notes

- The codebase uses expo-audio 57.0.5, which is already installed. AudioToolPanel correctly imports and uses it.
- All new services inherit auth handling from the axios interceptor via `apiClient`.
- Response field normalization handles both snake_case and camelCase from backend.
- Fallback/mock data can be provided for offline testing but should not be shown in production.
- The `BASE_URL` is stripped of trailing slashes to avoid double-slash issues in requests.

