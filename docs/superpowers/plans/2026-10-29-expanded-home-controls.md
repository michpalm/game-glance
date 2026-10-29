# Expanded Home Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for the user's preserved Native execution preference. Implement task-by-task, then request one fresh whole-change review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Home control treatment that extends the existing status bar, styles the native footer prompts and gives visible status items individual focus, while preserving existing Steam search.

**Architecture:** Retain existing status stores/presentation and native Home/Back/Search/footer semantics. A Home-scoped DOM lease marks verified native controls for styling and suppresses duplicated native status elements; a small focus coordinator bridges native launchers and optional interactive status cells. Keep the existing four Home content zones and all non-Home status-bar callers unchanged.

**Tech Stack:** TypeScript, React, Decky UI Focusable/gamepad events, existing Game Glance settings and CSS tokens, Vitest/linkedom, local Chromium fixtures.

**Spec:** `docs/superpowers/specs/2026-10-29-expanded-home-controls-design.md`

## Global Constraints

- `homeExpandedControls` defaults to **false**; never migrate `homeStatusBar: true` into this opt-in.
- Home only. Keep game pages, QAM/menu status copies, screensaver, Social and the working keyboards unchanged.
- Do not add a Notifications shortcut.
- Status activation destinations are deferred; status activation must not bubble into launching a game.
- Do not create a custom input, query state, keyboard session, search request or results screen.
- Preferred Search width: `clamp(110px,13vw,175px)`; minimum neighbour clearance: **20 CSS px**.
- Keep native Search usable and preserve original native launcher/footer handlers, labels and glyphs.
- Native contract failure restores today's UI and preserves the saved preference.
- No Ally access while the user is playing without asking and receiving approval; no install/reload, push, PR or release without explicit approval.

## Review Focus

1. Upgrade/parent-setting changes: existing status users stay opted out; disabling a parent while focused restores a usable native focus target — Tasks 2/5.
2. Downloads/controllers/persona appear, disappear or reorder: focus stays on a valid visible item with no accidental game activation — Tasks 4/5.
3. Native DOM remount/incompatible focus behaviour: ownership is restored exactly; no invisible native focus target, observer loop or duplicate chrome — Tasks 1/3.
4. Side menu, launch transition, route return or system-focus loss: no input theft, frozen highlight or second status copy — Tasks 3/5.
5. Controller type/language/viewport changes: original glyphs and labels survive, focus outlines fit, Search and status groups never overlap — Tasks 3/6.

## Current evidence and workspace

Current worktree: `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`, branch `codex/social-chat`, planning base `b7bce17`. Reuse this suitable isolated checkout if clean at execution time; inspect attached worktrees and Git state first. Do not switch to maintenance/release/visual-language checkouts. No implementation is authorised by this planning document alone.

The current bar is read-only (`StatusBar.tsx`), drawn by `GameStatusBar.tsx` in a portal, and gives Steam's top bar back when focus moves there. `useHideSteamBar.ts` deliberately retains native focus eligibility. `legend.ts` currently measures the original footer. This feature must coordinate these existing owners instead of stacking another cover/presentation over them. `homeStatusBar` already defaults true, so the new false-default opt-in is essential.

The exact native footer groups and Search-launcher DOM contract are not yet verified for this feature. Task 1 is an explicit evidence gate, not permission to guess. The Ally is installed with Social heroes `0e20b69`; notification correction `b7bce17` is local/uninstalled and will be included in builds from this base.

## File map and interfaces

| File | Responsibility |
|---|---|
| `src/data/settings.ts`, `src/components/{SettingsPanel.tsx,settingsRows.ts}` | False-default opt-in, persistence and dependent setting visibility |
| New `src/home/homeControls.ts` | Policy, ordered control IDs, focus repair and Search sizing; no DOM/native side effects |
| New `src/home/homeControlsDom.ts` | Verified native-node discovery, idempotent scoped lease, original footer groups and restoration |
| New `src/home/HomeControls.tsx` | Home-only focus coordinator and top-row lifecycle; no search engine or keyboard |
| `src/home/StatusBar.tsx` | Reuse existing reads and render optional focus-only cells; legacy default unchanged |
| `src/components/GameStatusBar.tsx` | Optional Home coordinator bridge; all existing callers remain legacy |
| `src/home/{SpotlightHome.tsx,useHideSteamBar.ts,legend.ts,homeCss.ts}` | Entry/return focus, single cover ownership, existing footer measurement and scoped style integration |
| New `src/home/homeControlsCss.ts` | Native-control/footer markers and interactive-cell presentation using existing tokens |
| Corresponding `tests/data`, `tests/components`, `tests/home` files | Pure policy, lease cleanup, presentation and focus ownership regressions |

