# Library Page and Page Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Steam's tabbed Big Picture Library with Game Glance's Library (mock-up L11), built on a new shared page kit.

**Architecture:** A route patch on `/library` wraps Steam's element in `LibraryGate` (same shape as `src/patches/downloadsPage.tsx`).
Pure modules build the tabs, sorting, route choice and the highlighted game's facts from a snapshot read off Steam's
`collectionStore` / `appStore`; the page renders them with `src/pageKit` parts and reuses Home's warm-up for stats.

**Tech Stack:** TypeScript, React (Decky `@decky/ui` Focusable/DialogButton/Navigation), vitest, rollup.

**Spec:** `docs/superpowers/specs/2026-11-19-library-page-design.md`

## Global Constraints

- Units are 1920-wide mock-up pixels: `unit()` from `src/styles/tokens.ts`, root sets `--gg-d:calc(100vw / 1920)`.
- Kit rules are scoped under `.gg-pk`; kit button rules are written as `.gg-pk button.gg-pk-<part>.DialogButton`.
- Never an invented or placeholder figure: an unknown fact is left out (no dash, no "—", no 0 shown as a value).
- Tabs never cross the hero; A on a cover opens `/library/app/:appid`; no Play button on the page.
- Steam stores are read only: no Steam function called except the reads named in Task 4 and `Navigation.*`.
- Text is English, inline (as Storage and Downloads).
- Storage and Downloads are not changed.
- Commits only when Michael says; identity `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"`; trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Device reloads only with no Game Glance page or menu open (check `.gg-gm`, `.gg-storage`, `.gg-ach`, `.gg-dl`, `.gg-library` in Big Picture and `.gg-menu` in MainMenu_uid2), with a 40 s kill.

## Review Focus

1. A library with no user collections, no shortcuts and nothing ever played → tabs are just All games, Installed, Collections; Recently played is left out; nothing throws.
2. `/library/collection/<id>` for a hidden, empty or unknown collection → Steam's page, not an empty Library.
3. A game with achievements total 0, HowLongToBeat `notFound`, not installed and never played → the Progress group and every fact cell are left out, the collection pills still show.
4. Steam's stores missing or throwing mid-read (Steam updated) → the gate shows Steam's Library and logs once.
5. Returning from a game page → same tab, sort and highlighted cover, even when the game list changed meanwhile (the cover is found by app id; gone → nearest index).

Each line's test is in the owning task (Tasks 2, 2, 3, 4, 5).

## File Structure

