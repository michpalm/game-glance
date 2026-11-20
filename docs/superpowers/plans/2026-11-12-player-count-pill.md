# Player Count Pill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "20,663 playing" glass pill beside the store and family pills on Home and the game page, warmed on Home, refreshed on the page, and opening PlayCount's chart when PlayCount is installed.

**Architecture:** A cached lookup (`src/data/playerCount.ts`, shaped like `createProtonLookup`) feeds a hook used by Home and the page. The pill is one more child of the store pill's unglazed holder (`SourcePill` / `HomePills`), placed in the row or above it by a measured fit rule (`src/styles/playersFit.ts`). On the page, PlayCount's own badge stays in the DOM but hidden, and our pill forwards its press to it.

**Tech Stack:** TypeScript, React 19, `@decky/ui`, `@decky/api` (`fetchNoCors`), vitest + linkedom.

**Spec:** `docs/superpowers/specs/2026-11-12-player-count-pill-design.md` (read it with this plan).

## Global Constraints

- Repo: `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`, branch `fix/menu-contrast-play-handoff`.
- No commits or pushes unless Michael asks. Each task ends with a **Checkpoint** (tests, `tsc`) instead of a commit; when he asks, commit as `Michael Palma <18511803+michpalm@users.noreply.github.com>` with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
- API: `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=<id>`; a count only from `{ response: { result: 1, player_count: <non-negative integer> } }`.
- Freshness: Home due after **5 min** (`PLAYERS_HOME_MAX_AGE_MS = 300_000`); page due after **1 min** (`PLAYERS_PAGE_MAX_AGE_MS = 60_000`); page polls every **5 min** (`PLAYERS_POLL_MS = 300_000`); cache kept **1 day**; request timeout 15 s (as ProtonDB).
- Steam apps only: shortcuts never asked, never shown.
- Copy: pill text `${count.toLocaleString(locale)} playing`; setting label "Player count", description "How many people are playing now, from Steam."
- Look: the family pill's look (`sourcePillLook`), dot `#5fd38d`, 0.55 em, soft glow; 10 px gap (the family pill's).
- Order right to left: store, family, players. Fit line: left edge of the right-hand stat card; past it, the pill goes above, right-aligned, 10 px above the row.
- Setting `playerCountPill`, default `true`.
- Deploy to the Ally: `npm run build`, `scp dist/index.js ally:/tmp/gg-index.js`, `ssh ally 'cp /tmp/gg-index.js ~/homebrew/plugins/game-glance/dist/index.js'`, reload with `CEF_URL=http://127.0.0.1:18082 node scripts/cef-eval.mjs '(async () => { await window.DeckyPluginLoader.importPlugin("Game Glance", "4.0.0-rc.3"); return "reloaded"; })()' SharedJSContext` (tunnel: `ssh -fN -L 18082:127.0.0.1:8080 ally`). Back up the old `index.js` on the Ally first. No button presses on the device without asking.

## Review Focus

1. **A game with 0 players** (old or delisted): Steam answers `player_count: 0`. Expect "0 playing", not a missing pill (0 is a count). Test in Task 1.
2. **Steam rate-limits or errors (HTTP 429/500, or `result: 42`)** during Home's row warm-up: expect the run to stop asking further games for that pass, and every known count to stay. Test in Task 2.
3. **The number grows past the fit line while the page is open** (a refresh from 9,999 to 10,000): expect the pill to move above without a reload. Test in Task 4.
4. **PlayCount is installed but its badge never appears** (slow load, or a PlayCount update renames `.playerBadge`): expect our pill to be display-only and PlayCount's badge not hidden twice or left hidden after the toggle goes off. Test in Task 5.
5. **Switching games quickly on Home**: a slow answer for the previous game must not show on the new one. Test in Task 2.

---

### Task 1: Player count lookup

**Files:**
- Create: `src/data/playerCount.ts`
- Test: `tests/data/playerCount.test.ts`