Model contract in `homeControls.ts`:

```ts
export type HomeControlId = 'back'|'home'|'search'|'download'|'connection'|'battery'|'clock'|'profile'|`controller:${number}`|'controllers-more';
export interface HomeControlsPolicy {
  enabled:boolean; spotlightHome:boolean; homeStatusBar:boolean; homeExpandedControls:boolean;
  homeMounted:boolean; nativeReady:boolean; suspended:boolean;
}
export type HomeControlsMode = 'off'|'active'|'suspended'|'unavailable';
export function homeControlsMode(input:HomeControlsPolicy):HomeControlsMode;
export function nextHomeControl(current:HomeControlId,direction:'left'|'right',order:readonly HomeControlId[]):HomeControlId|null;
export function repairHomeControl(current:HomeControlId,previous:readonly HomeControlId[],next:readonly HomeControlId[]):HomeControlId|null;
export function searchPillBox(viewportWidth:number,navRight:number,statusLeft:number):{left:number;width:number}|null;
```

Controller IDs identify displayed rank slots, not Bluetooth identity; no controller activation is introduced. Native IDs precede status IDs. Status order follows today's bar: download, connection, controller slots/more, battery, clock, persona/avatar. Unknown/absent data creates no cell.

DOM contract in `homeControlsDom.ts`:

```ts
export interface NativeHomeControls {
  topBar:HTMLElement; home:HTMLElement; search:HTMLElement; back:HTMLElement|null;
  suppressed:readonly HTMLElement[]; footer:HTMLElement;
  footerGroups:readonly HTMLElement[];
}
export function discoverNativeHomeControls(root:HTMLElement):NativeHomeControls|null;
export function acquireHomeControls(root:HTMLElement,controls:NativeHomeControls,onInvalid:()=>void):{
  setTopFocused(focused:boolean):void; suspend(value:boolean):void; dispose():void;
};
```

`search` must be a verified native launcher, not a guessed input or a new fake button. `suppressed` contains only duplicated native status/notification controls, never Home/Back/Search. The lease must restore pre-existing attributes/style/inert state, release only its own markers and be safe to dispose twice.

### Task 1: Verify the native control contract and record minimal fixtures

**Files:** Create `docs/superpowers/reports/2026-10-29-home-controls-native-contract.md`, `tests/home/fixtures/home-controls-native.ts`. Task 3 owns the executable discovery tests.
**Consumes:** Current top-bar finder, footer measurement logic and approved scope.
**Produces:** Source-backed mappings and synthetic structural fixtures for `NativeHomeControls` above.

- [ ] Inspect available local Steam/Decky source first. Record the actual Home/Back/Search launcher nodes, dynamic native status/notification subtree and footer prompt groups. Do not store real names, avatars, notification text or IDs.
- [ ] If local evidence is insufficient, ask before a read-only Ally inspection when the user is free. Do not open a menu, invoke an unknown function, navigate, capture private content or reload merely to discover a contract.
- [ ] Create a minimal synthetic structural fixture with explicit references to the verified nodes, original Search click-handler spy and native footer glyph/label descendants. Record the exact discovery/exclusion and FooterLegendProps contracts in the report. Do not import the not-yet-created production adapter into this fixture.
- [ ] Check the fixture against the recorded source/DOM evidence. Record which visible/focusable native nodes must be excluded and how Steam checks their eligibility. If no safe contract exists, stop implementation and revise the approach with the user; do not ship a fake Search button. The production adapter RED→GREEN cycle belongs to Task 3, so this documentation task does not leave broken imports for Task 2.
- [ ] Commit only the verified evidence and fixture; Task 3 consumes them for its executable discovery/lease tests.

### Task 2: Persist the explicit opt-in and define pure control policy

**Files:** Modify `src/data/settings.ts`, `src/components/{SettingsPanel.tsx,settingsRows.ts}`; create `src/home/homeControls.ts`; tests `tests/data/settings.test.ts`, `tests/components/settingsRows.test.ts`, new `tests/home/homeControls.test.ts`.
**Consumes:** Approved spec and NativeHomeControls contract.
**Produces:** `homeExpandedControls:boolean`, `setHomeExpandedControls(value:boolean):Promise<void>`, and the model functions above.

