# Media Game Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Games index and game-scoped galleries to Media, and route the in-game Screenshots action to that same gallery.

**Architecture:** Extend the existing media model to derive collections from the local screenshot and clip list, keyed by the exact Steam GameID string. Keep the current gallery/viewer as the sole media implementation and supply an optional game scope through `/media/grid?game=...`; add an art-backed Games index and preserve source-aware Back behavior. Change the in-game action route to open the scoped Media URL with the running game's ID.

**Tech Stack:** TypeScript, React, Decky UI, Steam client/store bindings, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-media-games-design.md`

## Global Constraints

- Keep the root Media page and its existing unfiltered entry points unchanged apart from the Games view.
- Use the same stable Steam game identity for screenshots and recordings; never merge by display name.
- Use Steam's canonical GameID string as the collection key; do not coerce 64-bit IDs to JavaScript numbers.
- Include only local screenshots and recordings; uploaded-only cloud screenshots remain outside this page.
- Keep the existing Steam fallback behavior and recording lazy-load sequence.
- A clip still opens Steam's player; existing gallery, viewer, full-screen, upload, delete, and controls continue to work.
- Device checks cover both entry paths and Back/focus behavior; do not reload while a Game Glance page or menu is open.

## Review Focus

- Malformed, absent, or unusually large `game` query values must not throw or collide with another ID; test exact string matching and safe fallback.
- Games with no resolvable title remain separate `Unknown game` collections keyed by their IDs; test duplicate and missing names.
- A collection with recordings only must render without screenshot art and preserve the Steam recording player action; test this case.
- Screenshot notification refreshes must update the existing collection or add a new one without losing collection/index focus; test both cases.
- Navigation origin differs between Games index and the in-game menu; test Back destination and restored focus for both.

---

### Task 1: Derive local game collections

**Files:**
- Modify: `src/media/mediaModel.ts`
- Test: `tests/media/mediaModel.test.ts`

**Interfaces:**
- Produces `MediaGameCollection` with `gameId: string`, `name: string`, `items: MediaItem[]`, `screenshots: number`, `recordings: number`, `newest: number`, and `artUrl: string | null`.
- Produces `gameCollections(items: MediaItem[], nameOf: (item: MediaItem) => string | null): MediaGameCollection[]`.
- Produces `itemsForGame(items: MediaItem[], gameId: string): MediaItem[]`.
- Collection key is `MediaItem.gameId` exactly; art URL is newest local screenshot URL, else `null`; counts include local media only; sort descending by newest item, stable by gameId for ties. Empty collection input returns `[]`. If name resolution is null/empty, use `Unknown game`.

- [ ] **Step 1: Add model tests** named `groups shots and clips by exact GameID string`, `keeps unknown games distinct`, `counts local screenshots and recordings`, `uses newest screenshot as art`, `orders by newest local item`, and `filters items by exact game ID`. Assert the 64-bit GameID remains a string and different IDs with identical names remain separate.
- [ ] **Step 2: Run the focused test** with `pnpm vitest run tests/media/mediaModel.test.ts`; expected: the new exports fail to resolve or assertions fail.
- [ ] **Step 3: Implement `MediaGameCollection`, `gameCollections`, and `itemsForGame`** in `src/media/mediaModel.ts`, using screenshot URL as art only when one exists.
- [ ] **Step 4: Run the focused test** with `pnpm vitest run tests/media/mediaModel.test.ts`; expected: PASS.

### Task 2: Add Games index and scoped gallery state

**Files:**
- Modify: `src/media/MediaPage.tsx`
- Modify: `src/media/mediaState.ts`
- Modify: `src/media/MediaPage.tsx` (media-specific route source includes query string)
- Modify: `src/media/mediaStyles.ts`
- Test: `tests/media/mediaPageView.test.ts`
- Test: `tests/media/mediaGate.test.ts`

**Interfaces:**
- `MediaPage` accepts the existing `openItem?: string | null` plus `gameId?: string | null`; a media-specific route source exposes `pathname + search` while the generic `routeSource` contract remains unchanged, and the parser supplies a valid exact ID or null.
- `MediaPageView` receives the existing page callbacks plus optional `view: 'all' | 'games'`, `gameId: string | null`, `games: MediaGameCollection[]`, `onOpenGame(gameId: string): void`, and `onFocusGame(gameId: string): void`.
- Four root tabs are `all`, `shots`, `clips`, and `games`. Scoped galleries show only the first three tabs and counts for the selected collection.
- The Games index is inside `/media`; opening a card navigates to `/media/grid?game=${encodeURIComponent(gameId)}`. Its title is `Games`; scoped title is `Media — ${name}`. B from a scoped gallery uses Steam history Back; this returns to Games after a Games card entry or to the in-game context after an in-game entry, while the Games card focus remains in session memory.

- [ ] **Step 1: Add view tests** named `renders Games as fourth root tab`, `renders art-backed game cards with separate counts`, `shows Unknown game and fallback art`, `renders scoped title and scoped tab counts`, and `shows Games empty state`. Assert L1/R1 tab controls remain represented through the shared `Tabs` component.
- [ ] **Step 2: Run the focused view test** with `pnpm vitest run tests/media/mediaPageView.test.ts`; expected: new props and Games view assertions fail.
- [ ] **Step 3: Add component states** for Games index and scoped gallery in `MediaPage.tsx`, reusing the existing `MediaPageView` gallery, Tabs, tiles, and viewer. Add card focus retention and use `gameCollections` and `itemsForGame` from Task 1.
- [ ] **Step 4: Add a Media-specific route source that exposes Steam history `pathname + search` without changing generic `routeSource`, then add query parsing and source-aware state** in `mediaState.ts`; validate non-empty bounded decimal Steam IDs without converting them to Number. Preserve collection card focus in session memory; use `Navigation.NavigateBack()` for both origins because Steam history distinguishes the source route.
- [ ] **Step 5: Add styles** in `mediaStyles.ts` for wide art-backed game cards, name/count placement, fallback surface, and Games empty state, following existing PageKit and Navigate visual treatment.
- [ ] **Step 6: Add gate tests** named `parses the game query from /media/grid`, `rejects malformed game query without breaking root Media`, and `keeps native fallback when Steam media cannot load`. Assert root `/media` and `/media/grid` without `game` remain unfiltered.
- [ ] **Step 7: Run focused tests** with `pnpm vitest run tests/media/mediaPageView.test.ts tests/media/mediaGate.test.ts`; expected: PASS.

### Task 3: Route in-game Screenshots to the shared scoped gallery

**Files:**
- Modify: `src/menu/steam/routes.ts`
- Modify: `src/menu/components/InGamePanel.tsx`
- Test: `tests/menu/routes.test.ts`
- Test: `tests/menu/inGame.test.ts`

**Interfaces:**
- Keep the existing `game-action` request shape and `recordings` action ID so `InGamePanel` continues to use the established handoff path.
- Map `recordings` to `/media/grid?game=${encodeURIComponent(request.gameId)}` using the canonical `gameId` string. Other game actions retain their current Steam routes.
- Label the tile `Screenshots` and describe it as `Screenshots and recordings`.

- [ ] **Step 1: Add route tests** named `opens the shared scoped Media gallery for the running game` and `encodes the GameID query without numeric coercion`. Assert a 64-bit ID is preserved exactly and other action paths are unchanged.
- [ ] **Step 2: Run the focused route test** with `pnpm vitest run tests/menu/routes.test.ts`; expected: the recordings route assertion fails against the current Steam overlay route.
- [ ] **Step 3: Update the recordings action route** in `routes.ts` to `/media/grid?game=...`, retaining existing validation and menu close behavior.
- [ ] **Step 4: Update the menu subtitle** in `InGamePanel.tsx` to `Screenshots and recordings` and keep the action's existing ID.
- [ ] **Step 5: Run focused tests** with `pnpm vitest run tests/menu/routes.test.ts tests/menu/inGame.test.ts`; expected: PASS.

### Task 4: Preserve refresh, fallback, and navigation behavior

**Files:**
- Modify: `src/media/MediaPage.tsx`
- Modify: `src/media/mediaState.ts`
- Test: `tests/media/mediaGate.test.ts`
- Test: `tests/media/mediaPageView.test.ts`

**Interfaces:**
- Keep `MediaBindings.list()` and `onNewShot()` unchanged; recompute collections from the refreshed local media list.
- Clip opening, shot viewer/full-screen paths, upload/delete behavior, and native fallback remain the existing implementations.

- [ ] **Step 1: Add state/navigation tests** named `new screenshot updates the scoped collection`, `new screenshot adds a game while Games is open`, `Back from Games collection restores selected card`, and `Back from in-game scoped Media follows Steam history`.
- [ ] **Step 2: Run the focused tests** with `pnpm vitest run tests/media/mediaGate.test.ts tests/media/mediaPageView.test.ts`; expected: refresh and source-aware Back assertions fail until wired.
- [ ] **Step 3: Recompute and render collections after every existing list refresh**, retaining a stable selected gameId and returning focus to the selected card when scope closes.
- [ ] **Step 4: Run the focused tests** with `pnpm vitest run tests/media/mediaGate.test.ts tests/media/mediaPageView.test.ts`; expected: PASS.

### Task 5: Review and device acceptance

**Files:**
- Review: all files from Tasks 1–4

- [ ] **Step 1: Run targeted Media and route tests** with `pnpm vitest run tests/media tests/menu/routes.test.ts tests/menu/inGame.test.ts`; expected: PASS.
- [ ] **Step 2: Run typecheck/build command** from the repository package scripts; expected: no TypeScript or bundling errors.
- [ ] **Step 3: Review the diff** for exact string GameID handling, scoped query safety, existing root Media behavior, focus restoration, Steam fallback, and unchanged clip player routing.
- [ ] **Step 4: On PS5, browse Games, open Signalis, verify name/items/counts, then B back to Games and the selected card. Open Screenshots from the in-game menu, verify the same collection, and B back to the originating in-game context. Check recordings if available.**
- [ ] **Step 5: Recheck the Games tab and scoped gallery show the L1/R1 bumpers, and verify screenshot capture refreshes the game count/card.**

#### Recorded validation — 2026-11-19

- Focused Media and in-game route tests: 8 files, 127 tests passed; TypeScript check and Rollup build passed.
- PlayStation frontend SHA-256: `d98c77b568a7ba4a34a8210f42888100cb075f530eae5402d65f0efefc6a0f6c`, matching local `dist/index.js` and installed `dist/index.js`.
- Device flow: Games index showed three collections; A opened Signalis with two local screenshots; R1 changed to Screenshots; B returned to Games with Signalis focused. L1/R1 indicators remained visible.
- Not exercised on device: Screenshots action from a running game's in-game menu (route contract covered by automated tests), clip playback (no local recordings on device), and screenshot-capture refresh.
- Previous frontends are backed up on the PS5 in `/var/home/ps5/gg-media-games-backup-20261119-QuyJQB/` and `/var/home/ps5/gg-media-games-backup-20261119-3Ex4hw/`.
