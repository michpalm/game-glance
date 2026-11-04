# Library Search (C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn 4.0's typing-only Search into the approved centered overlay with live library matches and game-page navigation.

**Architecture:** Extend the existing chrome-owned `createHomeSearch` session; do not create another global owner. Separate Steam capability discovery, pure matching/state, keyboard geometry, pure presentation and mounted integration. Steam adapters supply guarded values through injected ports; the production overlay uses the same components and state as the tests and visual fixture.

**Tech Stack:** Existing TypeScript, React, `@decky/ui`, Vitest, linkedom, Rollup and shared VDL tokens; no new product dependency.

**Spec:** `docs/superpowers/specs/2026-11-04-library-search-design.md` (written spec approved by Michael: "looks good").

## Global Constraints

- "No Store provider, search history, filters, direct launching, new keyboard, new setting, or separate full-page results route is included."
- "Existing parent settings and the On every page setting continue to govern where Search is available."
- "If library membership or hidden-state filtering is unavailable, show the unavailable state instead of exposing unfiltered cached records."
- "Do not add an always-on library scan or polling timer."
- "Installed state does not override relevance."
- "Do not persist them to settings or disk."
- "Reuse the actual Steam main-window owner document supplied by `ChromeHost`."
- "Keep the existing 4.0 branch, package version and unrelated feature code unchanged during Search implementation."
- Preserve Social Send, Compact/Radial defaults, Radial D-pad cursor movement, Radial X Close and B Delete, and release-to-open handling of A.
- No installation/reload, push, PR, merge or release without the user's separate authorization. Read-only runtime inspection does not authorize any of those actions. Do not log real account IDs, names, library inventories or Friends data in committed probes/fixtures.

## Review Focus

1. Cached non-library records and a throwing/missing hidden-state predicate must not leak into results (Task 1).
2. A response for a previous account or opening must not restore old results, artwork, installation state or focus (Tasks 3 and 6).
3. Results and Close currently converge through the keyboard-session subscription; they must become distinct without changing Social or letting A reach Play (Tasks 3, 4 and 6).
4. A dragged Compact keyboard, Radial fallback or dense status bar must not cover the query and every result row at 829×467 (Tasks 4, 5 and 7).
5. The chrome host survives route changes: suspension, successful navigation and navigation failure must release or preserve Search correctly without focus returning over another owner (Tasks 1, 3 and 6).

## Checkout, file map and commands

Use the suitable existing checkout `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`, branch `release/4.0`. Before implementation, follow using-git-worktrees to confirm it remains suitable; do not switch branches or create a worktree automatically. Planning baseline: `6bd6425`, clean. Recheck the actual HEAD and working tree when execution begins.

| Area | Files |
|---|---|
| Steam library + route contracts | New `scripts/cef-search-contract.mjs`, `src/search/library.ts`, `src/search/steam.ts`, `docs/validation/4.0-search-contract.md` |
| Matching | New `src/search/match.ts` |
| Session | Existing `src/home/homeSearch.ts`; new `src/search/model.ts` for shared types |
| Keyboard bounds | Existing `src/menu/keyboard/context.ts`, `src/menu/components/MenuKeyboard.tsx`, `src/menu/components/RadialKeyboard.tsx` |
| Pure view + placement | New `src/search/SearchOverlay.tsx`, `src/search/layout.ts`, `src/search/styles.ts` |
| Runtime + metadata | New `src/search/useLibrarySearch.ts`, `src/search/metadata.ts`, `src/search/navigation.ts` |
| Existing integration | `src/home/HomeSearchControl.tsx`, `src/home/useHomeControls.ts`, `src/chrome/useChrome.ts`, `src/chrome/ChromeHost.tsx` |
| Validation fixture | New `scripts/search-preview.mjs`, `docs/validation/4.0-library-search.md`; tests under `tests/search` and existing Search/chrome/keyboard tests |

