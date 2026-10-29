# Home Search Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans with the user's preserved Native preference. Implement task-by-task with RED→GREEN checks and one fresh whole-change review at the end. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reveal a clickable Search pill only on entering Home's top controls; activation expands a draft field and opens the saved keyboard while our Home controls replace Steam's header.

**Architecture:** Extend the current Home focus coordinator with a small Search session and reversible native-header lease. Give the existing Compact/Radial keyboards an optional host context with Social-compatible defaults. Share existing Steam UI runtime observations between the Home coordinator and status portal rather than adding another timer.

**Tech Stack:** TypeScript, React19.1.1, Decky UI, Vitest/linkedom, Rollup, local browser fixtures.

**Spec:** `docs/superpowers/specs/2026-10-29-home-search-preview-design.md` (approved by user: “yes, continue”).

## Global Constraints

- Existing `homeExpandedControls` opt-in defaults false; effective only with enabled Spotlight Home and Status bar. No extra feature toggle.
- Search hidden and unfocusable during content browsing; reveals on upward entry into our top controls; stays visible while editing/keyboard owns input.
- No native Search invocation, queries, results, filtering, history or submission. No new status activation destinations/Home/Back shortcuts.
- Use saved Compact/Radial preference even if custom menu is disabled. Preserve Social's existing defaults and drafts.
- Native header suppressed visually and for input only while expanded Home owns the screen; exact restoration on suspension/disable/unmount and safe fallback on unknown DOM.
- Keep native footer nodes/glyphs/labels and measured reserve; include local footer correction `b64698d` in later builds.
- No extra baseline polling; remove the old unconditional Home watchdog while sharing existing menu/header observations. No new production dependencies.
- No device access beyond the current approved check, installation/reload, push/PR/merge/release without appropriate user approval. Device input tests never require Play activation or chat sends.

## Review Focus

1. A radial keyboard holds input without changing DOM focus; Search must stay revealed and Home selection/Play must not receive its buttons — Tasks1/3/4.
2. A native header rerender, nested explicit visibility or overlapping owner must never leave invisible native focus targets or restore another owner's attributes — Task2.
3. A menu, launch, account change or keyboard failure during an asynchronous open must tear down editing once without restoring focus over the new owner — Tasks1/3/4.
4. Dense status cells, handheld scaling, long labels or resize must keep the expanded field and both keyboard variants readable without overlap/clipped outlines — Tasks3/4/5.
5. Social's original host, completion hints, drag lifetime and focus return must remain equivalent after optional keyboard-context changes — Task3.

## Files and interfaces

- `src/home/homeSearch.ts`: pure session/geometry policy; no React or native calls.
- `src/home/homeHeaderDom.ts`: verified header lease with shared reversible ownership; uses existing `createTopBarFinder`.
- `src/home/steamUiState.ts`: shared per-document runtime snapshot/subscription, replacing the two existing status-portal menu/top-focus intervals and Home watchdog.
- `src/home/useHomeControls.ts`, `homeControls.ts`: Search entry/visibility/editing and existing status repair/navigation.
- `src/home/HomeSearch.tsx`, `homeControlsCss.ts`: Home Search presentation and Home-owned keyboard host.
- `src/menu/keyboard/context.ts`, `styles.ts`: optional keyboard context and shared keyboard-only CSS.
- Existing keyboard components, Social stylesheet, status portal/SpotlightHome and preferences store integrate these interfaces; preserve defaults.

```ts
// homeSearch.ts
export type HomeSearchPhase='hidden'|'top'|'editing';
export interface HomeSearchState {phase:HomeSearchPhase;draft:string;account:string|null}
export type HomeSearchEvent={type:'enter'}|{type:'edit'}|{type:'draft';text:string}|{type:'complete'}|{type:'content'}|{type:'suspend'}|{type:'account';account:string|null};
export function reduceHomeSearch(state:HomeSearchState,event:HomeSearchEvent):HomeSearchState;
export function homeSearchBounds(viewport:{width:number;height:number},status:{left:number;top:number;width:number;height:number},editing:boolean):{left:number;top:number;width:number}|null;
// Header lease: callback false means unavailable; no hidden-header ownership without successful discovery.
export function acquireHomeHeader(root:HTMLElement,available:(ready:boolean)=>void):{suspend(value:boolean):void;dispose():void};
// Shared UI snapshot; account reads existing App.m_CurrentUser.strSteamID shape, never logs it.
export interface SteamUiState {foreground:boolean;menu:boolean;nativeHeaderFocused:boolean;account:string|null}
export function getSteamUiState(doc:Document):SteamUiState;
export function subscribeSteamUiState(doc:Document,listener:()=>void):()=>void;
// Optional keyboard context; absence preserves all existing Social host/return semantics.
export interface KeyboardContext {host(field:HTMLElement):HTMLElement|null;ownsInput():boolean;restoreFocus(field:HTMLElement):void;completionLabel:string}
```

Task3 adds `context?:KeyboardContext` to both keyboard component props, plus optional completion-label props on stateless panels/views. `canSend/send` remain their compatible internal completion interface: Home supplies true and a close-editor callback, Social supplies its current send behavior. Do not persist the Home draft. The shared preference singleton moves to `src/menu/preferences.ts` (export `menuPreferences`) and `startMenu.ts` re-exports/imports it, avoiding a Home→menu-startup dependency.

