# Implementation Plan: Insufficient Balance Check for Support Creator Feature

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

## Overview
Add a pre-modal balance check that displays an "Insufficient Balance" popup before opening SupportModal when users tap the Support button. If balance is insufficient, the user can navigate to the wallet to add funds.

## Design Decisions

### Decision 1: Check balance BEFORE opening modal (not replacing existing check)
**Rationale**: The existing balance check in SupportModal acts as a fallback. Adding a pre-modal check provides immediate feedback at the button press, improving UX. The existing check remains as a safety net for edge cases (balance changed between checks). This is non-destructive and maintains backward compatibility.

### Decision 2: Minimum balance requirement = 1 coin
**Rationale**: Based on the user's request and code review showing support packages start at 5 coins, a minimum of 1 coin allows the modal to open for any user who has started earning. The SupportModal's balance check will still prevent sending if insufficient.

### Decision 3: Create an "Insufficient Balance" popup (Alert) at button press
**Rationale**: Uses React Native's Alert (consistent with existing code in SupportModal and reel screen). Offers two actions: "Add Funds" → navigate to '/(main)/coins' page (per user request for "Wallet & History page"), "Cancel" → dismiss. Simple and non-intrusive.

### Decision 4: Navigate to '/(main)/coins' not a wallet-specific route
**Rationale**: User requested "wallet & history page". The codebase shows coins.tsx is the wallet interface where users can view balance, transaction history, add coins, and withdraw. This is more complete than a non-existent /wallet route.

### Decision 5: Add loading state while fetching balance
**Rationale**: Network requests are async; a brief loading indicator prevents double-taps and communicates feedback to the user.

---

## Implementation Plan

- [ ] 1. Create `useWalletBalance` hook in `src/hooks/useWalletBalance.ts`.
      Custom hook to fetch and cache wallet balance with loading state. Reusable for other features.
      Files: `src/hooks/useWalletBalance.ts`
      Verify: Hook exports `useWalletBalance` function with correct TypeScript types.

- [ ] 2. Create `InsufficientBalanceModal` component in `src/components/modals/InsufficientBalanceModal/InsufficientBalanceModal.tsx`.
      Reusable popup modal showing "Insufficient Balance" message with "Add Funds" and "Cancel" buttons. Handles navigation to coins page.
      Files: `src/components/modals/InsufficientBalanceModal/InsufficientBalanceModal.tsx`
      Verify: Component renders correctly and navigation calls work (use React Navigation testing or manual inspection).

- [ ] 3. Modify Support button handler in reel screen at line ~1113 in `app/(main)/reel/index.tsx`.
      Replace the direct `setTipModalVisible(true)` call with a new handler that: (a) shows loading indicator, (b) fetches balance, (c) checks if balance >= 1, (d) if insufficient, shows InsufficientBalanceModal, (e) if sufficient, opens SupportModal.
      Files: `app/(main)/reel/index.tsx` (Support button TouchableOpacity handler, around line 1113–1116)
      Verify: Manual test—tap Support button with 0 balance → see popup. Tap "Add Funds" → navigate to coins page. Tap "Cancel" → dismiss. Tap with sufficient balance → SupportModal opens.

- [ ] 4. Keep existing balance check in SupportModal intact.
      No changes to `src/components/modals/SupportModal/SupportModal.tsx`. The existing `handleSendSupport` function (lines 68–107) already checks `if (supportAmount > walletBalance)` and shows an alert. This remains as a fallback in case balance changes between checks.
      Files: `src/components/modals/SupportModal/SupportModal.tsx` (no changes)
      Verify: Existing SupportModal tests pass (if any). Manual test—if somehow balance drops after modal opens, existing check prevents sending.

---

## Testing Strategy

**Manual Testing**:
1. User with 0 balance taps Support → Insufficient popup → "Add Funds" → navigates to coins page ✓
2. User with 0 balance → "Cancel" → modal dismisses ✓
3. User with sufficient balance (e.g., 10 coins) taps Support → SupportModal opens ✓
4. Inside SupportModal, attempt to send more than balance → existing fallback alert triggers ✓
5. Close and reopen reel screen multiple times → balance fetches correctly each time ✓

---

## Files to Create/Modify

**Create**:
- `src/hooks/useWalletBalance.ts` — Custom hook for balance fetching
- `src/components/modals/InsufficientBalanceModal/InsufficientBalanceModal.tsx` — Popup component

**Modify**:
- `app/(main)/reel/index.tsx` — Support button handler only (around line 1113)

**No Changes**:
- `src/components/modals/SupportModal/SupportModal.tsx` — Existing fallback check remains

---

## Dependencies & Notes

- Hook will use `userService.getWalletBalance()` (already exists in `src/api/services/userService.ts`)
- Navigation to coins page uses Expo Router: `router.push("/(main)/coins" as any)`
- InsufficientBalanceModal uses React Native Alert API (built-in, no extra dependency)
- Maintain existing state variables (`tipModalVisible`, `currentTipReelId`, `currentTipCreatorId`) in reel screen

