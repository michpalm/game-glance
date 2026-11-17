# Console-like settings, Part 2: Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Storage screen of Game Glance's own, opened from a ninth Navigate tile, where the player sees each drive's free space and the games on it (biggest first), and uninstalls (Y), moves (X) or opens (A) the focused game.

**Architecture:** One adapter (`src/menu/steam/storage.ts`) turns `SteamClient.InstallFolder` into a plain snapshot plus three commands, and a pure model (`src/storage/storageModel.ts`) turns that snapshot into cards, rows, footer actions and copy. The screen is Game Glance's first own route (`routerHook.addRoute('/game-glance/storage', …)`); the chrome host already draws the status bar and footer on every page. Controller buttons go through `DialogButton`'s own `onSecondaryButton` / `onOptionsButton` and their action descriptions, so Steam's footer shows the hints and no button is added to the list (Michael's pick C).

**Tech Stack:** TypeScript, React (Decky, `@decky/api` `routerHook`, `@decky/ui`), vitest. No backend change.

**Spec:** `docs/superpowers/specs/2026-11-13-console-settings-design.md` (Part 2 — Storage, Constraints, Order, Left to the builder). Mock-ups: `~/Documents/Claude/Bazzite/settings-mockups/round-4-storage/` (C, D, E) and `round-2/5-storage.png`, `round-2/4-navigate.png`.

## Global Constraints

- **Steam's interfaces (names seen on the Ally 2026-11-13, never exercised):** `SteamClient.InstallFolder.GetInstallFolders`, `RegisterForInstallFolderChanges`, `MoveInstallFolderForApp`, `RegisterForMoveContentProgress`, `CancelMove`; `SteamClient.Installs.OpenUninstallWizard`. Field names and argument shapes below are the expected ones; **Task 1 confirms them read-only in sp.js** and any difference is a ledgered ruling that Task 2 follows.
- Device probes are read-only: grep `~/.local/share/Steam/steamui/sp.js` first; never call a Steam function this plan does not list. Real uninstalls and moves happen only in Task 6, with Michael, on games he names.
- A missing interface hides the feature: no `GetInstallFolders` → no Storage tile; a missing command → no hint for that button. It never throws into the menu or the page.
- Drive labels and folder paths are never logged.
- Copy (spec and mock-ups, exact): page title `Storage`; eyebrow `On the internal drive · biggest first` / `On <drive name> · biggest first`; card `<N> GB free`, `<used> of <total> GB used · <n> games` (`1 game`); internal drive name `Internal drive`; SD card `SD card` or `SD card · <label>`; empty drive `No games on this drive`; hints `A Game page`, `X Move to <drive name>`, `Y Uninstall`, `X Cancel move`; running game status `Running now · Close the game first`; tile `Storage`.
- Buttons: A = `GamepadButton.OK`, B = `CANCEL`, X = `SECONDARY`, Y = `OPTIONS` (`@decky/ui` `FooterLegend`). Task 6 confirms on the device that X and Y land as drawn.
- Navigate: Storage is the ninth tile, starting a **third row** after Power (Michael, 2026-11-16).
- Over a game the tile leaves the game view for the page, as Downloads does (`closesSteamMenu` is already true for every `navigate` but power).
- Handheld and docked; Ally first, then the Steam Deck before any release.
- No per-task commits: Michael commits on his word. Identity `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"`; never push.
- Base: the working tree as it is (Part 1 uncommitted). Record the baseline first: `npx vitest run` count and `npx tsc --noEmit -p .` clean.

## Review Focus