- [ ] Add failing tests: old stored settings with `homeStatusBar:true` load expansion as false; only literal boolean true opts in; toggling persists just the new change and retains unknown settings; disabling/re-enabling parents retains the saved opt-in without activating while parents are off.
- [ ] Assert mode precedence: disabled parent/Home absent => off; requested + suspended => suspended; requested + native missing => unavailable; otherwise active. A side menu temporarily hiding native nodes must not become a sticky compatibility failure. Assert left/right clamp at ends, removed-item repair selects the nearest surviving index, no remaining item returns null.
- [ ] Assert Search bounds: width stays between 110 and 175 CSS px and leaves 20px neighbour clearance; insufficient room returns null. Use the smaller of preferred width and available room, clamp the centre within the clear interval.
- [ ] Run the named tests and observe RED. Implement the interfaces; put **Expanded Home controls** immediately after Status bar's existing dependent options, visible only with Spotlight Home and Status bar on. Copy: “Matching Home navigation, Search and controller prompts, with selectable status items.” Default false.
- [ ] Run those tests plus `npm run typecheck`; commit the passing settings/model change.

### Task 3: Add reversible native presentation ownership and footer styling

**Files:** Create `src/home/homeControlsDom.ts`, `src/home/homeControlsCss.ts`; modify `src/home/useHideSteamBar.ts`, `src/home/legend.ts`; test `tests/home/homeControlsDom.test.ts`, existing `tests/home/{topBar,legendDom,legend}.test.ts`.
**Consumes:** Task 1's verified nodes/fixtures, Task 2's mode policy.
**Produces:** Discovery and lease interfaces above; native marker CSS without replacing native controls.

- [ ] Write RED discovery tests resolving exactly Task 1’s verified nodes and rejecting a missing/ambiguous Search launcher/footer. Then add tests for lease application/release, twice-dispose, remounted bar/footer, unrelated pre-existing styles/inert values, missing native nodes and mutation callbacks caused by owned writes. No native click/resolve callback may run during discovery or styling.
- [ ] Add assertions that the same Search/Home/Back elements and original click handlers survive; dispatching one native click still runs only the original handler once. Native footer labels/glyph descendants keep identity after styling.
- [ ] Assert suppressed native controls cannot retain hidden `.gpfocus`/DOM focus. If exclusion fails, call `onInvalid` once, restore native chrome before the next paint and deactivate the expansion for that opening. Observe only the verified subtree; filter actual class mutations, make owned writes idempotent and never measure the whole page on every focus mutation.
- [ ] Implement using owned marker attributes and the verified focus-exclusion contract. Share/release the existing cover ownership: add an opt-out argument to `useHideSteamBar(doc,away,enabled=true)` so the expanded Home owner replaces, rather than competes with, the legacy cover. Default callers remain unchanged.
- [ ] Export/reuse the existing footer finder, retain its measurable root and restyle only the verified native prompt groups as Floating pills. Preserve the original context-sensitive labels/controller glyphs/handlers; do not clone, hide or reimplement the whole footer. Scope every rule/marker to the active Home lease. Native Home/Back/Search presentation is hidden outside top focus; the existing Search action is untouched.
- [ ] Run lease/top-bar/footer tests and typecheck; commit only when cleanup and compatibility fallbacks pass.

### Task 4: Render individually focusable status cells without new actions

**Files:** Modify `src/home/StatusBar.tsx`, `src/components/GameStatusBar.tsx`, `src/home/homeControlsCss.ts`; create `tests/home/homeStatusControls.test.ts`; extend `tests/home/statusBarControllers.test.ts`.
**Consumes:** Existing status/download/self-persona data and optional `HomeStatusControls` bridge defined here.
**Produces:**

```ts
export interface HomeStatusControls {
  register(id:HomeControlId,node:HTMLElement|null):void;
  focused(id:HomeControlId):void;
  button(id:HomeControlId,event:GamepadEvent):void;
}
// Optional `homeControls?: HomeStatusControls` on GameStatusBar/StatusBar;
// undefined preserves current read-only rendering and legacy native cover.
```

- [ ] Write RED presentation tests for one cell per visible element, empty data omitted, charging/low colours preserved, duplicate controller names displayed safely, controller “+n”, active download, profile avatar on and persona-dot fallback off. Default non-Home rendering must match existing tests.
- [ ] Assert OK/pointer activation of a status cell changes only focus/highlight: no navigation, settings write, keyboard opening or underlying Play activation. Focused status controls consume their own OK event so it cannot bubble into a game launch.
- [ ] Implement optional Decky Focusable/DialogButton cells and the source-verified localized FooterLegendProps from Task 1, preserving existing status reads/subscriptions/update cadence. Reuse hook-free presentation where useful; do not add a second status store or polling loop. Keep current visual placement/scale, source-pill tokens and the 2px/2px focus ring; provide separate, non-overlapping hit regions.
- [ ] Keep the bridge Home-only. Game page, menu/QAM and screensaver callers receive no bridge and remain read-only. Run status/model tests and typecheck; commit.