**Interfaces:**
- Consumes: `Cache`, `cache`, `DAY_MS` from `src/data/cache.ts`; `attempt` from `src/data/attempt.ts`; `withTimeout` from `src/data/hltb`; `fetchNoCors` from `@decky/api`.
- Produces:
  - `type PlayerCount = { status: 'found'; count: number } | { status: 'none' } | { status: 'unavailable' }`
  - `playersUrl(appId: number): string`, `playersCacheKey(appId: number): string` (`players:<id>`)
  - `parsePlayers(body: unknown): number | null`
  - `createPlayerCountLookup(deps: { fetcher(url: string): Promise<{ status: number; json(): Promise<unknown> }>; cache: Cache; now?: () => number; timeoutMs?: number })` returning `lookup(appId, maxAgeMs): Promise<PlayerCount>` with `.cachedOnly(appId): Promise<PlayerCount | null>` and `.prefetch(appId, maxAgeMs): Promise<{ status: PlayerCount['status']; fetched: boolean }>`
  - `lookupPlayers` (the instance over `fetchNoCors` and `cache`); constants `PLAYERS_HOME_MAX_AGE_MS`, `PLAYERS_PAGE_MAX_AGE_MS`, `PLAYERS_POLL_MS`.

- [ ] **Step 1: Write the failing tests** in `tests/data/playerCount.test.ts` (fake fetcher, in-memory `Cache`, fake `now`):
  - `parsePlayers` returns `20663` for `{response:{result:1,player_count:20663}}`, `0` for `player_count: 0`, `null` for `result: 42`, a missing count, a negative or non-integer count, and `null` input.
  - `lookup` with nothing cached fetches once and returns `{status:'found',count:20663}`; a second `lookup` within `maxAgeMs` returns it without fetching.
  - an entry older than `maxAgeMs` is returned at once and refreshed behind (fetcher called once, the next `lookup` sees the new count).
  - HTTP 500, a thrown fetch, and a timeout return the known count (or `unavailable` with none) and never write the cache.
  - `result: 42` with HTTP 200 caches `{status:'none'}`.
  - two concurrent `lookup(10)` calls make one request.
  - `cachedOnly` never fetches; `prefetch` reports `fetched: true` only when it went online, `status:'unavailable'` when a refresh failed over a known count.
- [ ] **Step 2: Run** `npx vitest run tests/data/playerCount.test.ts` — expect FAIL (module missing).
- [ ] **Step 3: Implement `src/data/playerCount.ts`** following `src/data/protondb.ts`'s structure (`inflight` map, `read` → `{known, due}`, `refresh` keeps `previous` on `unavailable`), with `maxAgeMs` passed per call instead of fixed refresh ages, and the cache entry `{status, count?, fetchedAt}` kept `DAY_MS`.
- [ ] **Step 4: Run** the test file — expect PASS.
- [ ] **Step 5: Checkpoint:** `npx tsc --noEmit -p .` clean.

### Task 2: Hook and Home warm-up

**Files:**
- Create: `src/data/usePlayerCount.ts`
- Modify: `src/home/warmup.ts` (add `warmPlayers`), `src/home/useWarmup.ts` (run it beside `warmProton`)
- Test: `tests/data/usePlayerCount.test.ts`, `tests/home/warmup.test.ts`

**Interfaces:**
- Consumes: Task 1's `lookupPlayers`, `PlayerCount`, constants.
- Produces:
  - `usePlayerCount(appId: number | null, opts: { maxAgeMs: number; pollMs?: number; enabled: boolean }): number | null` — the count for `appId`, from a module memo first (`peekPlayers(appId)`), then `lookupPlayers`; `null` for no count, a shortcut (caller passes `null`), or `enabled: false`. Polls with `pollMs` while mounted. A result for an app id other than the current one is dropped.
  - `peekPlayers(appId: number): number | null`, `seedPlayers(appId: number, result: PlayerCount): boolean` (memo, `found` only).
  - `warmPlayers(appIds: number[], deps: PlayersWarmDeps, isCancelled: () => boolean, onResult?: (appId: number) => void): Promise<void>` with `PlayersWarmDeps = { known(appId): boolean; readCached(appId): Promise<PlayerCount | null>; prefetch(appId): Promise<{ status: PlayerCount['status']; fetched: boolean }>; seed(appId, r): boolean; allowNetwork(): boolean; sleep(ms): Promise<void> }` and `PLAYERS_WARM_DELAY_MS = 500`.

