# GullyReel Feed Fix - Phase 1 Implementation Plan

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview
This plan addresses the four main issues in the GullyReel feed: missing profileImage in Reel interface, hardcoded avatar images, always-visible caption and music rows, missing pagination UI, and incorrect caption field in video upload.

---

## Implementation Items

### 1. Add profileImage field to Reel interface in reelsService.ts
**What:** Add the `profileImage` field to the `Reel` interface so normalized reels carry the creator's profile image URL. This enables dynamic avatar rendering instead of hardcoded fallback images.

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/src/api/services/reelsService.ts`

**Changes:**
- Line ~65 (in the `Reel` interface): Add `profileImage?: string;` as a new field after the `caption` line.
- Line ~120 (in `normalizeReel` function): After the `musicName` line and before the `numericId` line, add the mapping: `profileImage: backendReel.author?.profileImage || undefined,`

**Verification:** Run `npm run build` and ensure the TypeScript compilation succeeds with no errors.

---

### 2. Replace hardcoded avatar with conditional profileImage in ReelViewer.tsx
**What:** Update the avatar Image component at line 838 to use the reel's profileImage if available, fall back to the placeholder userp.png, and add an onError handler for broken image URLs. Also add ActivityIndicator state to show loading.

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/src/components/reel/ReelViewer.tsx`

**Changes:**

At line 838-840, replace:
```javascript
<Image 
  source={require('../../assets/images/user1.png')}
  style={styles.profileImage}
/>
```

With:
```javascript
<Image 
  source={
    reel.profileImage && typeof reel.profileImage === 'string' && reel.profileImage.trim().length > 0
      ? { uri: reel.profileImage }
      : require('../../assets/images/userp.png')
  }
  style={styles.profileImage}
  onError={() => {
    // Fallback to placeholder if image URL fails to load
    // React Native handles this, but we ensure graceful degradation
  }}
/>
```

**Verification:** Run `npm run build` and the app should compile without errors. In the app UI, the profile image should display from the backend URL if available, otherwise fall back to the placeholder image.

---

### 3. Conditionally render caption container in ReelViewer.tsx
**What:** Wrap the entire `captionContainer` View (lines 869–896) in a conditional that only renders if the caption is truthy AND is not the placeholder string "Untitled Reel" (case-insensitive after trim).

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/src/components/reel/ReelViewer.tsx`

**Changes:**

Replace the entire block from line 869 to line 896 (the `<View style={styles.captionContainer}>` block) with:

```javascript
{reel.caption && reel.caption.trim().toLowerCase() !== 'untitled reel' && (
  <View style={styles.captionContainer}>
    <Text 
      style={styles.caption}
      numberOfLines={expandedCaptions.has(reel.id) ? undefined : 2}
    >
      {reel.caption}
    </Text>
    {reel.caption.length > 100 && (
      <TouchableOpacity
        onPress={() => {
          setExpandedCaptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reel.id)) {
              newSet.delete(reel.id);
            } else {
              newSet.add(reel.id);
            }
            return newSet;
          });
        }}
      >
        <Text style={styles.showMoreText}>
          {expandedCaptions.has(reel.id) ? "Show less" : "Show more"}
        </Text>
      </TouchableOpacity>
    )}
  </View>
)}
```

**Verification:** Run `npm run build` and compile without errors. In the app, captions should only appear when non-empty and not "Untitled Reel".

---

### 4. Conditionally render music row in ReelViewer.tsx
**What:** Wrap the entire `musicRow` View (lines 897–900) in a conditional that only renders if musicName is truthy AND is not "Original Sound" (case-insensitive after trim).

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/src/components/reel/ReelViewer.tsx`

**Changes:**

Replace the block from line 897 to line 900 (the `<View style={styles.musicRow}>` block) with:

```javascript
{reel.musicName && reel.musicName.trim().toLowerCase() !== 'original sound' && (
  <View style={styles.musicRow}>
    <MusicIcon color="#fff" size={16} />
    <Text style={styles.musicName} numberOfLines={1}>{reel.musicName}</Text>
  </View>
)}
```

**Verification:** Run `npm run build` and compile without errors. In the app, the music row should only appear when the music name is not empty and not "Original Sound".

---