Tests use `pnpm exec vitest run <files or directories>`; all tests: `pnpm test`; typecheck: `pnpm typecheck`; build: `pnpm build`. Preserve real DOM/portal behavior with `vi.unmock('react-dom')` for mounted tests, following `tests/home/homeSearchIntegration.test.ts` and `tests/chrome/useChrome.test.ts`. Stub Steam and Decky capabilities, not the Search state or view being tested. Current tests are `.test.ts`; use `createElement` in mounted tests.

Commit each completed task's files explicitly, after `git diff --check`. Use Michael Palma's identity `18511803+michpalm@users.noreply.github.com`. Never stage unrelated work. The commit messages below do not authorize a push.

### Task 1: Verify and guard the library, account and route sources

**Files:** Create the four contract files in the map; `tests/search/library.test.ts`, `tests/search/steam.test.ts`, `tests/search/fixtures/library-contract.json`.

**Interfaces:**

```ts
// src/search/model.ts (created here; extended in Task 3)
export type Stop = () => void;
export interface LibraryEntry {
    appId: number; title: string; edition?: string;
    kind: 'game' | 'demo' | 'shortcut'; installed: boolean | null;
}
export type LibrarySnapshot =
    | { status: 'loading' | 'unavailable'; account: string | null }
    | { status: 'ready'; account: string; entries: readonly LibraryEntry[] };
// src/search/library.ts
export interface LibrarySource {
    read(account: string): LibrarySnapshot;
    subscribe(account: string, changed: () => void): Stop;
}
// src/search/steam.ts
export interface RouteSource { get(): string | null; subscribe(changed: () => void): Stop }
export interface SearchEnvironment {
    library: LibrarySource; route: RouteSource;
    navigate(path: string): void;
}
export function searchEnvironment(doc: Document): SearchEnvironment;
```

- [x] **Step 1 — inspect without mutation.** Build `scripts/cef-search-contract.mjs` using the debugger connection pattern from `scripts/cef-open-probe.mjs`, but no virtual button presses, function setters, navigation, reloads or installation. Accept the debugger base URL as an argument. Inspect Steam's main-window library collections, membership/availability, readiness, hidden-state predicate, account generation, route history and their subscription contracts. Invoke only verified getters; never call unknown functions to see what they do. Print capability names, value types and aggregate counts only. Record the exact getter and unsubscribe contracts, readiness semantics and existing route-change signal in `docs/validation/4.0-search-contract.md`. No guessed `allGamesCollection` property, cached-overview ownership heuristic, history monkeypatch or timer fallback. The readiness subscription must distinguish an empty ready library from a not-yet-loaded one. If no device/debugger is reachable, continue pure tasks with injected ports and record live contract verification as outstanding; do not mark production binding complete.
- [x] **Step 2 — failing tests.** Fixture cases: eligible installed game, uninstalled game, demo, shortcut; unrelated cached store app; hidden game; tool, DLC, soundtrack; duplicate ID; same title/two IDs; null account; loading then ready-empty; missing or throwing membership/hidden predicate. Assert the four eligible IDs only, one entry per ID, two same-title editions preserved, and unavailable rather than unfiltered output on missing/throwing security boundaries. Test source subscriptions dispose once, propagate readiness/account/library changes, and never enumerate/fetch details per keystroke. Route fixture emits a departure on history changes even when the chrome host remains mounted; disposal removes the listener. Use fabricated IDs/titles in the committed fixture.
- [x] **Step 3 — run** `pnpm exec vitest run tests/search/library.test.ts tests/search/steam.test.ts`; expect failures for missing modules/behavior.
- [x] **Step 4 — implement** the interfaces above using only the verified Steam contracts. Filter native types 1 (game), 8 (demo), 1073741824 (shortcut), then membership/visibility; preserve the library's valid numeric shortcut IDs. Do not treat every `appStore.allApps` item as owned. `searchEnvironment(doc)` is per-window, inert until a subscriber/opening, and returns unavailable capability states if verification fails. Do not mutate Steam collections or apply Home row limits. Keep installation null for shortcuts whose true state is not yet established.
- [x] **Step 5 — rerun** the two files and `pnpm typecheck`; expect all tests pass and no type errors. Commit `Search: guard library membership and observe the main-window route`.

