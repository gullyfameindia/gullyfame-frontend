# Wallet, History & Reels Integration

> **Historical record (note added 2026-11-18):** this is a past AI task plan, review or spec, kept for reference. File paths, statuses and verdicts describe the code at the time and may no longer match it. Current status: `PRODUCTION_READINESS_REPORT.md` at the workspace root.

Real API data now drives the ReelsScreen, coins wallet shows transaction history with an Add Money button, and insufficient balance redirects users to add funds.

The three screens are now integrated: ReelsScreen displays real creator names and engagement metrics, requests proper creator IDs for support, and the wallet screen provides a clear entry point for adding coins. The insufficient-balance flow properly redirects to wallet for top-ups. One navigation issue remains: the button routes to the wrong screen when coins run out.

**Watch for:** Navigation target mismatch in TipPopup's insufficient coins handler routes to history instead of coins screen.

**Verdict**: CHANGES_REQUESTED

## High-level view

ReelsScreen now consumes the production Reel API shape, displaying real username, comment count, and share count directly from backend data instead of hardcoded placeholders. The video source was corrected to use `item.video?.uri` which aligns with the Reel type definition. Follow/unfollow state management works against the backend, toggling off-screen state and handling errors gracefully. The TipPopup receives the creator's user ID for support transactions. 

The coins screen adds a prominent call-to-action button inside the balance card, styled with a gradient and positioned above the withdraw button. It navigates to the add-money flow. The add-money button in the insufficient-coins modal uses the wrong route target (history instead of coins), breaking the workflow that should show the wallet screen to users who need to top up.

<details>
<summary>Issues (1)</summary>

1. **Wrong navigation on insufficient coins** — TipPopup's `handleBuyCoins` routes to `/(main)/history` but should route to `/(main)/coins` to show the wallet balance card and Add Money button to the user.

</details>

<details>
<summary>Details</summary>

### ReelsScreen data binding

The three screens now use real backend data instead of placeholders. The Reel type defines `username`, `comments`, `shares` as top-level fields, and the renderItem function correctly maps them:

- Username displays via `item.username || 'Unknown'`
- Comment count via `item.comments || 0`
- Share count via `item.shares || 0`

These come directly from the normalized Reel object returned by `getReels()`, so they reflect actual engagement metrics. Video source was corrected from the pre-existing `item.videoUrl` pattern to `item.video?.uri`, which matches the Reel type definition. The nearness check gates rendering to avoid loading videos off-screen.

### Follow/unfollow state management

Follow state is initialized on load from `reel.isFollowed` and stored in a reelId-keyed map. The toggle handler calls `userService.toggleFollowUser(creatorId)` with the creator's ID and updates local state on success. Errors surface via Alert. The follow button text reflects state with "Following" or "Follow" and applies conditional styling (gold background when following, borderline outline when already following).

### Support flow creator identification

TipPopup now receives both `reelId` and `creatorId` to properly identify the recipient. The handler parses reelId to a number and stashes both values before showing the modal. This enables the backend to route coins correctly. The creatorId is passed to TipPopup as `item.userId` from the Reel object.

### Add Money button in wallet

The coins screen places a prominent Add Money button inside the balance card gradient. It's styled with an orange-to-orange gradient, shadow, and responsive sizing. Tapping it navigates to `/(main)/add-money` with a `fromCoins` parameter to signal the origin. The button sits above the withdraw button, making it discoverable as the primary action for users with insufficient balance.

### Insufficient coins modal navigation issue

When a participant tries to support without enough coins, TipPopup shows an insufficient-coins modal with "Add Money" and "Cancel" buttons. The "Add Money" button's `handleBuyCoins` function sets `router.push('/(main)/history')`. This should be `router.push('/(main)/coins')` so users land on the wallet screen where they can see their balance and use the prominent Add Money button. History is transaction detail, not the payment entry point. Confirmed by examining the directory structure: both `/coins` and `/history` exist as separate routes.

</details>

## File map

<details>
<summary>Changed files</summary>

- **ReelsScreen.tsx** — Binds UI to real Reel fields (username, comments, shares), corrects video source to `item.video?.uri`, passes creator ID to support modal, implements functional follow/unfollow with backend toggle.
- **TipComponents.tsx** — Adds insufficient-coins modal with "Add Money" button; navigation currently routes to wrong screen (`/(main)/history` instead of `/(main)/coins`).
- **coins.tsx** — Adds prominent Add Money button inside balance card gradient, navigates to add-money flow, displays real transaction history from backend.

See full diff: `git diff <base-branch>`

</details>
