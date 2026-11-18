# Implementation Plan: Wallet & Reels Screen Fixes

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview
Fix the Reels screen to display real data from the backend, implement follow/unfollow functionality, add an insufficient funds popup that navigates to the coins screen, and enhance the coins screen with a prominent "Add Money" button.

## Key Design Decisions

### 1. Follow/Unfollow Implementation
**Decision:** Create a new `toggleFollowUser(userId: string)` function in `userService.ts` that POSTs to `users/{userId}/follow`. The reelsService already returns `isFollowed` per reel, and the endpoint exists in the enum (`FOLLOW.FOLLOW_USER: "user/:userId/follow"`).

**Rationale:** Following a user is fundamentally a user action and belongs in userService. This keeps social operations centralized. The endpoint is already defined; we just need to wrap it.

### 2. Insufficient Funds Navigation
**Decision:** When `handleBuyCoins` is called in TipPopup and the user has insufficient coins, use `router.push("/(main)/coins")` to navigate to the coins wallet screen instead of showing an alert.

**Rationale:** The coins screen already has `handleAddMoney()` which routes to `/(main)/add-money`. This gives users a clear path: insufficient coins → wallet screen → add money CTA.

### 3. Reel Data Mapping Fix
**Decision:** The reelsService normalizes backend data to a `Reel` interface with fields: `id`, `userId`, `username`, `caption`, `comments`, `shares`, `isFollowed`, `_backendId`, `videoUrl`. ReelsScreen currently imports an old types file and accesses `item.user.username`. Update ReelsScreen to use the normalized fields directly and remove the old types import.

**Rationale:** The backend returns normalized reels; the screen should use them as-is. The old type definition is obsolete and causes type mismatches.

### 4. Pass Creator ID to TipPopup
**Decision:** Pass `item.userId` as `creatorId` prop to TipPopup in ReelsScreen's renderItem.

**Rationale:** TipPopup already accepts `creatorId` parameter and uses it in `sendSupportPayment()`. The reel's `userId` is the creator.

### 5. Coins Screen "Add Money" Button
**Decision:** Add a new button inside the `balanceGradient` card below the Withdraw button, using the same orange gradient style as the bottom `addCoinsButton`, with text "+ Add GFI Coins".

**Rationale:** Places the CTA above-the-fold without scrolling, matching common e-commerce patterns (primary action in header/card). The button should trigger the same `handleAddMoney()` handler.

---

## Implementation Steps

### Step 1: Add Follow/Unfollow Function to UserService
Add a new async function to handle toggling follow state with the backend.
- **Files:** `src/api/services/userService.ts`
- **What to do:** Add `toggleFollowUser(userId: string): Promise<ApiResponse<any>>` function that POSTs to `user/{userId}/follow` using the replaceParams helper to inject userId. Handle 200/201 success responses.
- **Verify:** No build errors; the function signature and error handling follow the pattern of other userService functions.

### Step 2: Fix ReelsScreen Data Usage
Update ReelsScreen to use real normalized reel data fields instead of hardcoded/incorrect paths.
- **Files:** `src/screens/ReelsScreen.tsx`
- **What to do:**
  1. Remove import of old type file: `import type { Reel } from '../types/reels'`
  2. Import the correct `Reel` interface from `reelsService` (the normalized type)
  3. In `renderItem`:
     - Change `item.user.username` → `item.username`
     - Change hardcoded counts `45` → `item.comments`
     - Change hardcoded count `23` → `item.shares`
     - Add state tracking for follow button per reel (local state with `isFollowed` initialized from `item.isFollowed`)
     - Pass `item.userId` as `creatorId` to TipPopup
  4. Make Follow button functional: add `useState` for per-reel follow state, call `toggleFollowUser(item.userId)` on press, update local state on success
- **Verify:** Screen renders without type errors; comments and shares counts match real data; follow button text updates on press.

### Step 3: Add Insufficient Funds Navigation to TipComponents
Update the `handleBuyCoins` function to navigate to coins screen instead of alert.
- **Files:** `src/components/tip/TipComponents.tsx`
- **What to do:**
  1. Import `router` from `expo-router` at top of file
  2. In `handleBuyCoins()` function, replace `Alert.alert('Buy Coins', ...)` with `router.push("/(main)/coins")` and close the modal: `setShowInsufficientCoins(false); onClose();`
- **Verify:** Insufficient coins modal closes and navigates to coins screen; no error in console.

### Step 4: Pass CreatorId to TipPopup in ReelsScreen
Ensure TipPopup receives the creator user ID for backend payment processing.
- **Files:** `src/screens/ReelsScreen.tsx`
- **What to do:** In renderItem, pass `creatorId={item.userId}` to the `<TipPopup>` component alongside existing props.
- **Verify:** No TypeScript errors; TipPopup prop accepts the value.

### Step 5: Add "Add Money" Button Inside Coins Card
Add a prominent CTA button inside the balance card gradient to reduce scroll friction.
- **Files:** `app/(main)/coins.tsx`
- **What to do:**
  1. Inside the `balanceGradient` LinearGradient, after the Withdraw button (or beside it in a row), add a new TouchableOpacity button with:
     - Text: "+ Add GFI Coins"
     - `onPress={() => handleAddMoney()}`
     - Style: orange gradient background matching `addCoinsButton` style (use `LinearGradient` with colors `["#FF6B35", "#FF8C00"]`)
     - Make it responsive: position below Withdraw or in a column layout if space is tight
  2. Keep the existing bottom `addCoinsButton` for secondary access
- **Verify:** Button renders inside card, is tappable, navigates to add-money screen on press; layout does not break on small screens.

### Step 6: Integration Testing
Verify all features work together end-to-end.
- **Files:** N/A (manual verification)
- **What to do:**
  1. Open ReelsScreen and verify reels display with correct data (real comments/shares counts, creator usernames)
  2. Tap Follow button on a reel → verify button text toggles and API is called (check console logs)
  3. Tap Support button with insufficient coins → verify insufficient coins modal shows and "Buy Coins" button navigates to coins screen
  4. On coins screen, verify balance card displays correctly and "+ Add GFI Coins" button is visible without scrolling
  5. Tap "+ Add GFI Coins" → verify navigation to add-money screen
- **Verify:** All features work as described; no console errors; navigation flows are smooth.

---

## Testing & Build Verification

Run the build and relevant tests to ensure no regressions:
```bash
cd /Users/dhruvkathuria/Gullyfame.com/Gullyfame/apps/gully-fame-mobile
npm run build      # or your build command
npm run test       # if tests exist
```

Key areas to manually verify:
- ReelsScreen renders without crashes
- Follow button toggles state locally and calls API
- TipPopup navigation to coins screen works
- Coins screen layout is correct
- No TypeScript compilation errors