### Task 2: Implement deterministic local title matching

**Files:** Create `src/search/match.ts`, `tests/search/match.test.ts`.

**Interfaces:** Consumes `LibraryEntry`. Produces `normalizeSearch(text: string): string`, `indexLibrary(entries: readonly LibraryEntry[]): readonly IndexedEntry[]`, `matchLibrary(index: readonly IndexedEntry[], query: string): readonly LibraryEntry[]`; `export interface IndexedEntry {entry: LibraryEntry; title: string; words: readonly string[]}` retains the original display entry and precomputed search forms.

- [x] **Step 1 — failing tests.** `normalizeSearch('  POKÉMON—Blue! ') === 'pokemon blue'`; punctuation-only returns `''`; `ori blind` matches `Ori and the Blind Forest`. For query `ori`, assert exact `Ori`, full prefix `Ori and the Blind Forest`, word-prefix `The Original Game`, then substring `Gloria`, regardless of input order or installation flags. Require all query tokens; reject a title containing only one token. Assert punctuation-to-space semantics, composed/decomposed accents, non-Latin letters/numbers, deterministic normalized-title then numeric-ID tie order, same-title distinct IDs and untouched display titles. Empty query returns no results. Matching must not call any source, network, artwork or details port.
- [x] **Step 2 — run** `pnpm exec vitest run tests/search/match.test.ts`; expect missing-module/behavior failures.
- [x] **Step 3 — implement** NFD decomposition, removal of Unicode combining marks, lowercase, replace characters outside Unicode letters/numbers/whitespace with spaces, collapse/trim. Precompute title/word forms once per snapshot. Match all tokens, rank by the spec's four tiers, then compare normalized titles with a deterministic code-point comparator and numeric IDs. No fuzzy dependency, debounce or timer.
- [x] **Step 4 — rerun** the file and typecheck. Commit `Search: match and rank library titles locally`.

### Task 3: Extend the one Search session for field, typing and browsing

**Files:** Modify `src/home/homeSearch.ts`, `src/search/model.ts`, `tests/home/homeSearch.test.ts`; create `tests/search/session.test.ts`.

**Interfaces:** Keep `createHomeSearch()`, `get`, `subscribe` and `dispatch` compatible at their entry points; add `dispose()`. Keep phases `hidden`, `top`, `editing`; add `field` (overlay open, keyboard closed) and `results`. Export `searchOverlayOpen(state): boolean`. Extend `HomeSearchState` with `epoch: number`, `library: LibrarySnapshot`, `matches: readonly LibraryEntry[]`, `focusedAppId: number | null`, `scrollTop: number`, `openError: boolean`. Existing draft/account fields remain. Add events `keyboard-close`, `results`, `back`, `focus-result {appId}`, `scroll {top}`, `library {epoch, snapshot}`, `open-error {epoch}`, `dismiss`; keep `enter`, `edit`, `draft`, `content`, `suspend`, `account`. Make existing `complete` an alias of Results during migration. Epoch increments whenever account/session invalidation makes pending work stale; non-current library/error events are ignored. No source reads occur in the reducer.