### Task 1: Search session and top-control navigation

**Files:** create `src/home/homeSearch.ts`, `tests/home/homeSearch.test.ts`; modify `src/home/homeControls.ts`, `src/home/useHomeControls.ts`, `tests/home/homeControlsFocus.test.ts`.
**Consumes:** approved spec. **Produces:** state reducer/bounds above; adds `'search'` to HomeControlId (rank before status). Extend focus options with `revealSearch():void`, `searchEditing():boolean`, `searchContains(target:Element|null):boolean`, `hideSearch():void` and `activateSearch():void`.

- [ ] Write failing reducer tests: enter→top; edit→editing only from top; draft retained on complete/content/suspend, cleared on account change; repeat events idempotent; no submission action. Geometry tests for all3 sizes and dense-status left edge; null if no usable space rather than overlapping.
- [ ] Run `npx vitest run tests/home/homeSearch.test.ts`; confirm failure from missing implementation. Implement reducer and bounds using32px pill height,12px outer safe inset,12px clearance before status; compact target140px, expanded target360px, clamp into free space, minimum110px compact/180px expanded.
- [ ] Add failing focus tests: action Up reveals then defers focus until Search ref is registered (one scheduled repair), always enters Search; left/right moves through visible cells; Up clamps in our top row; no native bypass; Down/B hides and returns Home; status OK consumes, Search OK activates exactly once; editing ownership survives neutral DOM focus but ends on content/suspend. Preserve dynamic-cell repair tests.
- [ ] Run RED, implement coordinator callbacks and replace old bypass tests with new replacement semantics. Run `npx vitest run tests/home/homeSearch.test.ts tests/home/homeControlsFocus.test.ts tests/home/homeControls.test.ts` + typecheck. Commit session/navigation change.

### Task 2: Reversible header ownership and shared runtime

**Files:** create `src/home/homeHeaderDom.ts`, `src/home/steamUiState.ts`, `tests/home/homeHeaderDom.test.ts`, `tests/home/steamUiState.test.ts`; modify `src/components/GameStatusBar.tsx`, `src/home/useHomeControls.ts`, `src/home/homeControlsCss.ts`.
**Consumes:** Task1 navigation and current top-bar finder. **Produces:** lease/runtime APIs above; `useHomeControls` exposes effective replacement state and runtime snapshot for Task4.

- [ ] Write failing header tests with synthetic verified full-width top strip/avatarHolder: acquire hides only the discovered header; ownership sets marker/inert/aria-hidden and removes tab stops reversibly; children with explicit visibility cannot draw through owned CSS; remount restores detached old nodes and owns replacement; overlapping leases and preexisting inert/aria/tabindex values restore only on last release; malformed geometry stays unavailable. No label/minified-class matching.
- [ ] Run RED. Implement shared claims and marker-scoped visibility/pointer suppression, including descendants; restore exact prior attributes and retain native DOM/handlers. Observe relevant header replacement/descendant changes, not own writes. Header unavailable must prevent active expanded input. Keep current legacy header handoff as fallback.
- [ ] Write failing runtime tests with fake clock/events: two subscribers share one250ms timer; no subscribers leaves zero timers; snapshot identity only changes with values; focus/blur/menu/top-focus/account changes notify; last unsubscribe removes all listeners/timer. Reuse existing menu/top-header readers and the existing account property shape.
- [ ] Run RED. Replace GameStatusBar's duplicated menu/top-focus intervals and Home's unconditional watchdog with shared runtime subscription. Expanded ownership prevents `away` solely because Steam's hidden header once held focus; side-menu/route/background behavior remains intact. During suspension release the native-header lease and close Search through Task1 callbacks without stealing focus.
- [ ] Run `npx vitest run tests/home/homeHeaderDom.test.ts tests/home/steamUiState.test.ts tests/home/homeControlsFocus.test.ts tests/home/topBar.test.ts tests/home/useHideSteamBar.test.ts`, typecheck, commit.

### Task 3: Optional shared keyboard host/context

**Files:** create `src/menu/keyboard/context.ts`, `src/menu/keyboard/styles.ts`, `tests/menu/keyboard/context.test.ts`; modify `src/menu/components/MenuKeyboard.tsx`, `RadialKeyboard.tsx`, `src/menu/socialStyles.ts`, `src/menu/radialStyles.ts`, existing keyboard tests.
**Consumes:** KeyboardContext above; existing keyboard sessions/layout/feed/placement. **Produces:** backward-compatible optional context, completion labels and keyboard-only styles usable on Home.