### Task 5: Integrate top-row entry, focus repair and the Search visual treatment

**Files:** Create `src/home/HomeControls.tsx`; modify `src/home/SpotlightHome.tsx`, `src/components/GameStatusBar.tsx`, `src/home/homeControlsCss.ts`; create `tests/home/homeControlsFocus.test.ts` and `tests/home/homeControlsView.test.ts`.
**Consumes:** Pure policy/navigation, native lease/nodes and status bridge.
**Produces:** Home coordinator with `enterTop():void`, `returnToHome():void`, `suspend(value:boolean):void`, `dispose():void` and `homeStatusControls:HomeStatusControls`.

- [ ] Write RED tests: Up from the highest Home action row enters native Search; left/right move through visible native launchers and status cells once; Down/B restores the previous live action or existing Play/recents/empty-Home fallback. Use Decky's named GamepadButton enum (UP=9, DOWN=10, OK=1, CANCEL=2), not new numeric guesses.
- [ ] Assert dynamic download completion/controller removal/persona changes retain a surviving focused ID or repair to the nearest valid cell; none remaining returns safely to Home. A setting toggle off while focused restores native focus before the owned UI disappears.
- [ ] Assert side menus, launch transitions, route exit, background/system-focus loss suspend input and release presentation ownership. Returning must not steal focus from a menu or replay a held activation/bumper. Preserve the existing `actions/recents/tabs/feed` content zones and Home selection memory; track top focus separately.
- [ ] Implement the coordinator using registered DOM refs and existing `focusElement`/`takeSteamFocus`. Enter from action-row UP only when active. Reuse original native Home/Back/Search handlers and preserve normal content navigation otherwise. Hide Search on return to content; apply the compact pill/focus look to the verified native launcher and fit it using `searchPillBox`.
- [ ] Explicitly assert this change creates no editable Search field or custom keyboard/session, makes no search/provider calls and changes no saved keyboard preference. The mockup's long input/radial keyboard remains a later-phase reference only.
- [ ] Run focus/model/view/status/lease tests, then typecheck; commit.

### Task 6: Whole-change verification, review and authorised device trial

**Files:** Create `docs/superpowers/reports/2026-10-29-expanded-home-controls-validation.md`; local ignored render fixtures/logs under `.superpowers/sdd/2026-10-29-expanded-home-controls/`.
**Consumes:** Tasks 1–5 and the agreed phase-one scope.
**Produces:** Reviewable frontend build, documented acceptance evidence and rollback path.

- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`. Record actual fresh totals/results and frontend SHA-256; do not copy a historical count as evidence.
- [ ] Render production presentation with synthetic content and controlled native fixtures at 829×467 and1500×845, plus1280×800. Verify no overlap/clipping, outlines fit, downloads/controller items fit or cleanly trigger the compatibility fallback, Search reveal/hide, and both settings-off paths restore today's UI. Check localized long labels and two controller-glyph families using original native descendants. No live friend/profile content in artifacts.
- [ ] Request one fresh independent whole-change review for Native execution; resolve actionable findings and rerun affected checks. Distinguish hook-free/browser fixtures from mounted Steam focus/context behaviour.
- [ ] When the user is free, ask for explicit Ally inspection/install approval. Disclose that this build also includes the previously uninstalled notification-details correction. Save the current frontend, require the menu closed, checksum-verify the staged and installed file, reload only after success, and verify Game Glance loaded. Frontend-only: no reboot; warn that reload clears unsent drafts.
- [ ] With approved device access, validate native Search still works normally, no invisible duplicate focus, controller Up/left/right/Down/B, dynamic status changes, original localized/footer glyphs, side menus, route return, suspend/resume, setting-off while focused and unload cleanup. Custom Search expansion/keyboard/results and status-item destinations are **not** acceptance requirements for this phase. Do not send messages or launch a game merely to test a highlight.
- [ ] Record results/remaining gaps and a verified rollback backup; commit documentation locally. No push, PR or release without separate approval.

## Later Search phase (requirements retained, no implementation tasks here)

The approved end-state remains: compact pill revealed/highlighted on Up; activation expands it into a longer input and opens the saved Game Glance keyboard choice. Search/query/results/dismissal behaviour will be designed and planned separately. Do not infer those details from the current interactive mockup, which contains demonstration-only typing and dismissal.

## Self-review and execution handoff

Coverage checked against the linked design: all phase-one requirements map to Tasks 1–6; all five Review Focus cases have owning tests. Native contracts are explicitly gated, status activation is excluded, and Search stays native instead of becoming a dead placeholder. Interfaces above are the shared names for adjacent tasks. Native execution is preserved from this conversation; this document does not start implementation or authorise device access.