- [x] **Step 1 — failing tests.** Enter exposes only the top pill; edit opens typing; draft updates matches without focusing a row. Results closes typing and sets the first ID when matches exist, otherwise phase field. Keyboard-close always selects field and preserves draft. Back results→field; Back from field→hidden and requests page-focus restoration; dismiss→hidden; content/suspend→hidden. Ordinary dismissal preserves draft/scroll/last result; account change including null clears all three and invalidates previous events before any notification can expose them. Results action always chooses the first match; retained last focus is available when re-entering results from field without a query edit. Metadata/snapshot updates preserve focused ID; removal chooses the same position, preceding row, or field in that order. Dispose clears data, listeners and pending eligibility. Late epoch events do nothing. Cover existing preview state tests with the intentionally changed completion behavior.
- [x] **Step 2 — run** `pnpm exec vitest run tests/home/homeSearch.test.ts tests/search/session.test.ts`; expect failures.
- [x] **Step 3 — implement** immutable stable snapshots and preindexed matching from Task 2, rebuilt only when the ready library snapshot changes. Event `edit` is accepted from top, field or results; it preserves text and opens the keyboard. Maintain one store in `useChrome`; no persistence or Social store access. Keep the existing `homeSearchBounds` for the unopened entry pill only.
- [x] **Step 4 — rerun** targeted tests and typecheck. Commit `Search: separate editing, field and result navigation states`.

### Task 4: Give Search measured keyboard bounds without changing Social

**Files:** Modify `src/menu/keyboard/context.ts`, `src/menu/components/MenuKeyboard.tsx`, `src/menu/components/RadialKeyboard.tsx`; extend `tests/menu/keyboard/context.test.ts`, `tests/menu/keyboard/placement.test.ts`, `tests/menu/keyboard/radialSurface.test.ts`, `tests/menu/radialKeyboard.test.ts`; create `tests/search/keyboardGeometry.test.ts`.

**Interfaces:** Add exported `KeyboardRect {left:number;top:number;width:number;height:number}` and optional context callbacks `placementBounds?(): KeyboardRect | null` and `onBoundsChange?(rects: readonly KeyboardRect[]): void`. Rectangles are actual main-window CSS pixels, not menu units. No callbacks means existing Social geometry and behavior. Compact constrains its existing placement/drag area through `placementBounds`; Radial reports its two actual wheel bounds. Report `[]` on close/unavailable/dispose. Retain `completionLabel`, `host`, `ownsInput`, `restoreFocus`.

- [x] **Step 1 — failing tests.** In a Search context, completion label is Results, native completion callback invokes Results once, and session.close invokes only keyboard-close. Social with no context still says Send and calls Send. Verify Compact reports placed, dragged and resized screen rectangles and clamps a saved position into the supplied band without persisting the automatic clamp. Radial reports both wheels, clears reporting on fallback/close, and still maps D-pad to cursor, B to Delete and X to Close. Context calls only belong to the active session; stale disposal cannot clear a newer session's bounds. Compact's accessible completion label must also be Results (the current `ariaOf(send)` literal needs the context label).
- [x] **Step 2 — run** the five listed test files plus `tests/menu/keyboard/session.test.ts`; expect new behavior tests to fail.
- [x] **Step 3 — implement** the optional callbacks at Compact placement, direct drag writes/drop and resize, and Radial computed bounds/cleanup. Convert through the existing root scale with `toMenuRect`; do not use Home logical units as CSS pixels. Deduplicate bounds notifications and avoid an update loop. Search owns completion-vs-close distinction by updating its state before `session.close`; do not add Search behavior to Social defaults or remove either keyboard's existing outside-tap handling.
- [x] **Step 4 — rerun** these tests and typecheck. Commit `Keyboard: report placement bounds to Search and preserve close semantics`.

### Task 5: Render C and navigate its scrollable result list

**Files:** Create `src/search/layout.ts`, `src/search/styles.ts`, `src/search/SearchOverlay.tsx`, `tests/search/layout.test.ts`, `tests/search/view.test.ts`, `tests/search/resultNavigation.test.ts`; extend shared types in `src/search/model.ts`.

**Interfaces:**