- `src/pageKit/pageKitStyles.ts` — kit CSS (`pageKitStyles`, `pkButton`).
- `src/pageKit/PageKit.tsx` — `PageFrame`, `Tabs`, `Bar`, `Pill`, `Eyebrow`, `Fact`.
- `src/library/libraryModel.ts` — snapshot types, tabs, sorting, route choice, collections of a game.
- `src/library/libraryFacts.ts` — the glance groups and their formatting.
- `src/library/steamLibrary.ts` — bindings that read Steam's stores into a snapshot.
- `src/library/libraryState.ts` — session memory (tab, sorts, highlighted app, scroll, Steam's-library flag).
- `src/library/libraryStyles.ts` — the Library's own layout CSS (hero, facts, grid).
- `src/library/LibraryPage.tsx` — `LibraryPageView`, `LibraryPage`, `LibraryGate`.
- `src/patches/libraryPage.tsx` — the `/library` route patch.
- Modify `src/index.tsx`, `src/data/settings.ts`, `src/menu/components/GameGlancePages.tsx`, `src/components/SettingsPanel.tsx`.
- Tests mirror these under `tests/pageKit/`, `tests/library/`, `tests/patches/`, `tests/data/settings.test.ts`.

---

### Task 1: Page kit

**Files:**
- Create: `src/pageKit/pageKitStyles.ts`, `src/pageKit/PageKit.tsx`
- Test: `tests/pageKit/pageKitStyles.test.ts`, `tests/pageKit/pageKit.test.ts`

**Interfaces:**
- Produces:
  - `pkButton(part: string): string` → `.gg-pk button.gg-pk-${part}.DialogButton`
  - `pageKitStyles: string` (`tokenCss('.gg-pk')` + rules for `.gg-pk`, `.gg-pk-backdrop`, `.gg-pk-shade`, `.gg-pk-title`, `.gg-pk-tabs`, `.gg-pk-bumper`, tab buttons, `.gg-pk-bar`, `.gg-pk-bar-fill`, `.gg-pk-pill`, `.gg-pk-eyebrow`, `.gg-pk-fact`, `.gg-pk-fact-label`, `.gg-pk-fact-value`)
  - `PageFrame(p: { className: string; title: string; backdrop?: ReactNode; onBack(): void; onOptions?(): void; optionsLabel?: string; children: ReactNode })` — root `Focusable` with classes `gg-pk ${className}`, `onCancelButton`=onBack ("Back"), `onMenuButton`=onOptions (optionsLabel), renders backdrop, `<style>{pageKitStyles}</style>`, title `h1.gg-pk-title`, children.
  - `Tabs(p: { tabs: { key: string; label: string; count: number | null }[]; active: string; onChange(key: string): void })` — row of DialogButtons `gg-pk-tab` (label, then ` · ${count}` when count !== null), `aria-selected` on the active one, L1/R1 bumper glyphs either side; `onButtonDown` uses `tabForButton` (`src/home/focusZones.ts`) and calls `onChange` + `playNavSound('BasicNav')`. Exported helper `shoulderTab(keys: string[], active: string, button: number): string | null`.
  - `Bar(p: { ratio: number; tone?: 'accent' | 'ok' })` (ratio clamped 0..1, width as `%`), `Pill(p: { children: ReactNode })`, `Eyebrow(p: { children: ReactNode })`, `Fact(p: { label: string; value: string })`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/pageKit/pageKitStyles.test.ts
it('scopes every rule under .gg-pk', () => {
    for (const rule of pageKitStyles.split('}').map(r => r.trim()).filter(Boolean)) {
        const sel = rule.split('{')[0];
        if (sel.startsWith('@')) continue;
        for (const part of sel.split(',')) expect(part.trim().startsWith('.gg-pk')).toBe(true);
    }
});
it('gives kit buttons Steam-beating weight', () => {
    expect(pkButton('tab')).toBe('.gg-pk button.gg-pk-tab.DialogButton');
    expect(pageKitStyles).toContain(pkButton('tab'));
});
it('uses the page units', () => expect(pageKitStyles).toContain('--gg-d:calc(100vw / 1920)'));

// tests/pageKit/pageKit.test.ts (mock @decky/ui as tests/downloads/downloadsGate.test.ts does)
it('L1 and R1 move one tab and stop at the ends', () => {
    expect(shoulderTab(['a', 'b', 'c'], 'b', 6)).toBe('c');
    expect(shoulderTab(['a', 'b', 'c'], 'c', 6)).toBe('c');
    expect(shoulderTab(['a', 'b', 'c'], 'a', 5)).toBe('a');
    expect(shoulderTab(['a', 'b', 'c'], 'b', 0)).toBeNull();
});
it('Bar clamps its ratio', () => { /* render Bar ratio 1.4 and -1 → fill width 100% and 0% */ });
it('Tabs shows counts only when known', () => { /* {label:'Installed',count:15} → "Installed · 15"; count null → "Collections" */ });
```

- [ ] **Step 2: Run** `npx vitest run tests/pageKit` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the two files. Values from the spec/mock-up: title 46 units at (96, 66) inside a page padded 66/96; pill 16–19 units bold, neutral glass `rgba(255,255,255,.09)`, active tab white `rgba(255,255,255,.92)` with text `#10141a`; bar 8 units high, `var(--gg-track)` track, fill `var(--gg-accent)` (ok tone `var(--gg-ok,#5fd1ae)`); eyebrow 15–16 units uppercase `var(--gg-text-dim)`; fact label 16 units uppercase faint, value 22 units bold; focus on kit buttons `focusRing('menu')`; idle edge/tint from `IDLE_TILE`.
- [ ] **Step 4: Run** `npx vitest run tests/pageKit` — Expected: PASS.
- [ ] **Step 5: Commit** (only when Michael says) `feat(pageKit): shared page parts`.

### Task 2: Library model

**Files:**
- Create: `src/library/libraryModel.ts`
- Test: `tests/library/libraryModel.test.ts`

**Interfaces:**
- Produces:
```ts
export interface LibGame { appId: number; name: string; playedMin: number; lastPlayed: number; sizeBytes: number; installed: boolean; shortcut: boolean }
export interface LibCollection { id: string; name: string; appIds: number[] }
export interface LibrarySnapshot { games: LibGame[]; installedIds: number[]; collections: LibCollection[] }
export type TabKey = 'recent' | 'all' | 'installed' | 'nonSteam' | 'collections' | `col:${string}`;
export interface LibTab { key: TabKey; label: string; count: number | null }
export type SortKey = 'lastPlayed' | 'name' | 'playtime' | 'size';
export const SORTS: SortKey[];               // ['lastPlayed', 'name', 'playtime', 'size']
export const SORT_LABELS: Record<SortKey, string>; // Last played, Name, Playtime, Size on disk
export const HIDDEN_COLLECTIONS: string[];   // ['uncategorized', 'local-install', 'hidden']
export function buildTabs(s: LibrarySnapshot): LibTab[];
export function tabGames(s: LibrarySnapshot, key: TabKey, sort: SortKey): LibGame[];
export function nextSort(sort: SortKey): SortKey;
export type RouteChoice = { kind: 'ours'; tab: TabKey | null } | { kind: 'native' };
export function routeChoice(path: string, s: LibrarySnapshot): RouteChoice;
export function keepsNative(path: string): boolean;
export function collectionsOf(s: LibrarySnapshot, appId: number): string[];
```

- [ ] **Step 1: Write the failing tests** with a fixture of 6 games (2 played, 1 shortcut, 2 installed) and collections `favorite` "Favorites" [2 apps], `uncategorized`, `local-install`, `abc` "Horror" [1 app], `empty1` "Empty" [].

```ts
it('orders tabs: recent, all, installed, collections in Steam order, non-Steam, collections', () =>
    expect(buildTabs(fx).map(t => t.key)).toEqual(['recent', 'all', 'installed', 'col:favorite', 'col:abc', 'nonSteam', 'collections']));
it('counts: none for recent and collections, the list size otherwise', () =>
    expect(buildTabs(fx).map(t => t.count)).toEqual([null, 6, 2, 2, 1, 1, null]));
it('skips Uncategorized, Locally Installed, hidden and empty collections', ...);
it('leaves out Recently played and Non-Steam when there is nothing for them (Review Focus 1)', () =>
    expect(buildTabs(neverPlayedNoShortcutsNoCollections).map(t => t.key)).toEqual(['all', 'installed', 'collections']));
it('recent lists only played games, newest first', ...);
it('sorts by name (locale, case-insensitive), playtime desc, size desc, last played desc; ties by name', ...);
it('nextSort cycles through SORTS and wraps', () => expect(nextSort('size')).toBe('lastPlayed'));
it('maps Steam paths', () => {
    expect(routeChoice('/library', fx)).toEqual({ kind: 'ours', tab: null });
    expect(routeChoice('/library/tab/AllGames', fx)).toEqual({ kind: 'ours', tab: 'all' });
    expect(routeChoice('/library/tab/Installed', fx)).toEqual({ kind: 'ours', tab: 'installed' });
    expect(routeChoice('/library/tab/Favorites', fx)).toEqual({ kind: 'ours', tab: 'col:favorite' });
    expect(routeChoice('/library/tab/Collections', fx)).toEqual({ kind: 'ours', tab: 'collections' });
    expect(routeChoice('/library/collections', fx)).toEqual({ kind: 'ours', tab: 'collections' });
    expect(routeChoice('/library/tab/DesktopApps', fx)).toEqual({ kind: 'ours', tab: 'nonSteam' });
    expect(routeChoice('/library/collection/abc', fx)).toEqual({ kind: 'ours', tab: 'col:abc' });
    expect(routeChoice('/library/tab/Soundtracks', fx)).toEqual({ kind: 'native' });
    expect(routeChoice('/library/tab/GreatOnDeck', fx)).toEqual({ kind: 'native' });
});
it('sends hidden, empty and unknown collections to Steam (Review Focus 2)', () => {
    for (const id of ['uncategorized', 'empty1', 'nope']) expect(routeChoice(`/library/collection/${id}`, fx)).toEqual({ kind: 'native' });
});
it('keeps Steam\'s library while in the library or a game page', () => {
    for (const p of ['/library', '/library/tab/AllGames', '/library/collections', '/library/collection/abc', '/library/app/10']) expect(keepsNative(p)).toBe(true);
    for (const p of ['/library/home', '/library/downloads', '/settings', '/store']) expect(keepsNative(p)).toBe(false);
});
it('names a game\'s shown collections in tab order', () => expect(collectionsOf(fx, 2)).toEqual(['Favorites', 'Horror']));
```

- [ ] **Step 2: Run** `npx vitest run tests/library/libraryModel.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `libraryModel.ts`. Collection id in paths is `decodeURIComponent`d. `DesktopApps` with no shortcuts → native.
- [ ] **Step 4: Run** the same — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): tabs, sorting and route choice`.

### Task 3: The glance facts

**Files:**
- Create: `src/library/libraryFacts.ts`
- Test: `tests/library/libraryFacts.test.ts`

**Interfaces:**
- Consumes: `LibGame` (Task 2).
- Produces:
```ts
export interface KnownStats { achievements?: { achieved: number; total: number }; hltbMainHours?: number; protonTier?: string }
export interface ProgressLine { label: 'Achievements' | 'Story'; value: string; ratio: number }
export interface Glance { progress: ProgressLine[]; facts: { label: string; value: string }[]; collections: string[] }
export function glance(game: LibGame, known: KnownStats, collections: string[], now: Date): Glance;
export function formatPlayed(min: number): string;
export function formatLastPlayed(unixSeconds: number, now: Date): string;
export function formatSize(bytes: number): string;
```

- [ ] **Step 1: Write the failing tests** (The Witcher 3's real figures):

```ts
const w3: LibGame = { appId: 292030, name: 'The Witcher 3', playedMin: 2563, lastPlayed: 1794495475, sizeBytes: 69795378546, installed: true, shortcut: false };
const now = new Date('2026-11-19T12:00:00Z');
it('matches the mock-up', () => expect(glance(w3, { achievements: { achieved: 13, total: 78 }, hltbMainHours: 56.8, protonTier: 'platinum' }, ['Favorites', 'Backlog', 'Playing'], now)).toEqual({
    progress: [{ label: 'Achievements', value: '13 of 78', ratio: 13 / 78 }, { label: 'Story', value: '43 of 57 h', ratio: 2563 / 60 / 56.8 }],
    facts: [{ label: 'Played', value: '42 h 43 min' }, { label: 'Last played', value: '12 Nov' }, { label: 'On disk', value: '65.0 GB' }, { label: 'ProtonDB', value: 'Platinum' }],
    collections: ['Favorites', 'Backlog', 'Playing'],
}));
it('caps the story bar at 1', ...);   // 120 h played vs 57 h → ratio 1, value '120 of 57 h'
it('leaves out what is unknown (Review Focus 3)', () => expect(glance({ ...w3, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false }, { achievements: { achieved: 0, total: 0 } }, ['Horror'], now))
    .toEqual({ progress: [], facts: [], collections: ['Horror'] }));
it('formats', () => {
    expect(formatPlayed(14)).toBe('14 min'); expect(formatPlayed(60)).toBe('1 h'); expect(formatPlayed(2563)).toBe('42 h 43 min');
    expect(formatLastPlayed(1794495475, now)).toBe('12 Nov'); expect(formatLastPlayed(1730000000, now)).toBe('27 Oct 2024');
    expect(formatSize(69795378546)).toBe('65.0 GB'); expect(formatSize(1073741824 / 2)).toBe('512 MB');
});
```

- [ ] **Step 2: Run** `npx vitest run tests/library/libraryFacts.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Sizes are binary (GiB shown as "GB", as Steam does); dates in English short month, local time; story value rounds both hours.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): the highlighted game's facts`.

### Task 4: Reading Steam's library

**Files:**
- Create: `src/library/steamLibrary.ts`
- Test: `tests/library/steamLibrary.test.ts`

**Interfaces:**
- Consumes: `LibrarySnapshot`, `LibGame`, `LibCollection` (Task 2).
- Produces: `export interface LibraryBindings { available(): boolean; read(): LibrarySnapshot | null }`, `export function createLibraryBindings(collectionStore: unknown, appStore: unknown, log?: (e: unknown) => void): LibraryBindings`, `export const SHORTCUT_APP_TYPE = 1073741824`.
- Reads only: `collectionStore.allGamesCollection.allApps`, `collectionStore.localGamesCollection.allApps`, `collectionStore.allAppsCollection.allApps` (shortcuts: `app_type === SHORTCUT_APP_TYPE`), `collectionStore.userCollections[]` (`id`, `displayName`, `allApps`), `collectionStore.BIsHidden(appId)` (hidden games left out). Overview fields: `appid`, `display_name`, `minutes_playtime_forever`, `rt_last_time_played`, `size_on_disk`.

- [ ] **Step 1: Write the failing tests** with fake stores:
  - `available()` false without `allGamesCollection`; `read()` null then.
  - a full fake → snapshot with games (Steam games + shortcuts, no duplicates by app id), `installedIds`, collections in `userCollections` order with their app ids; `size_on_disk` as string `"69795378546"` → number; missing numbers → 0.
  - hidden games (BIsHidden true) are left out of games and collections.
  - a getter that throws mid-read → `read()` returns null and `log` is called once per bindings (Review Focus 4).
- [ ] **Step 2: Run** `npx vitest run tests/library/steamLibrary.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**; module-level `sharedLibraryBindings()` reading `globalThis.collectionStore` / `appStore` lazily (as `sharedBindings` in `DownloadsPage.tsx`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): read Steam's library`.

### Task 5: Session memory and the page view

**Files:**
- Create: `src/library/libraryState.ts`, `src/library/libraryStyles.ts`, `src/library/LibraryPage.tsx` (view part)
- Test: `tests/library/libraryState.test.ts`, `tests/library/libraryPageView.test.ts`, `tests/library/libraryStyles.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
```ts
// libraryState.ts
export interface LibraryMemory { tab: TabKey | null; sorts: Partial<Record<TabKey, SortKey>>; focus: Partial<Record<TabKey, number>>; scroll: Partial<Record<TabKey, number>>; native: boolean }
export const libraryMemory: { get(): LibraryMemory; set(patch: Partial<LibraryMemory>): void; subscribe(fn: () => void): () => void; reset(): void };
export function restoreIndex(games: LibGame[], appId: number | undefined, fallbackIndex: number): number;
// LibraryPage.tsx
export interface LibraryViewProps { tabs: LibTab[]; tab: TabKey; games: LibGame[]; focusIndex: number; settled: LibGame | null; glance: Glance | null;
  hero(appId: number): string[]; logo(appId: number): string[]; cover(appId: number): string[];
  onTab(key: TabKey): void; onFocus(index: number): void; onOpen(game: LibGame): void; onSort(): void; onOptions(): void; onBack(): void }
export function LibraryPageView(p: LibraryViewProps): JSX.Element;
export const GRID = { cols: 13, coverW: 120, coverH: 180, gap: 14, windowRowsBefore: 3, windowRowsAfter: 4 };
export function visibleRows(focusIndex: number, total: number): { first: number; last: number }; // row indexes to mount
```

- [ ] **Step 1: Write the failing tests:**
  - `restoreIndex`: found by app id → its index; app id gone → `min(fallbackIndex, games.length - 1)`; empty list → 0 (Review Focus 5).
  - `libraryMemory.set` notifies subscribers; `reset` restores `{ tab: null, sorts: {}, focus: {}, scroll: {}, native: false }`.
  - `visibleRows(0, 530)` → `{ first: 0, last: 4 }`; `visibleRows(13 * 20, 530)` → `{ first: 17, last: 24 }`; last never past the last row.
  - View renders: root class `gg-library`, title "Library", tabs before the grid in DOM order, hero section with logo urls, Progress/Facts/collection pills from `glance`; with `glance.progress` empty no Progress group; covers are DialogButtons `gg-pk-cover` with `data-gg-focus="library:<appId>"` and `onOKActionDescription="Game page"`; a cover with no art urls renders the game name inside it; footer: `onSecondaryButton` = onSort ("Sort"), menu button = onOptions ("Options").
  - With `hero()` returning only a capsule url, the hero element gets the blurred class `gg-library-hero-soft`.
  - Styles: every `libraryStyles` selector starts with `.gg-library`; the hero is 560 units tall; covers 120 × 180 units.
- [ ] **Step 2: Run** `npx vitest run tests/library` — Expected: new tests FAIL.
- [ ] **Step 3: Implement.** Layout from the spec §3: hero full-bleed 560 with `mask-image` bottom fade and a left shade that fades with it (one element, both masks); logo at (96,150) max 420 × 130 with a light `drop-shadow` lift for dark logos (reuse Home's logo filter if one exists in `src/home`, else `drop-shadow(0 0 u(18) rgba(255,255,255,.35))`); facts row y 318 (Progress 330 wide at x 96, Facts 2 × 2 at x 476, 210 apart); pills y 470; tabs y 552; grid from y 610, scrolls (`overflow-y:auto`, scroll-padding like Storage), windowed rows with spacer heights. Hero urls = `heroUrls(...)` then `capsuleUrls(...)` (a game with no hero art shows its header/cover, blurred, as Home falls back), tried in order like Downloads' `FallbackImg`; cover `<img loading="lazy">`.
- [ ] **Step 4: Run** `npx vitest run tests/library` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): page view and session memory`.

### Task 6: The live page and the gate

**Files:**
- Modify: `src/library/LibraryPage.tsx` (add `LibraryPage`, `LibraryGate`, `useSettled`)
- Test: `tests/library/libraryGate.test.ts`, `tests/library/useSettled.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5; `useWarmup` (`src/home/useWarmup.ts`), `memoAchievements` (`src/home/detailsMemo.ts`), `peekHltb` (`src/home/warmup.ts`), `useProton` (`src/data/useProton.ts`), `heroUrls`/`logoUrls`/`capsuleUrls`/`browserStores` (`src/home/artwork.ts`), `routeSource` (`src/search/steam.ts`), `settings` (`src/data/settings.ts`, `libraryPage` from Task 7).
- Produces: `LibraryGate({ native, bindings?, path? }: { native: ReactNode; bindings?: LibraryBindings; path?: () => string | null }): ReactNode`; `useSettled<T>(value: T, ms = 150): T`.

- [ ] **Step 1: Write the failing tests:**
  - Gate decision table: setting off → native; `bindings.available()` false or `read()` null → native; `routeChoice` native → native; `libraryMemory.native` true → native; otherwise a `LibraryPage` element with the chosen tab.
  - `useSettled` returns the old value until `ms` passes with no change (fake timers).
- [ ] **Step 2: Run** `npx vitest run tests/library/libraryGate.test.ts tests/library/useSettled.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement:**
  - `LibraryPage`: reads the snapshot on mount and on tab change; tab = route tab ?? memory tab ?? first tab; sort from memory (default `lastPlayed`); focus restored with `restoreIndex`; highlighted game settles through `useSettled` before hero/facts change (cross-fade with `var(--gg-base)`).
  - Warm-up: `useWarmup(window games around the focus, focus index in that window, true, id => ({ isShortcut, heroic: null }), bump)`; window = the mounted rows.
  - Facts: `KnownStats` from `memoAchievements(appId)`, `peekHltb(appId)` (`status === 'found'` → `times.main`), `useProton({ appId, name, isShortcut }, true, settled)` (`status === 'found'` → `tier`).
  - A → `Navigation.Navigate('/library/app/' + appId)` after saving tab/focus/scroll to memory. X → `nextSort`, saved per tab. Y → context menu (as `src/home/gameMenu.ts` builds Steam's menu, or `showContextMenu` with `Menu`/`MenuItem` from `@decky/ui`): one item per sort (current checked) and "Steam's library" (sets `libraryMemory.native = true`). B → `Navigation.NavigateBack()`.
  - `LibraryGate` subscribes to `libraryMemory` and to `routeSource(...)` (Steam's main-window history, as `src/search/steam.ts`); when the path stops satisfying `keepsNative`, it sets `native: false`. Wrap the page in `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) whose fallback is `native`.
- [ ] **Step 4: Run** `npx vitest run tests/library` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): live page and gate`.

### Task 7: Setting, route patch and wiring

**Files:**
- Create: `src/patches/libraryPage.tsx`
- Modify: `src/data/settings.ts` (field `libraryPage: boolean`, default `true`, `pick('libraryPage')`, `setLibraryPage(value)`), `src/menu/components/GameGlancePages.tsx` (`GeneralPage`: ToggleRow `gg:general:libraryPage`, label "Library page", description "Game Glance's Library in place of Steam's. Steam's stays one button away (Y)." right after the Game Glance toggle), `src/components/SettingsPanel.tsx` (same toggle), `src/index.tsx` (`patchLibraryPage()` next to `patchDownloadsPage()`, unpatch on unload)
- Test: `tests/patches/libraryPage.test.ts`, `tests/data/settings.test.ts`

**Interfaces:**
- Produces: `LIBRARY_ROUTE = '/library'`, `patchLibraryPage(): () => void` (never throws; same structure as `patchDownloadsPage`).

- [ ] **Step 1: Write the failing tests:** route patch wraps a valid child in `LibraryGate` with `native` = the original child; leaves a non-element child and an already-wrapped child alone; `addPatch` throwing → returns a no-op. Settings: every `toEqual` default in `tests/data/settings.test.ts` gains `libraryPage: true`; `setLibraryPage(false)` persists.
- [ ] **Step 2: Run** `npx vitest run tests/patches/libraryPage.test.ts tests/data/settings.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run build` — Expected: all pass, build writes `dist/index.js`.
- [ ] **Step 5: Commit** `feat(library): replace Steam's Library`.

### Task 8: Device check on the PS5

- [ ] **Step 1:** Deploy: `npm run build`; `scp dist/index.js ps5:homebrew/plugins/game-glance/dist/index.js`; open-page/menu check; reload `DeckyPluginLoader.importPlugin("Game Glance","4.0.0-rc.3")` in SharedJSContext with `sleep 40; kill`.
- [ ] **Step 2:** Read-only probe: confirm `collectionStore.allAppsCollection` holds shortcuts with `app_type 1073741824`, and `userCollections[].id` for Favorites is `favorite`. A difference → fix Task 2/4 constants with a test first.
- [ ] **Step 3:** Michael checks: Library from Steam's menu, Home and Navigate; L1/R1; A → game page and B back to the same cover; X sort; Y → Steam's library and back to ours after Home; Soundtracks tile still Steam's; All games scrolls through 530; a game without HowLongToBeat; a dark logo.
- [ ] **Step 4:** Fixes found go in with a failing test first; then the ledger and a summary for Michael (commit only on his word).