- [ ] **Step 1: Write the failing tests:**
  - `warmPlayers` (mirror `warmProton`'s tests): seeds from cache without fetching; fetches only when `allowNetwork()`; **stops the pass on the first `unavailable`** (Review Focus 2) and leaves seeded counts; sleeps `PLAYERS_WARM_DELAY_MS` after each fetch; honours `isCancelled`.
  - `usePlayerCount` (render with a fake lookup via `vi.mock('../../src/data/playerCount')`): returns the memo value at once; `enabled:false` → `null` and no lookup; **switching `appId` from 10 to 20 while 10's lookup is pending, then resolving 10, still returns 20's value** (Review Focus 5); with `pollMs`, a fake timer advance triggers another lookup.
- [ ] **Step 2: Run** both test files — expect FAIL.
- [ ] **Step 3: Implement** `usePlayerCount` with the repo's `useAsync` keyed on `[appId, enabled, tick]` and a `setInterval(pollMs)` bumping `tick`; `warmPlayers` beside `warmProton` in `src/home/warmup.ts`.
- [ ] **Step 4: Wire the warm-up:** in `useWarmup.ts`, when `settings.get().playerCountPill` (Task 3) is on, add `warmPlayers(ordered.filter((g) => !shortcut(g.appId)).map((g) => g.appId), playersDeps, isCancelled, changed)` to the `Promise.all`, with `prefetch: (id) => lookupPlayers.prefetch(id, PLAYERS_HOME_MAX_AGE_MS)` and `allowNetwork: () => settings.get().autoPreload`.
- [ ] **Step 5: Run** `npx vitest run tests/data tests/home` — expect PASS. **Checkpoint:** `tsc` clean.

### Task 3: Setting and toggles

**Files:**
- Modify: `src/data/settings.ts`, `src/menu/components/GameGlancePages.tsx` (after the `familyPill` `ToggleRow`, line ~179), `src/components/SettingsPanel.tsx` (after the Family Sharing `ToggleField`, line ~307)
- Test: `tests/data/settings.test.ts`, the menu pages test that covers `gg:general:familyPill`

**Interfaces:**
- Produces: `Settings.playerCountPill: boolean` (default `true`), `settings.setPlayerCountPill(value: boolean): Promise<void>`; menu row id `gg:general:playerCountPill`.

- [ ] **Step 1: Failing tests:** defaults include `playerCountPill: true`; a stored `false` loads; `setPlayerCountPill(false)` emits and persists `{ playerCountPill: false }`; the Game page menu renders a row `gg:general:playerCountPill` labelled "Player count" with description "How many people are playing now, from Steam." right after `gg:general:familyPill`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** as `familyPill` is done (`DEFAULTS`, `pick`, setter), and the two toggles.
- [ ] **Step 4: Run** — PASS. **Checkpoint:** `tsc` clean.

### Task 4: Fit rule

**Files:**
- Create: `src/styles/playersFit.ts`
- Test: `tests/styles/playersFit.test.ts`

**Interfaces:**
- Produces:
  - `playersPlacement(input: { pillLeft: number; limit: number | null }): 'row' | 'above'` — `'row'` when `limit === null` or `pillLeft >= limit`.
  - `playersLimit(root: HTMLElement): number | null` — the fit line in client px: the left edge of the right-hand stat card, found by the first of these selectors that matches a visible element: `.gg-cards > :last-child:not(:first-child)` (page, two cards), `.gg-clean-info` (page, Clean look), `.gh-normal-cards > :last-child:not(:first-child)` (Home); else, when `.gg-cards` or `.gh-normal-cards` exists with one card, its left + (width − gap) × 1.1 / 2.1 + gap (the page's `PAGE_LAYOUT.cards.split` and `gridGap`); else `null`.
  - `observePlayersPlacement(holder: HTMLElement, root: HTMLElement): () => void` — measures the `[data-players-pill]` child **as if in the row** (removes `data-players` before measuring), writes `holder.dataset.players = 'row' | 'above'` and the custom property `--gg-family-w` on the holder (the family pill's width in px, `0px` without one; the CSS places the row pill with it), and re-measures on a `ResizeObserver` of the holder, the pill and the card, and on a `MutationObserver` of the pill's text.

- [ ] **Step 1: Failing tests** (linkedom with stubbed `getBoundingClientRect`, a fake `ResizeObserver`):
  - `playersPlacement`: left 1100 / limit 1200 → `'above'`; 1200/1200 → `'row'`; limit `null` → `'row'`.
  - `playersLimit`: two `.gg-cards` children → second's left; Clean panel → its left; Home `.gh-normal-cards` → second's left; one card → the split formula; nothing → `null`.
  - `observePlayersPlacement`: sets `--gg-family-w` to the family pill's width (`0px` without one); sets `data-players="above"` when the pill's row position crosses the line; **changing the pill's text so it grows past the line flips it to `above` without other events** (Review Focus 3); the stop function disconnects both observers and removes the attribute.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS. **Checkpoint:** `tsc` clean.

### Task 5: The pill on the game page (and PlayCount)

**Files:**
- Create: `src/components/PlayersPill.tsx`
- Modify: `src/components/GameHero.tsx:323-329`, `src/components/GameSourcePill.tsx` (render condition), `src/styles/themeCss.ts` (restyle block near `.gg-family`, ~line 1017; shade-none glass list ~1089; arrival `shared` list ~1132), `src/styles/theme.ts:142` (`playRowControlSelector`), `src/components/PlayRowNav.tsx` (the two `.gg-copy-pill, .gg-store-choice` selectors)
- Test: `tests/components/playersPill.test.ts`, `tests/styles/themeCss.test.ts`

**Interfaces:**
- Consumes: Task 2 `usePlayerCount`, Task 3 `playerCountPill`, Task 4 `observePlayersPlacement`, `PLAYERS_PAGE_MAX_AGE_MS`, `PLAYERS_POLL_MS`.
- Produces:
  - `PlayersPill({ count, locale, className, dotClassName, chart }: { count: number; locale: string; className: string; dotClassName: string; chart?: (() => void) | null }): JSX.Element` — a `span` (or a `Focusable` with `focusClassName="gg-players-focus"`, `onActivate`/`onClick` = `chart`, `aria-label` "<n> playing: Open player chart" when `chart` is given), marked `data-players-pill`.
  - `usePlayCountBadge(doc: Document | null, active: boolean): (() => void) | null` — watches for `.playerBadge > button` (MutationObserver), adds class `gg-native-playcount` to `.playerBadge` while `active`, removes it on cleanup; returns a function that clicks that button, or `null` when there is none.
  - CSS classes: `.gg-players` (look), `.gg-players-dot`, `.gg-players-choice` (focusable variant), `.gg-pill[data-players="above"] > .gg-players`, `.gg-native-playcount { visibility: hidden !important; pointer-events: none !important; }`.

- [ ] **Step 1: Failing tests:**
  - `PlayersPill` renders `20,663 playing` for `count 20663, locale 'en-US'` and `0 playing` for 0 (Review Focus 1); is a plain `span` without `chart`, a `Focusable` with the aria label with it.
  - `usePlayCountBadge` (linkedom): returns `null` without a badge; after a `.playerBadge > button` is added, returns a function that clicks it; adds `gg-native-playcount` only while `active`, and removes it when `active` goes false and on unmount; **when the badge never appears, nothing is hidden and the result stays `null`** (Review Focus 4).
  - themeCss (restyle): `.gg-players` has `sourcePillLook(d)` and `position: absolute`, `right: calc(100% + <10 d>)` to the left of the family pill when there is one (`.gg-pill:has(> .gg-family) > .gg-players` adds the family pill's width via the `--gg-family-w` custom property set by `observePlayersPlacement`), and `[data-players="above"] > .gg-players` uses `right: 0; bottom: calc(100% + <10 d>); top: auto; transform: none`; with the store pill off (`.gg-pill-bare`) and no family pill, `.gg-players` sits at `right: 0` (the store pill's place), and with a family pill at `right: calc(var(--gg-family-w) + <10 d>)`; `.gg-players` is in the shade-none glass list; `.gg-players` is in the arrival `shared` list unless `extra.players` (Task 6 sets it).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** In `GameHero`, render `<PlayersPill>` as the last child of `GameSourcePill` when `restyle && settings.playerCountPill && !game.isShortcut && count !== null`, with `chart` from `usePlayCountBadge(pageDoc, restyle && settings.playerCountPill && count !== null)`; render `GameSourcePill` when any of store, family or player pill shows (bare when the store pill is off). Run `observePlayersPlacement(holder, pageRoot)` in a layout effect keyed on the pill's presence. The launch overlay hides the pills by where they sit (inside `.gg-hero`, covered by `launchTargets`), not by name: add no rule, only a themeCss test that `buildLaunchCss`'s hide list covers an element inside `.gg-hero` (so the player pill goes with the store and family pills). Add `.gg-players-choice` to `playRowControlSelector` and both `PlayRowNav` selectors.
- [ ] **Step 4: Run** `npx vitest run` — all PASS. **Checkpoint:** `tsc` clean; deploy to the Ally; with Michael's go-ahead, open the Witcher 3 page and confirm the pill is above, frosted, and A opens PlayCount's chart.

### Task 6: Home and the open transition

**Files:**
- Modify: `src/home/HomePills.tsx` (new `players?: number | null` prop, rendered after the family pill), `src/home/SpotlightHome.tsx` (~line 514: `usePlayerCount(game && !isShortcut ? game.appId : null, { maxAgeMs: PLAYERS_HOME_MAX_AGE_MS, enabled: settings.playerCountPill })`, pass to `HomePills` and `OpenExtras`; show the holder when any pill shows), `src/home/OpenExtras.tsx` (`players` prop → `<PlayersPill className="gh-x-players" …>` inside `SourcePill`), `src/home/homeCss.ts` (`.gh-players`, `.gh-x-players` rules mirroring Task 5's; add `.gh-players` to `HOME_GLASS` and the `${N}` glass lists), `src/home/pillOpen.ts` (move `.gh-x-players` from `.gh-players` as `.gh-x-family` is moved), `src/data/openIntent.ts` + `src/home/homeNav.ts:322` (`homePlayers = root.querySelector('.gh-players') !== null`), `src/components/GameHero.tsx` (`players: arrival.intent.homePlayers` into `arrivingCss`)
- Test: `tests/home/pillOpen.test.ts`, `tests/home/homeCss.test.ts`, `tests/styles/themeCss.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5 (`usePlayerCount`, `PlayersPill`, `observePlayersPlacement`, the `.gg-players` CSS contract).
- Produces: `OpenIntent.homePlayers?: boolean`; `arrivingCss` extra `players?: boolean`; Home classes `.gh-players`, `.gh-x-players`.

- [ ] **Step 1: Failing tests:**
  - `preparePillOpen` gives `.gh-x-players` a `--pill-from` from `.gh-players`'s position (as the family test does), and restores it on undo.
  - homeCss: `.gh-players` takes `sourcePillLook(px)` and is in `HOME_GLASS`; `[data-players="above"] > .gh-players` and `.gh-x-players` placements match the page's; `.gh-players` never appears with `pointer-events: auto`.
  - themeCss arrival: with `extra.players` true, `.gg-players` is not in the arriving list; false or absent, it is.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** Run `observePlayersPlacement` on Home's `.gh-source` holder with Home's root, and on the open copy's `.gh-x-pill` against the page targets' root.
- [ ] **Step 4: Run** `npx vitest run` — PASS. **Checkpoint:** `tsc` clean.

### Task 7: On the Ally

**Files:** none (verification).

- [ ] **Step 1:** Build, back up, install and reload (Global Constraints). Ask Michael before any screenshot or recording.
- [ ] **Step 2:** With Michael driving, check each (read-only probes; screenshots via `Page.captureScreenshot` of "Steam Big Picture Mode" with his OK):
  - Witcher 3 on Home and its page: pill above the pills, frosted (measure as in the family pill fix: edge mean inside the pill under ~1), same place on Home and page, carried across by the open transition, no flicker on the way back to Home.
  - A game without a family pill and a short row: pill in the row.
  - A shortcut (e.g. The Messenger): no pill.
  - Pressing the pill on the page opens PlayCount's chart; B closes it and focus returns to the pill.
  - Toggle off: no pill on Home or the page; PlayCount's white badge back on the page at once.
  - Page left open 5+ minutes: the number refreshes in place (log the pill's text with a read-only probe).
- [ ] **Step 3:** Report results to Michael; fix anything found in the owning task before he decides on a commit.