- Export `SearchOverlayLayout {left:number; top:number; width:number; listHeight:number; keyboardBand:KeyboardRect}` from `layout.ts` and `searchOverlayLayout(input: {viewport:{width:number;height:number}; scale:number; statusBottom:number; keyboards:readonly KeyboardRect[]; rowHeight:number}): SearchOverlayLayout | null`, all output CSS pixels. `viewport` is `{width:number;height:number}`, `keyboards` is readonly KeyboardRect[]. Use `homeCanvas`'s scale convention, a 750-logical-px width and at least 24-logical-px side clearance. Keep field/header/top stable across keyboard show/hide; listHeight uses available space above the highest intersecting keyboard bound. The initial keyboardBand must leave field, header and one complete measured row unobstructed before the first keyboard report, avoiding measurement deadlock. A dragged Compact panel remains inside that band. Clamp finite output; unsupported/zero geometry renders no interactive overlay.
- Export `interface ResultMetadata {capsuleUrls:readonly string[]; installed:boolean|null}` from `model.ts`.
- `SearchOverlayProps {state:HomeSearchState; layout:SearchOverlayLayout; metadata:ReadonlyMap<number,ResultMetadata>; field:ReactNode; listRef:Ref<HTMLDivElement>; onResult(appId:number):void; onFocus(appId:number|null):void; onBack():void; onRetry():void; onScroll(top:number):void;}`. The container supplies the one field/keyboard; pure overlay views do not discover Steam or own sources.
- `resultWindow({count, scrollTop, rowHeight, viewportHeight, focusedIndex}): {start:number;end:number;before:number;after:number}` renders visible rows plus two-row overscan on each side and always includes the keyboard-focused row. Use app IDs as React keys; counts describe all matches, not the window.

- [x] **Step 1 — failing tests.** At 829×467, 1280×800 and 1500×845 with both measured keyboard modes, assert field/header/at least one whole row fit, overlay stays in bounds, keyboard does not intersect those elements, and opening/closing the keyboard only changes list height. Add moved Compact, Radial→Compact fallback, dense status, invalid dimensions, long title and long scrolling-list cases. View assertions cover Library matches, 1 game/N games, Search your library., No games found, Loading library…, Library unavailable. Try again./Retry, and Couldn't open this game. Try again. Unknown installation omits the label; no URL or exhausted URLs shows placeholder while keeping title; optional edition remains separate, not parsed from title. Navigation tests assert Up/Down clamp, first Up→field, Back→field, ID-preserving update/removal and list-only scroll. Windowing tests cover empty list, count shrink, restored scroll beyond the new end and focused row outside the previous window.
- [x] **Step 2 — run** `pnpm exec vitest run tests/search/layout.test.ts tests/search/view.test.ts tests/search/resultNavigation.test.ts`; expect failures.
- [x] **Step 3 — implement** pure placement and views with VDL tokens/recipes. Use card-like rows, neutral white focus ring and no lift/accent focus fill. Retain all matched entries but window DOM/artwork work. Shared keyboard and compact entry pill remain outside these pure views. Use the existing `DraftText` field renderer; do not mount two field copies. Background backdrop intercepts activation; status remains visible. Field/header stay outside the scrolling region; overflow and scroll padding keep focused rows clear. Use accessible named dialog/search field and a restrained polite count/status announcement, without exposing every keystroke as an alert. Honor reduced motion.
- [x] **Step 4 — rerun** targeted tests and typecheck. Commit `Search: draw the centered overlay and virtualized library rows`.

### Task 6: Wire metadata, navigation, chrome ownership and cleanup

**Files:** Create `src/search/useLibrarySearch.ts`, `src/search/metadata.ts`, `src/search/navigation.ts`, `tests/search/metadata.test.ts`, `tests/search/navigation.test.ts`, `tests/search/lifecycle.test.ts`; modify the four existing integration files in the map and their Search/chrome/focus tests.

**Interfaces:**