1. **Steam's InstallFolder is missing, or `GetInstallFolders` rejects or returns junk** (older Steam on the Deck, Desktop mode): no tile; a page reached anyway shows `Storage is unavailable.` and B still leaves. → Task 2 (`available` false on every failure), Task 5 (tile hidden).
2. **A drive goes away** (SD card pulled, unmounted folder): its card disappears, a picked drive that vanished falls back to the first drive, and it is never offered as a move target. → Task 2 (unmounted folders dropped), Task 3 (`pickDrive` fallback, targets).
3. **The list changes under the cursor** (the uninstalled game vanishes, a moved game leaves the drive): focus goes to the row now in its place, else the one above, else the drive card, never to the top of the page. → Task 3 (`nextGameFocus`), Task 4 (applied on change).
4. **A move ends badly** (cancelled, Steam's error result, progress stops arriving): the row returns to normal with `Couldn't move <game>.` (not on cancel), and X is offered again. → Task 2 (`move` state cleared on result), Task 3 (status copy).
5. **Leaving the page mid-move** (B, Home, plugin unload): Steam's move continues, our callbacks are unregistered, and coming back shows the progress again from Steam's next report. → Task 2 (subscribe/unsubscribe), Task 4 (unmount).

---

### Task 1: Read-only check of Steam's storage interface

**Files:** none in the repo. Ledger: `.superpowers/sdd/2026-11-16-console-settings-part2-storage/progress.md`.

- [ ] **Step 1:** On the Ally (`ssh ally`), grep sp.js around each name and note how Steam's own Storage page calls it:
  `grep -o '.\{0,200\}GetInstallFolders.\{0,300\}' ~/.local/share/Steam/steamui/sp.js | head`, the same for `MoveInstallFolderForApp`, `RegisterForMoveContentProgress`, `RegisterForInstallFolderChanges`, `CancelMove`, `OpenUninstallWizard`, and for the field names below.
- [ ] **Step 2:** Ledger one line per item, `Task 1: confirmed <name>` or `Task 1: Ruling: <expected> is really <found> — Task 2 uses <found>`:
  - folder: `nFolderIndex`, `strFolderPath`, `strUserLabel`, `strDriveName`, `nCapacity`, `nFreeSpace`, `bIsDefaultFolder`, `bIsMounted`, `bIsFixed`, `vecApps`; app: `nAppID`, `strAppName`, `rtLastPlayed`, `strUsedSize`, `strDLCSize` (numbers may be strings);
  - `MoveInstallFolderForApp(appId, folderIndex)`; `CancelMove()`; `RegisterForMoveContentProgress(cb)` with `{ appid, eResult, strBytesToMove, strTotalBytesMoved, strTimeRemaining? }`; both `RegisterFor…` return `{ unregister() }`;
  - `OpenUninstallWizard(appIds: number[], bDontPrompt: boolean)`: Steam's confirmation shows when the flag is `false`;
  - how sp.js tells an SD card (`bIsFixed` false, or `strFolderPath` under `/run/media/`).
- [ ] **Step 3:** Only if sp.js shows Steam's Storage page calling `GetInstallFolders()` with no arguments, call it once from `SharedJSContext` and return **counts and field names only** (folders, apps per folder, `Object.keys` of one folder and one app), never labels or paths. Ledger the result.
- [ ] **Step 4:** Repeat Steps 1–3 on the Steam Deck when it is reachable; a missing name there is a ruling (hidden on the Deck).

Expected: every name confirmed or ruled. Task 2 does not start before this.

### Task 2: The storage adapter

**Files:** Create `src/menu/steam/storage.ts`; Test `tests/menu/storage.test.ts`.

**Interfaces — Produces:**
```ts
export interface StorageGame { appId: number; name: string; bytes: number; /** unix seconds, 0 = never */ lastPlayed: number }
export interface StorageDrive { index: number; name: string; kind: 'internal' | 'sd' | 'other'; freeBytes: number; capacityBytes: number;
    /** Biggest first, then name. */ games: StorageGame[] }
export interface StorageMove { appId: number; toIndex: number; movedBytes: number; totalBytes: number; secondsLeft: number | null }
export interface StorageSnapshot { available: boolean; drives: StorageDrive[]; move: StorageMove | null; runningAppId: number | null;
    /** The last move that ended in an error, until the next move starts. */ failedMove: number | null }
export type MoveStart = 'started' | 'busy' | 'running' | 'no-space' | 'failed';
export interface StorageBindings {
    read(): StorageSnapshot; subscribe(listener: Stop): Stop;
    uninstall(appId: number): boolean; move(appId: number, toIndex: number): Promise<MoveStart>; cancelMove(): void;
}
export function createStorageBindings(steam: unknown, ui: unknown): StorageBindings; // steam = SteamClient, ui = SteamUIStore
export function storageAvailable(steam: unknown): boolean; // GetInstallFolders is a function
```

- [ ] **Step 1: Failing tests** (fake `SteamClient` / `SteamUIStore` objects):
  - `read()` before the first load, with no `InstallFolder`, with `GetInstallFolders` throwing or rejecting, or returning a non-array → `available: false`, `drives: []`; no throw.
  - A folder maps to a drive: `index` = `nFolderIndex`; numbers parsed from strings; `bIsMounted === false` folders are left out; `kind` = `internal` for `bIsDefaultFolder` on a fixed drive, `sd` for the SD card rule Task 1 confirmed, else `other`; `name` = `Internal drive`, `SD card` / `SD card · <strUserLabel>`, else `strUserLabel` or the last path segment.
  - Games: `bytes` = used + DLC size; sorted by `bytes` descending then `name`; `lastPlayed` from `rtLastPlayed`.
  - `runningAppId` = `SteamUIStore.MainRunningAppID` when a positive integer, else null.
  - `subscribe` registers both Steam callbacks once for any number of listeners, reloads folders on a folder change, and unregisters both when the last listener leaves.
  - Progress for the moving app sets `move`; an `eResult` of 1 with moved = total, or a folder change that shows the app on the target, clears it; any other final `eResult` clears it and sets `failedMove`; a cancel clears it without `failedMove`.
  - `move()` returns `running` for the running game, `busy` while a move is set, `no-space` when the target's `freeBytes` < the game's `bytes`, `failed` when the call throws or the target is unknown, else calls `MoveInstallFolderForApp(appId, toIndex)` and returns `started`.
  - `uninstall()` returns false for the running game or a missing method, else calls `OpenUninstallWizard([appId], false)` and returns true. The row disappears only when Steam reports the folder change.
  - No log line contains a path or label (spy on `console`).
- [ ] **Step 2:** `npx vitest run tests/menu/storage.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement. Like `wifi.ts`: `read()` returns the same object while nothing changed (React's `useSyncExternalStore`); every Steam call guarded.
- [ ] **Step 4:** Same command → PASS; `npx tsc --noEmit -p .` clean.

### Task 3: The page model

**Files:** Create `src/storage/storageModel.ts`; Test `tests/storage/storageModel.test.ts`.

**Interfaces — Consumes:** Task 2's types. **Produces:**
```ts
export interface DriveCard { index: number; name: string; kind: StorageDrive['kind']; free: string; line: string; usedRatio: number; moving: string | null }
export type GameButton = { label: string; run: 'page' | 'move' | 'pick-drive' | 'cancel' | 'uninstall' };
export interface GameRow { appId: number; name: string; status: string; size: string; progress: number | null;
    a: GameButton; x: GameButton | null; y: GameButton | null }
export interface StorageView { cards: DriveCard[]; picked: number | null; eyebrow: string; rows: GameRow[]; empty: string | null; note: string | null }
export function storageView(snapshot: StorageSnapshot, picked: number | null, now: number, note: string | null): StorageView;
export function lastPlayedText(lastPlayed: number, now: number): string;
export function sizeText(bytes: number): string;
export function nextGameFocus(before: number[], after: number[], was: number | null): number | null;
export function refusal(result: MoveStart, game: StorageGame, target: StorageDrive): string | null;
```

- [ ] **Step 1: Failing tests:**
  - `lastPlayedText` (now fixed): 0 → `Not played yet`; same day → `Played today`; 1 day → `Played yesterday`; 2–6 → `Played 4 days ago`; 7–13 → `Played last week`; 14–59 → `Played 3 weeks ago`; 60+ → `Played 2 months ago`; over a year → `Played over a year ago`.
  - `sizeText`: `65.0 GB` (one decimal, GB = 10^9, as Steam shows), below 1 GB `850 MB`.
  - Card: free `111` (whole GB), line `354 of 465 GB used · 24 games` / `· 1 game`, `usedRatio` 0–1; while a move runs the source reads `Moving out · 24.1 of 39.6 GB` and the target `Moving in · 15.5 GB to go`.
  - `picked` null or gone → the first drive; eyebrow `On the internal drive · biggest first` for internal, `On <name> · biggest first` otherwise; an empty drive → `rows: []`, `empty: 'No games on this drive'`.
  - Row buttons: a normal game → `a` `Game page`, `x` `Move to SD card` (`move`) when exactly one other drive, `Move to…` (`pick-drive`) with two or more, null with none; `y` `Uninstall`. The running game → status `Running now · Close the game first`, `x` and `y` null. The moving game → status `Moving to SD card · 61% · about 2 min left` (no time part when unknown), `progress` 0.61, `x` `Cancel move` (`cancel`), `y` null. Other games while a move runs → `x` null (one move at a time), `y` kept. The `failedMove` game → status `Couldn't move <name>.`
  - `refusal`: `no-space` → `Not enough space on SD card: needs 39.6 GB, 12.0 GB free.`; `busy` → `One move at a time.`; `running` → `Close the game first.`; `failed` → `Couldn't move <name>.`; `started` → null.
  - `nextGameFocus`: same id kept; gone → the id now at its index, else the last one, else null (as `nextFocusKey` in `wifiPage.ts`).
- [ ] **Step 2:** `npx vitest run tests/storage/storageModel.test.ts` → FAIL.
- [ ] **Step 3:** Implement; pure, no React, no Steam.
- [ ] **Step 4:** Same command → PASS.

### Task 4: The Storage page and its route

**Files:** Create `src/storage/StoragePage.tsx`, `src/storage/storageStyles.ts`; Modify `src/index.tsx` (add the route and its removal next to the global components); Test `tests/storage/storagePageView.test.ts`.

**Interfaces — Consumes:** Tasks 2 and 3. **Produces:** `export const STORAGE_ROUTE = '/game-glance/storage'`; `StoragePageView` (stateless) and `StoragePage` (hooks), split as `WifiPageView` / `WifiPage` are so tests can call the view as a function.

- [ ] **Step 1: Failing tests** (call `StoragePageView` with a built `StorageView`):
  - Title `Storage`; one card per drive with `data-gg-focus="storage:drive:<index>"`, the picked one marked; the eyebrow; one row per game with `data-gg-focus="storage:game:<appId>"`.
  - Each row is one `DialogButton` whose props carry `onOKActionDescription` = `a.label`, `onSecondaryActionDescription` = `x.label` and `onOptionsActionDescription` = `y.label` only when present, and `onSecondaryButton` / `onOptionsButton` only when present (no button for a null action).
  - A moving row draws its progress bar at `progress`; the empty line and the note line (`role="status"`) render when set; `available: false` renders only `Storage is unavailable.`
  - Art is an `<img>` from `landscapeUrls(appId, browserStores)[0]` with a plain block when there is none.
- [ ] **Step 2:** `npx vitest run tests/storage/storagePageView.test.ts` → FAIL.
- [ ] **Step 3:** Implement `StoragePageView` to the round-4 mock-up C (drives column 520 px at left, list to its right, sizes at the row's end; behind the page, the hero (`heroUrls(appId, browserStores)[0]`) of the most recently played installed game, blurred and dimmed like the round-2 mock-up, else the plain page colour; styles in `storageStyles.ts` on the menu tokens, injected with `<style>`). Then `StoragePage`:
  - `useSyncExternalStore` on the bindings (built once with `createStorageBindings(SteamClient, SteamUIStore)`); `picked` follows the focused drive card (focus picks, as the spec says up/down picks a drive); left/right moves between the two columns (`flow-children="row"` around two `flow-children="column"` groups).
  - A on a row navigates to `/library/app/<appId>`; X runs `move` / opens Steam's `showContextMenu(<Menu label="Move to">…)` for `pick-drive` with one `MenuItem` per other mounted drive / `cancelMove`; Y runs `uninstall`. A `refusal` sets the note for 4 s.
  - When rows change, apply `nextGameFocus` only if focus was lost (the `lostFocusKey` rule from `wifiPage.ts`).
  - Initial focus: the first game row, else the picked drive card.
- [ ] **Step 4:** In `src/index.tsx`, `routerHook.addRoute(STORAGE_ROUTE, StoragePage)` with `routerHook.removeRoute(STORAGE_ROUTE)` in the same unload list as the global components.
- [ ] **Step 5:** Test command → PASS; `npx vitest run` all green; `npx tsc --noEmit -p .` clean; `npm run build` exit 0.

### Task 5: The Navigate tile

**Files:** Modify `src/menu/components/NavigatePanel.tsx`, `src/menu/steam/runtime.ts` (`NavigateDestination` gains `'storage'`), `src/menu/steam/routes.ts`; Test `tests/menu/navigatePanel.test.ts`, `tests/menu/routes.test.ts`.

**Interfaces — Consumes:** `STORAGE_ROUTE`, `storageAvailable` (Task 2, 4). **Produces:** `NavigatePanel({ handoff, openGameGlance, storage }: { …; storage: boolean })`.

- [ ] **Step 1: Failing tests:**
  - With `storage: true` the grid has nine tiles in this order: Home, Library, Store, Media, Downloads, Settings, Game Glance, Power, **Storage** (`navigate:storage`, icon `LuHardDrive`); with `storage: false` the eight of today.
  - `createRoutes(...).open({ kind: 'navigate', destination: 'storage' })` calls `navigate('/game-glance/storage')` then `finishNavigation()`; `closesSteamMenu` is true for it.
- [ ] **Step 2:** Run both test files → FAIL.
- [ ] **Step 3:** Implement; MenuShell passes `storage={storageAvailable(SteamClient)}`. The grid stays four across (`.gg-menu-grid-navigate`), so Storage starts the third row.
- [ ] **Step 4:** Both files → PASS; full suite green; tsc clean; build exit 0.

### Task 6: Device checks with Michael

**Files:** spec, Part 2 — add `Device results`. Install as in Part 1 (`cat dist/index.js | ssh ally 'cat > ~/homebrew/plugins/game-glance/dist/index.js'`, back up the installed file first, then reload the plugin).

Michael presses the buttons; Claude only watches read-only. Each real change only on a game he names.

- [ ] The tile sits alone on the third row; it opens the page on Home and over a game.
- [ ] Drive cards match Steam's own Storage page (free, used, count); up/down picks a drive and the list follows.
- [ ] The footer shows `A Game page`, `X Move to …`, `Y Uninstall` on a game row, and X and Y land as drawn.
- [ ] Y on a game he names: Steam's confirmation shows; after confirming, the row goes and the numbers update; focus lands on the row now in its place.
- [ ] X on a game he names: progress on the row and both cards; `X Cancel move` cancels; a full move ends with the game on the other drive.
- [ ] Not enough space shows the refusal; the running game shows `Running now · Close the game first` with only A.
- [ ] Leaving mid-move and coming back shows the progress again.
- [ ] The same on the Steam Deck; anything missing there hides as Global Constraints say.
- [ ] Ledger every result; record them in the spec.