- [ ] Add failing behavior tests for default Social host/return focus, explicit Home host without `.gg-menu`, input-ownership rejection, valid field focus return only, unavailable radial host/feed fallback and Complete versus Send labels. Snapshot the existing Social key/panel/hint semantics; verify Radial's B Delete/X Close stay unchanged.
- [ ] Run RED with `npx vitest run tests/menu/keyboard/context.test.ts tests/menu/menuKeyboard.test.ts tests/menu/radialKeyboard.test.ts`. Implement a default-context resolver in `context.ts`; use it for host discovery/geometry, event ownership and cleanup in both components. Guard async placement and cleanup with session/host ownership. No second controller feed or copied typing engine.
- [ ] Extract keyboard-only CSS into scoped exports; Social includes the same rules under current roots, Home uses its own explicit keyboard surface. Preserve menu-specific frost/under-column behavior for Social; Home must not pretend to be `.gg-menu` or register menu frost regions. Completion hint defaults Send; Home passes Done. Preserve original Compact size409×210 and Radial viewport-corner bounds.
- [ ] Run all keyboard tests (`npx vitest run tests/menu/keyboard tests/menu/menuKeyboard.test.ts tests/menu/radialKeyboard.test.ts`) + typecheck. Commit context/style boundary.

### Task 4: Home Search presentation, session and lifecycle integration

**Files:** create `src/home/HomeSearch.tsx`, `tests/home/homeSearchIntegration.test.ts`; modify `src/home/SpotlightHome.tsx`, `src/home/useHomeControls.ts`, `src/components/GameStatusBar.tsx`, `src/home/homeControlsCss.ts`, `src/menu/preferences.ts`, `src/menu/startMenu.ts`; development-only `react-dom:19.1.1` dependency and lockfile for mounted tests.
**Consumes:** Tasks1–3. **Produces:** working Home preview with isolated draft, saved keyboard and full header replacement.

- [ ] Add development-only ReactDOM matching existing React19.1.1, with package-manager lifecycle scripts disabled. Node currently cannot resolve react-dom/client; production Decky-provided imports stay external. Configure a focused linkedom React root harness with mocked Decky controls/events, honest about its not being Steam's focus engine.
- [ ] Write failing mounted tests: hidden Search has no DOM focus target; Up reveals/registers/focuses pill; activation expands field and opens correct saved keyboard; draft echoes; completion never calls native search or Social send; return hides pill; neutral DOM focus during Radial keeps editor visible. Test menu/launch/parent/account/unmount during async open and ensure no focus theft or stale draft. Two independent Home/Social sessions must not close/edit one another.
- [ ] Run RED. Implement HomeSearch with a Home-owned portal/keyboard host, token CSS and actual production keyboard components; no native input with an onChange search handler. Field displays editable draft via explicit local handlers/custom keyboard. Observe status bounds only on size/status-layout changes; use Task1 geometry, not per-focus forced layout. Keep field above keyboard; keep keyboard feed absent while closed.
- [ ] Move/re-export preference singleton as specified; subscribe/load it independently of menu enabled. Mode changes close editing; radial failure falls back once per opening to Compact with “Radial keyboard unavailable. Using Compact for this opening.” Do not change stored choice.
- [ ] Wire SpotlightHome and GameStatusBar through the Home coordinator. Search/top controls retain explicit input ownership while keyboard is open; stop content repeats; previous-content focus restoration uses current connected/visible target. On failed header/footer contract return to legacy UI. Account change clears local draft before another session can type.
- [ ] Run mounted integration tests plus all Home/menu keyboard/preferences tests and typecheck. Commit Home integration.

### Task 5: Visual, regression and independent review gates

**Files:** create `docs/superpowers/reports/2026-10-29-home-search-preview-validation.md`; ignored production-browser fixture/evidence in this plan's workspace.
**Consumes:** Tasks1–4. **Produces:** reviewable frontend with concrete limits, checksum and acceptance checklist.

- [ ] Run full `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`; record totals/SHA256. Assert no new baseline timers when disabled and existing Social tests remain green.
- [ ] Browser-check actual production Search/keyboard presentation at829×467,1280×800,1500×845: browse hidden; top revealed; keyboard editing; completion; return hidden; Compact and Radial; dense/vanishing status cells, long labels, resize and opt-out. Include native footer blur100px/border so the previous synthetic-fixture gap cannot recur. Confirm native header remains invisible/unfocusable in expanded mode and restores in legacy mode; distinguish mocked navigation from Steam acceptance.
- [ ] Run one fresh independent whole-change review using the Review Focus above. Resolve Critical/Important findings with RED→GREEN tests in one fix pass; record minors and rulings. Keep report honest about real controller tests pending.
- [ ] Present the exact built scope/checksum before requesting a later installation. Current approval does not install or reload. After separately approved device trial, verify upward reveal, click/OK keyboard, draft readability, Complete, B/X conventions, left/right status sequence, no Steam-header flash or residual footer strip, no Play activation, menu/route/toggle restoration. No real queries/messages or game launches are needed.
- [ ] Commit report; retain execution evidence while device acceptance is pending. No push/PR/release.

## Self-review

All spec sections map to Tasks1–5. Task1 owns state/navigation/bounds; Task2 owns native availability and runtime/account observation; Task3 owns keyboard context compatibility; Task4 composes them and mounts lifecycle tests; Task5 separates local evidence from actual Steam acceptance. Shared signatures/IDs are defined above. Physical layout/controller behavior remains an explicit device gate. Native execution stays preserved; plan review is required before implementation.