- `createResultMetadata({capsules:(id:number)=>readonly string[], installed:(id:number)=>Promise<boolean|null>}): {get():ReadonlyMap<number,ResultMetadata>;subscribe(fn:()=>void):Stop;visible(entries:readonly LibraryEntry[], epoch:number):void;reset():void;dispose():void}`. Inputs are only Task 5's visible+overscan entries. Use existing `capsuleUrls(id,browserStores)` and `unifideckInstalled(id)`. For ordinary Steam games use the known entry install state; shortcuts start unknown and are enriched only through the verified shortcut/provider path. Generic shortcut unknown stays unlabeled. No per-title backend lookups while matching; reuse metadata within an account and discard old-epoch completions.
- `openSearchResult(appId:number, env:SearchEnvironment):Promise<'opened'|'failed'>`: validate the current library entry at the caller; navigate via `env.navigate('/library/app/'+appId)`, confirm that path with `env.route`, fail on throw or no confirmation within 5000 ms. Unsubscribe and cancel the one-shot deadline on all outcomes. Immediate route confirmation succeeds without waiting. This is a navigation deadline, not polling.
- `useLibrarySearch({doc,search,active,environment,returnToPage}): {metadata:ReadonlyMap<number,ResultMetadata>; retry():void; openResult(appId:number):void; dismiss(restore:boolean):void;}`. `returnToPage` is the current chrome redirect's remembered-page fallback. Source subscriptions exist only while overlay open; retry rereads/subscribes without stacking listeners. Capture route/account/epoch at opening.
- Extend `HomeSearchFocus` with optional `busy?():boolean`, defaulting to its existing `editing()` when absent. In `createHomeStatusFocus`, broad busy suppresses header/status navigation and automatic hide while the overlay owns focus; actual keyboard checks keep using editing only. `useChrome` supplies `searchOverlayOpen(search.get())`. Header redirect busy uses the same broad predicate. Return an explicit `returnToPage():void` bridge from `useChrome` using existing redirect/back behavior; do not call Home's `openPage` or `openGame`, both of which touch Home transition state.

- [x] **Step 1 — failing tests.** Mount the actual HomeSearch/overlay against injected Steam ports in the existing linkedom harness. Exercise top pill→typing→Results→row→game page, X Close→field, Results with empty/no matches, Compact cancel, physical Enter, B/delete ordering, result pointer activation and duplicate held-A suppression. Assert no background Play/click/wheel, no Social draft/send, and no Home hero mutation. Assert the entry pill is not duplicated while the field is in the overlay. Opening a result revalidates eligibility; a removed/hidden result cannot navigate. Failed/timeout navigation retains query and error; confirmed navigation closes with no return-focus action.
- [x] **Step 2 — add lifecycle failures.** Route departure without unmount, side menu, launching, screensaver, host disable/disposal and lost document ownership each close/release without refocusing. Account change clears immediately; late library/art/Unifideck/navigation responses cannot change the new state or take focus. Reopening the same account restores query/scroll; no automatic reopening after game-page return. Removed previous-page target uses chrome fallback. Keyboard-mode change returns to field only while overlay remains owner. Native header focus arriving while browsing results does not steal focus. Old source unsubscribe is idempotent, and no listener/timeout/observer remains after dispose. Metadata work covers only window+overscan; unknown Unifideck state never becomes a false Installed label.
- [x] **Step 3 — run** `pnpm exec vitest run tests/search tests/home/homeSearchIntegration.test.ts tests/home/homeControlsFocus.test.ts tests/home/homeKeyboardRuntime.test.ts tests/chrome`; expect new integration tests to fail before wiring.
- [x] **Step 4 — implement** the hook and ports, then reduce `HomeSearchControl` to entry/editor/session wiring plus production SearchOverlay. Pass Results through KeyboardContext. Its keyboard-session close subscription dispatches keyboard-close only when still editing, so a prior Results transition cannot be overwritten. The backdrop's outside tap respects shared keyboard dismissal and consumes the entire gesture; do not install two competing first-tap listeners. Gate every focus task, async completion and scheduled layout repair on current account/epoch, connected owner document and active ownership. Suspend Search before chrome release can repair focus into the old page. Reuse the existing route/account source; no history patches or interval. When reopening, refresh the index and repair retained scroll/focus before drawing stale rows.
- [x] **Step 5 — rerun** targeted tests, `pnpm test`, `pnpm typecheck` and `pnpm build`; all must pass. Commit `Search: integrate library results with chrome and shared keyboards`.