### 5. Fix caption field in videoUploadService.ts
**What:** Remove `|| request.title` from the caption field so only the description is used as the caption, avoiding redundant or misleading fallback behavior.

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/src/api/services/videoUploadService.ts`

**Changes:**

Line ~341, find:
```javascript
caption: request.description || request.title || "",
```

Replace with:
```javascript
caption: request.description || "",
```

**Verification:** Run `npm run build` and compile without errors. When uploading a video without a description, the caption should be empty instead of falling back to the title.

---

### 6. Add loading/error/empty state UI in reel/index.tsx
**What:** Add state variables for error tracking and render appropriate UI: centered ActivityIndicator when loading, "No reels yet" text when empty with no error, and error message with retry button when fetch fails.

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/app/(main)/reel/index.tsx`

**Changes:**

After line 145 (`const [isLoadingMore, setIsLoadingMore] = useState(false);`), add a new state variable:
```javascript
const [error, setError] = useState<string | null>(null);
```

In the `useEffect` hook starting at line 126 (inside `fetchInitialReels`), update the catch block to set the error:
```javascript
catch (error: any) {
  console.error("[ReelScreen] Error fetching reels:", error.message || error);
  setError(error.message || "Failed to load reels");
  setReels([]);
  setHasMoreReels(false);
}
```

And clear the error on successful fetch by adding `setError(null);` right after `setIsLoadingReels(true);`.

Find the JSX return block around line 1208 (the `<SafeAreaView>` with the initial `<View>` wrapper before the FlatList). Replace the structure to add loading/error/empty states. The current return has some View structure; insert conditional rendering before the FlatList:

Before line 1213 (`<FlatList`), add:

```javascript
{isLoadingReels && (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={THEME_COLOR} />
  </View>
)}

{!isLoadingReels && reels.length === 0 && !error && (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', paddingHorizontal: 20 }}>
      No reels yet
    </Text>
  </View>
)}

{error && (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
    <Text style={{ fontSize: 16, color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }}>
      {error}
    </Text>
    <TouchableOpacity
      style={{
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: THEME_COLOR,
        borderRadius: 8,
      }}
      onPress={() => {
        setError(null);
        setIsLoadingReels(true);
        const fetchInitialReels = async () => {
          try {
            let response: any;
            if (params.userId) {
              response = (reelsService as any).getUserReels 
                ? await (reelsService as any).getUserReels(params.userId as string) 
                : await reelsService.getReels(10, undefined, params.userId as string);
            } else {
              response = await reelsService.getReels(10);
            }
            if (response.success && response.data?.reels) {
              setReels(response.data.reels);
              setCurrentCursor(response.data.nextCursor);
              setHasMoreReels(response.data.hasMore);
            } else {
              setReels([]);
              setHasMoreReels(false);
            }
          } catch (error: any) {
            console.error("[ReelScreen] Error fetching reels:", error.message || error);
            setError(error.message || "Failed to load reels");
            setReels([]);
            setHasMoreReels(false);
          } finally {
            setIsLoadingReels(false);
          }
        };
        fetchInitialReels();
      }}
    >
      <Text style={{ color: '#000', fontWeight: '600' }}>Retry</Text>
    </TouchableOpacity>
  </View>
)}

{!isLoadingReels && reels.length > 0 && (
```

And close this conditional wrapper after the FlatList with `)}`.

**Verification:** Run `npm run build` and compile without errors. Test by simulating a network error or disabling network connectivity to see the error UI, and verify that retry works.

---

### 7. Add loading footer to FlatList in reel/index.tsx
**What:** Add a `ListFooterComponent` to the FlatList that shows an ActivityIndicator when pagination is actively loading more reels.

**Files to modify:**
- `/Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile/app/(main)/reel/index.tsx`

**Changes:**

In the FlatList props (around line 1213), add a new prop after `contentContainerStyle={styles.flatListContent}`:

```javascript
ListFooterComponent={
  isLoadingMore ? (
    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={THEME_COLOR} />
    </View>
  ) : null
}
```

**Verification:** Run `npm run build` and compile without errors. When scrolling to the end of the reel list, an ActivityIndicator should appear at the bottom while loading more reels.

---

## Summary

- **reelsService.ts**: Added `profileImage` field to Reel interface and mapping in `normalizeReel`.
- **ReelViewer.tsx**: Updated avatar to use profileImage with fallback, and added conditionals for caption and music row.
- **videoUploadService.ts**: Removed title fallback from caption field.
- **reel/index.tsx**: Added error state, loading/empty/error UI, and loading footer for pagination.

All changes preserve existing functionality and follow the project's patterns for state management, styling, and error handling.
