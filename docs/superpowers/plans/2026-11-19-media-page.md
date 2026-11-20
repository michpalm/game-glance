# Media Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Steam's Big Picture Media page with Game Glance's (gallery M1 → viewer M3b → full screen M4) that uploads and deletes through Steam's own calls.

**Architecture:** A route patch on `/media` wraps Steam's element in `MediaGate` (as `src/patches/libraryPage.tsx`). Pure
modules build the item list, day groups, tabs and navigation from bindings over `SteamClient.Screenshots` and
`window.g_GRS`; one view component draws the three screens on the page kit (`src/pageKit`).

**Tech Stack:** TypeScript, React (`@decky/ui` Focusable/DialogButton/Navigation/ConfirmModal/showModal/Menu), vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-media-page-design.md`

## Global Constraints

- Units are 1920-wide mock-up pixels (`unit()`), on the page kit (`PageFrame`, `Tabs`, `pkButton`), scoped `.gg-media`.
- Screenshot url: `https://steamloopback.host/${strUrl}` unless `strUrl` already starts with `https://` (Steam's own helper, sp.js module 78926).
- Upload privacy values: Public 0, Friends only 1, Private 2 (Steam's UGC visibility; device check confirms with Private).
- Delete: `SteamClient.Screenshots.DeleteLocalScreenshots([{ gameID, rgHandles: [hHandle] }])` → `{ bSuccess, rgFailedRequestIndices }`; clips `g_GRS.DeleteClip(clipId)`.
- Upload: `SteamClient.Screenshots.UploadLocalScreenshot(strGameID, hHandle, privacy)` → boolean.
- Nothing leaves the list until Steam reports success. Every delete asks first with Steam's ConfirmModal: title "Delete screenshot?" / "Delete recording?", text "It is removed from this device. This can't be undone.", buttons "Delete" / "Cancel".
- Text English, inline. Storage, Downloads and the Library are not changed except where a task names it.
- Commits only when Michael says; identity `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"`; trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Device reloads only with no Game Glance page or menu open (`.gg-gm`, `.gg-storage`, `.gg-ach`, `.gg-dl`, `.gg-library`, `.gg-media`; `.gg-menu` in MainMenu_uid2), 40 s kill.

## Review Focus

1. No screenshots and no clips (a fresh device) → the gallery says "Nothing captured yet" and Y/X do nothing; nothing throws.
2. Deleting the last item of a day, of a tab, or the only item → the day heading goes, focus lands on a neighbour or the gallery's empty state; full screen on the last shot goes back to the viewer's neighbour or the gallery.
3. Steam reporting a failed delete or upload (`bSuccess: false`, `false`) → the item stays, a short message "Couldn't delete" / "Couldn't upload" shows, focus doesn't move.
4. A screenshot of a non-Steam shortcut or of Steam itself (appId 7, the PS5's real shots) → its name from `screenshotStore.GetShortcutDisplayName`, else "Steam"; no logo → the name.
5. A shot taken while the page is open (Steam's "written" notification) → it appears at the top without moving the highlight.

## File Structure

- `src/media/mediaModel.ts` — item types, list building, day groups, tabs, url, navigation, focus after delete.
- `src/media/steamMedia.ts` — bindings: list screenshots and clips, names, upload, delete, new-shot subscription.
- `src/media/mediaStyles.ts` — the three screens' layout CSS.
- `src/media/MediaPage.tsx` — `MediaPageView` (gallery / viewer / full screen), `MediaPage`, `MediaGate`.
- `src/media/mediaState.ts` — session memory (tab, highlighted item, Steam's-media flag).
- `src/patches/mediaPage.tsx` — the `/media` route patch.
- Modify `src/data/settings.ts` (`mediaPage`), `src/menu/components/GameGlancePages.tsx`, `src/components/SettingsPanel.tsx`, `src/index.tsx`.
- Tests under `tests/media/`, `tests/patches/mediaPage.test.ts`, `tests/data/settings.test.ts`, `tests/menu/*` as touched.

---

### Task 1: Media model

**Files:** Create `src/media/mediaModel.ts`; Test `tests/media/mediaModel.test.ts`

**Interfaces — Produces:**
```ts
export interface RawShot { nAppID: number; strGameID: string; hHandle: number; nWidth: number; nHeight: number; nCreated: number; strUrl: string; bUploaded: boolean; ePrivacy: number }
export interface RawClip { clip_id: string; game_id: string; name?: string; date_recorded: number; duration_ms: string | number }
export type MediaItem =
  | { kind: 'shot'; id: string; appId: number; gameId: string; handle: number; created: number; width: number; height: number; url: string; uploaded: boolean }
  | { kind: 'clip'; id: string; appId: number; gameId: string; created: number; durationMs: number; title: string };
export type MediaTab = 'all' | 'shots' | 'clips';
export function shotUrl(strUrl: string): string;
export function buildItems(shots: RawShot[], clips: RawClip[]): MediaItem[];          // newest first, ties by id
export function tabItems(items: MediaItem[], tab: MediaTab): MediaItem[];
export function mediaTabs(items: MediaItem[]): { key: MediaTab; label: string; count: number | null }[]; // All · N, Screenshots · N, Recordings · N
export function dayGroups(items: MediaItem[], now: Date): { label: string; items: MediaItem[] }[];
export function dayLabel(unixSeconds: number, now: Date): string;                      // Today / Yesterday / 12 November / 12 November 2025
export function formatDuration(ms: number): string;                                   // 0:42, 1:15, 1:02:03
export function stepItem(items: MediaItem[], id: string, step: -1 | 1): string | null; // wraps; null when empty
export function focusAfterDelete(items: MediaItem[], deletedId: string): string | null; // next, else previous, else null
```
`id` is `${strGameID}_${hHandle}` for shots, `clip_${clip_id}` for clips; a clip's `appId` is `Number(game_id)` when it fits in 32 bits, else 0.

- [ ] **Step 1: Write the failing tests** — with the PS5's real shots (`nAppID 7, strGameID '7', hHandle 2, nWidth 1920, nHeight 1080, nCreated 1794958645, strUrl 'screenshots/7/screenshots/20261118003725_1.jpg'` and `9055727 / 1 / 2560 × 1440 / 1794957806`) and two clips:
  - `shotUrl('screenshots/7/x.jpg')` → `'https://steamloopback.host/screenshots/7/x.jpg'`; an `https://` url unchanged.
  - `buildItems` newest first: the `1794958645` shot before the `1794957806` one; clips by `date_recorded` among them.
  - `mediaTabs` → `[{key:'all',label:'All',count:4},{key:'shots',label:'Screenshots',count:2},{key:'clips',label:'Recordings',count:2}]`.
  - `dayLabel` with now `2026-11-19T12:00:00`: same day → `'Today'`; day before → `'Yesterday'`; `2026-11-12` → `'12 November'`; `2025-10-27` → `'27 October 2025'`.
  - `dayGroups` keeps item order and makes one group per local day.
  - `formatDuration(42000)` → `'0:42'`; `75000` → `'1:15'`; `3723000` → `'1:02:03'`.
  - `stepItem` wraps at both ends; `null` for an empty list or an unknown id.
  - `focusAfterDelete`: middle → next; last → previous; only → `null` (Review Focus 2).
- [ ] **Step 2: Run** `npx vitest run tests/media/mediaModel.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** (English month names in full, local time).
- [ ] **Step 4: Run** the same — Expected: PASS.
- [ ] **Step 5: Commit** (only when Michael says) `feat(media): items, days, tabs`.

### Task 2: Steam bindings

**Files:** Create `src/media/steamMedia.ts`; Test `tests/media/steamMedia.test.ts`

**Interfaces — Consumes** Task 1 types. **Produces:**
```ts
export interface MediaBindings {
  available(): boolean;                                   // SteamClient.Screenshots present
  list(): Promise<{ shots: RawShot[]; clips: RawClip[] } | null>; // null on any throw (logged once)
  gameName(item: MediaItem): string | null;               // appStore display_name, else screenshotStore.GetShortcutDisplayName(gameId), else 'Steam' for appId 7, else null
  upload(item: Extract<MediaItem, { kind: 'shot' }>, privacy: 0 | 1 | 2): Promise<boolean>;
  remove(item: MediaItem): Promise<boolean>;               // shot: DeleteLocalScreenshots; clip: g_GRS.DeleteClip; false on throw
  onNewShot(cb: () => void): () => void;                   // SteamClient.GameSessions.RegisterForScreenshotNotification, strOperation 'written'
}
export function createMediaBindings(steam: unknown, stores: { appStore?: unknown; screenshotStore?: unknown; grs?: unknown }, log?: (e: unknown) => void): MediaBindings;
export function sharedMediaBindings(): MediaBindings;     // globals, made on first use
```
- `list`: count via `GetAllAppsLocalScreenshotsCount()`, then `GetAllAppsLocalScreenshotsRange(start, min(count - 1, start + 999))` per page of 1000; clips from `grs.GetClipSummaries(grs.GetClipIDs?.() ?? [])` when present, else `[...grs.m_clips?.values() ?? []]`, else `[]`.
- `remove` for a clip: `grs.DeleteClip(clip_id)` returns; treat a resolved call as success only when the clip is gone from `grs.m_clips` afterwards (Steam's DeleteClip removes it on success).

- [ ] **Step 1: Write the failing tests** with fake `SteamClient.Screenshots` / stores:
  - 1,500 shots → two Range calls `(0, 999)` and `(1000, 1499)`; 0 shots → no Range call.
  - `list()` null when Count throws; `log` called once over two calls.
  - `gameName`: Steam game → its display name; shortcut → `GetShortcutDisplayName`; appId 7 with neither → `'Steam'`; unknown → `null` (Review Focus 4).
  - `upload` passes `(strGameID, hHandle, 2)` and returns Steam's boolean; throws → `false`.
  - `remove` shot passes `[{ gameID: '7', rgHandles: [2] }]`; `{ bSuccess: false }` → `false` (Review Focus 3); clip → `DeleteClip('abc')`, gone from `m_clips` → `true`, still there → `false`.
  - `onNewShot` fires only for `strOperation: 'written'` and its stop unregisters.
- [ ] **Step 2: Run** `npx vitest run tests/media/steamMedia.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(media): Steam's screenshots and clips`.

### Task 3: The three screens (view) and styles

**Files:** Create `src/media/MediaPage.tsx` (view part), `src/media/mediaStyles.ts`; Test `tests/media/mediaPageView.test.ts`, `tests/media/mediaStyles.test.ts`

**Interfaces — Consumes** Task 1. **Produces:**
```ts
export type MediaScreen = { kind: 'gallery' } | { kind: 'viewer'; id: string } | { kind: 'full'; id: string };
export interface MediaViewProps {
  screen: MediaScreen; tab: MediaTab; tabs: ReturnType<typeof mediaTabs>; groups: ReturnType<typeof dayGroups>; items: MediaItem[];
  focusId: string | null; name(item: MediaItem): string | null; message: string | null; stripVisible: boolean;
  onTab(tab: MediaTab): void; onFocus(id: string): void; onOpen(item: MediaItem): void; onFull(item: MediaItem): void;
  onStep(step: -1 | 1): void; onUpload(item: MediaItem): void; onDelete(item: MediaItem): void; onSteamMedia(): void; onBack(): void;
}
export function MediaPageView(p: MediaViewProps): JSX.Element;
export const GALLERY = { cols: 5, tileW: 330, tileH: 186, gap: 20 };
```
- Gallery: `PageFrame` title "Media", kit `Tabs`, day eyebrows, tiles as DialogButtons `gg-media-tile` with `data-gg-focus="media:<id>"`, `onOKActionDescription` "View" (shot) / "Play" (clip), X "Upload to Steam" only on shots not uploaded, Y "Delete", ≡ (`onMenuButton`) "Steam's media"; a clip tile shows its game's header art (`landscapeUrls`), ▶ and `formatDuration`; rows keep the column (`navEntryPreferPosition` 2) and scroll the grid to the focused tile (reuse `keepCoverInView` from `src/library/LibraryPage.tsx`, exported already). Empty list → "Nothing captured yet" (Review Focus 1). Backdrop: the newest shot, kit `.gg-pk-backdrop`.
- Viewer: shot 1280 × 720 at (96, 150), glass panel at (1404, 150, 420 × 720) with `LibraryLogo` (from `src/library/LibraryPage.tsx`), name, `"Screenshot · 2560 × 1440"`, date and time (`12 November, 21:14`), "Uploaded" when so; action rows (kit buttons `gg-media-action`) Full screen (A, focused) / Upload to Steam (X, hidden once uploaded) / Delete (Y) / Steam's media (≡); filmstrip of 7 around the shot at y 900, 170 × 96, current ringed.
- Full screen: `object-fit: contain` on black; a top strip (game name, date, "2 of 6") with class `gg-media-strip` and `data-visible` from `stripVisible`; L1/R1 → `onStep`; X/Y/≡ as the viewer; B → `onBack`.
- `message` draws a small toast at the bottom ("Couldn't delete" etc.).

- [ ] **Step 1: Write the failing tests** (tree helper as `tests/library/libraryPageView.test.ts`, treating `CoverImg`, `LibraryLogo` and `FallbackImg`-like components as leaves):
  - gallery: day eyebrows "Today"/"Yesterday" in order; a shot tile's actions and descriptions as above; an uploaded shot's tile has no X; a clip tile shows "0:42" and "Play"; empty → "Nothing captured yet".
  - viewer: first action button is Full screen and is `preferredFocus`; "Uploaded" hides Upload; filmstrip shows at most 7 with the current ringed.
  - full screen: strip text "2 of 6"; `data-visible` follows `stripVisible`; root `onButtonDown` with button 6 calls `onStep(1)`, 5 → `onStep(-1)`.
  - styles: every selector starts with `.gg-media`; tile 330 × 186 units.
- [ ] **Step 2: Run** `npx vitest run tests/media` — Expected: new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(media): gallery, viewer and full screen`.

### Task 4: Live page, gate and actions

**Files:** Modify `src/media/MediaPage.tsx` (add `MediaPage`, `MediaGate`, `mediaGateChoice`); Create `src/media/mediaState.ts`; Test `tests/media/mediaGate.test.ts`, `tests/media/mediaActions.test.ts`

**Interfaces — Consumes** Tasks 1–3, `ownsPath`-like logic from `src/library/libraryGate.ts` (copy the shape, Media's own paths). **Produces:**
```ts
export function mediaGateChoice(input: { enabled: boolean; available: boolean; path: string | null; native: boolean }, previous?: 'ours' | 'native'): 'ours' | 'native';
export function mediaKeepsNative(path: string): boolean;     // /media, /media/grid, /media/list, /media/item/...
export const mediaMemory: { get(): { tab: MediaTab; focusId: string | null; native: boolean }; set(p: Partial<...>): void; subscribe(fn: () => void): () => void; reset(): void };
export async function runDelete(item: MediaItem, items: MediaItem[], remove: (i: MediaItem) => Promise<boolean>): Promise<{ ok: boolean; focusId: string | null }>;
export async function runUpload(item: MediaItem, privacy: 0 | 1 | 2, upload: MediaBindings['upload']): Promise<boolean>;
```
- Gate: ours when the "Media page" setting is on, bindings available, not native; a path outside `/media` keeps the previous choice (no flash, as the Library). `ensureNativeReset`-style reset of `native` when the path leaves `/media` (reuse the Library's pattern: `src/library/libraryGate.ts`).
- Page: lists on mount and on `onNewShot` (new shot added at the top, highlight kept, Review Focus 5); screen state gallery → viewer → full; B steps back one screen to the same item, from the gallery `Navigation.NavigateBack()`; full screen strip fades after 2500 ms and returns on any press.
- A on a clip: `mediaMemory.set({ native: true })` then `Navigation.Navigate('/media/item/clip/' + clip_id)`.
- X: a context menu "Who can see it?" with Public / Friends only / Private → `runUpload`; success marks the item uploaded; failure → message "Couldn't upload" (cleared after 3 s).
- Y: ConfirmModal (Global Constraints copy) → `runDelete`; success removes the item and moves focus to `focusId` (viewer/full screen move to that item; `null` → gallery); failure → "Couldn't delete", nothing moves.
- ≡: `mediaMemory.set({ native: true })`.
- Error boundary falls back to Steam's element (as `LibraryBoundary`).

- [ ] **Step 1: Write the failing tests:** gate table (setting off, unavailable, native, leaving path keeps previous, `/media/item/screenshot/x` is ours); `mediaKeepsNative`; `runDelete` success/failure/partial (focus next, previous, null; failure leaves focus); `runUpload` passes privacy and returns Steam's answer.
- [ ] **Step 2: Run** `npx vitest run tests/media` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run tests/media && npx tsc --noEmit` — Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat(media): live page, gate, upload and delete`.

### Task 5: Setting, route patch and wiring

**Files:** Create `src/patches/mediaPage.tsx`; Modify `src/data/settings.ts` (`mediaPage: boolean`, default `true`, `setMediaPage`), `src/menu/components/GameGlancePages.tsx` (ToggleRow `gg:general:mediaPage` "Media page" — "Game Glance's Media in place of Steam's. Steam's stays one button away (≡)." after the Library page row), `src/components/SettingsPanel.tsx` (same toggle in the Library section, renamed "Pages"), `src/index.tsx`; Test `tests/patches/mediaPage.test.ts`, `tests/data/settings.test.ts`, `tests/menu/gameGlancePages.test.ts`, `tests/menu/pluginLifecycle.test.ts`

**Interfaces — Produces:** `MEDIA_ROUTE = '/media'`, `patchMediaPage(): () => void` (as `patchLibraryPage`).

- [ ] **Step 1: Write the failing tests** (copy `tests/patches/libraryPage.test.ts`'s cases for `/media` and `MediaGate`; settings defaults gain `mediaPage: true`; the General page ids gain `gg:general:mediaPage` after `gg:general:libraryPage`; the lifecycle test mocks `../../src/patches/mediaPage`).
- [ ] **Step 2: Run** those tests — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build` — Expected: all pass, `dist/index.js` written.
- [ ] **Step 5: Commit** `feat(media): replace Steam's Media page`.

### Task 6: Device check on the PS5

- [ ] **Step 1:** Michael takes 3–4 extra screenshots (and one recording if he can) before the check.
- [ ] **Step 2:** Deploy and reload per Global Constraints.
- [ ] **Step 3:** Michael checks: Media from Steam's menu; tabs; viewer and full screen with L1/R1; B back step by step; upload one shot as Private (then confirm on the device that `ePrivacy` reads 2 and `bUploaded` true — a different value fixes Global Constraints' privacy numbers with a test first); delete one test shot; ≡ to Steam's media and back after leaving.
- [ ] **Step 4:** Fixes test-first; ledger; summary for Michael (commit on his word).