### Task 7: Verify production rendering, performance and device acceptance

**Files:** Create `scripts/search-preview.mjs`, `docs/validation/4.0-library-search.md`; update the spec's implementation status. Keep captures in the task's writable visualization output, not committed private device data.

**Interfaces:** The preview fixture mounts the production HomeSearch/SearchOverlay and shared keyboards with injected library/route/feed adapters, following the existing `tests/home/fixtures/home-controls-native.ts` approach. It is not a parallel CSS implementation. Offer deterministic fixture cases: empty query, no matches, loading, unavailable, long title, missing art, 5000 library entries, dense status, Compact and Radial. No fixture query can call a live Steam method.

- [ ] **Step 1 — verify and render.** Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`. Render production typing and browsing states at the three spec viewports with both keyboards over bright/dark frames. Inspect every capture; check field/one row availability, count/layout stability, placeholder readability, actual white focus ring, long title wrapping and reduced motion. Exercise scroll, keyboard drag/fallback, pointer outside-tap order and route/account switching in the browser. Record which cases are real rendering versus mocked contracts. Fix failures in their owning modules and rerun only affected checks before the final full run.
- [x] **Step 2 — performance evidence.** Measure indexed warm matching on 5000 synthetic entries separately from index construction and artwork work. Record median and p95 for 30 warm passes on the execution machine, with no time-threshold unit test. After authorized device access/build installation, repeat on the tested handheld and assess the spec's 16 ms warm-pass target. Desktop timing does not satisfy that target; investigate before claiming it if the handheld exceeds it.
- [x] **Step 3 — whole-change review.** Review diff against every spec requirement and the five Review Focus items, including actual bindings from Task 1. Use the selected execution workflow's reviewer; user selection of Native includes its independent final review. Resolve findings and rerun affected checks. Confirm package version/settings/dependencies remain unchanged.
- [ ] **Step 4 — device validation after separate authorization.** Before installation, identify the actual current device/build and record backups through the existing authorized installation workflow. On Ally and Steam Deck, check Home, game page and Library with expanded chrome enabled: both keyboards; result scrolling/opening; Back/outside tap; return focus; online/offline cached-library use; missing artwork; hidden-game exclusion. Confirm route departure/menu/screensaver/disable cannot resurrect Search. Do not launch a game or send a chat as part of Search acceptance. If either device or installation approval is unavailable, mark that coverage explicitly pending, without blocking truthful reporting of completed local work.
- [x] **Step 5 — record and commit.** Document command outcomes, current commit/build identities, screenshots, read-only contract evidence and device/performance coverage separately in `docs/validation/4.0-library-search.md`. Update the spec to distinguish implemented/local validation/device acceptance. Commit `docs: record library Search validation and coverage` once those facts exist; never prefill passing results.

## Plan self-review and handoff

Coverage: scope/source/hidden-state/readiness → Task 1; matching and performance preparation → Task 2; draft/account/focus lifetime → Task 3; shared keyboard compatibility/geometry → Task 4; C, empty/error states/windowing → Task 5; navigation/input ownership/async isolation → Task 6; production renders/whole-change review/handheld performance and acceptance → Task 7. All five Review Focus cases have named behavior tests above. The Steam membership/readiness/route API is deliberately a verified discovery deliverable, not an invented method signature; production wiring remains incomplete until that evidence exists.

This document is a plan, not an implementation or a claim that checks passed. User review of the plan and selection of Native or Subagent-driven execution precede product-code changes. Native is recommended because the session, keyboard and chrome changes share focus/lifetime interfaces and benefit from one implementer retaining their context; independent final review remains part of that method. Michael selected Native. Local implementation/review-fix validation is complete; installed-device acceptance and the expanded visual matrix remain explicitly pending in the validation record.
