# Expanded Home Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for the user's preserved Native execution preference. Implement task-by-task, then request one fresh whole-change review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Home control treatment that extends the existing status bar, styles native footer prompts and gives visible status items individual focus; all Search/header changes are deferred.

**Architecture:** Retain existing status stores/presentation and native Home/Back/Search/footer semantics. A Home-scoped DOM lease marks verified native footer groups for styling; a small coordinator connects the existing Home action row with optional focus-only status cells. The existing native header handoff stays unchanged. Keep the existing four Home content zones and all non-Home status-bar callers unchanged.

**Tech Stack:** TypeScript, React, Decky UI Focusable/gamepad events, existing Game Glance settings and CSS tokens, Vitest/linkedom, local Chromium fixtures.

**Spec:** `docs/superpowers/specs/2026-10-29-expanded-home-controls-design.md`

## Global Constraints

- User-approved amended scope: footer styling and status focus/highlighting only. All Search/Home/Back/header changes are deferred.
- `homeExpandedControls` defaults false; retain the saved value while parent settings are off.
- Home only; all other status callers, Social/keyboards, QAM and screensaver stay unchanged.
- No Notifications shortcut, no new status activation actions, no search or keyboard/provider calls.
- Preserve original footer nodes, glyphs, translated/context-sensitive labels and handlers; retain its layout reserve.
- Reuse status stores/update cadence and native-header cover/handoff. No new backend or polling loop.
- No further device changes/install/reload without explicit approval; no push/PR/release.

## Review Focus

1. Upgrade/parent-off changes keep opt-in false and repair active focus — Tasks2/5.
2. Dynamic download/controller/persona changes preserve valid focus and never activate Play — Tasks4/5.
3. Footer remount/malformed DOM restores owned markers without observer loops or stale styling — Tasks1/3.
4. Menus/launch/route/system focus suspend input; native header/Search remains reachable — Task5.
5. Locale/glyph family/viewport changes preserve native content, fitting outlines and footer reserve — Tasks3/6.

## Scope amendment and baseline

At Task1 the approved read-only inspection proved Search is an editable native input, not the assumed launcher, and Home/Back nodes were absent. The user chose “Proceed with footer and status focus.” This supersedes the original Tasks2–5; their Search/header takeover work is deferred. No native handlers were invoked or screens changed. Baseline2329 tests passed on72b65f8. Keep Native execution in the current isolated worktree.

Installed Ally: Social heroes0e20b69. Local pending notification correctionb7bce17 will also be in future builds; disclose this before install.

## Interfaces and file boundaries

`src/home/homeControls.ts` defines only pure Home-status policy/navigation:

```ts
export type HomeControlId='download'|'connection'|'battery'|'clock'|'profile'|`controller:${number}`|'controllers-more';
export interface HomeControlsPolicy {enabled:boolean;spotlightHome:boolean;homeStatusBar:boolean;homeExpandedControls:boolean;homeMounted:boolean;nativeReady:boolean;suspended:boolean}
export type HomeControlsMode='off'|'active'|'suspended'|'unavailable';
export function homeControlsMode(input:HomeControlsPolicy):HomeControlsMode;
export function nextHomeControl(current:HomeControlId,direction:'left'|'right',order:readonly HomeControlId[]):HomeControlId|null;
export function repairHomeControl(current:HomeControlId,previous:readonly HomeControlId[],next:readonly HomeControlId[]):HomeControlId|null;
export function orderHomeControls(ids:readonly HomeControlId[]):HomeControlId[];
```

Order: download, connection, ranked controller slots, controllers-more, battery, clock, profile. Controller ranks are display slots, not device identity. No future Search sizing/dispatch API is added now.

`src/home/homeControlsDom.ts` owns only footer discovery/markers:

```ts
export interface NativeFooterControls {footer:HTMLElement;wrapper:HTMLElement;groups:readonly HTMLElement[];spacer:HTMLElement}
export function discoverNativeFooter(root:HTMLElement):NativeFooterControls|null;
export function acquireHomeFooter(root:HTMLElement,onAvailability:(ready:boolean)=>void):{suspend(value:boolean):void;dispose():void};
```

The lease discovers/rebinds native footer replacements, adds owned attributes, and restores previous attribute values on suspend/dispose. It does not change source HTML, handlers or header focusability. Missing native structure reports unavailable, retaining legacy UI.

`HomeStatusControls` lives in `homeControls.ts` with a type-only Decky event import:

```ts
export interface HomeStatusControls {register(id:HomeControlId,node:HTMLElement|null):void;focused(id:HomeControlId):void;button(id:HomeControlId,event:GamepadEvent):void}
```

`StatusBar`/`GameStatusBar` receive optional `homeControls?:HomeStatusControls`; undefined retains legacy DOM/presentation. A Home-only coordinator in `src/home/useHomeControls.ts` supplies stable callbacks and an `enterStatus():boolean` entry; it exposes current active state and lease CSS through the existing Home-owned status portal. No second status store, viewport layer, keyboard or modified `Zone` type.

### Task 1: Record verified native footer and deferred Search contracts

**Files:** `docs/superpowers/reports/2026-10-29-home-controls-native-contract.md`; `tests/home/fixtures/home-controls-native.ts`.
**Consumes:** Approved read-only evidence. **Produces:** Synthetic structural fixtures for Task3; no production adapter imports.

- [ ] Record `#Footer` flex wrapper/prompt/spacer/glyph/label structure and geometry, without real user content or hashed selectors in implementation.
- [ ] Record Search's actual editable input/onChange contract and explicit approved deferral. No native handlers invoked.
- [ ] Create synthetic image/SVG glyph and localized-label fixtures; keep explicit expected-node refs and stub geometry for tests.
- [ ] Typecheck/check diff, commit report/fixture, ledger scope ruling and baseline. Task3 owns the RED→GREEN production tests.

### Task 2: Add false-default opt-in and pure status policy

**Files:** `src/data/settings.ts`, `src/components/{SettingsPanel.tsx,settingsRows.ts}`, new `src/home/homeControls.ts`; tests `tests/data/settings.test.ts`, `tests/components/settingsRows.test.ts`, new `tests/home/homeControls.test.ts`.
**Consumes:** Amended spec. **Produces:** Setting/setter, model types/functions above.

- [ ] Write RED tests: old settings keep false; literal true persists; malformed values false; unknown future settings retained; parent off/on keeps opt-in but disables effective mode. Add setting after existing status-dependent options, only visible under enabled Spotlight Home/Status bar.
- [ ] Test mode precedence off parents/Home absent, then suspended, then unavailable native contract, then active. Test ordered visible IDs, clamped left/right, nearest-index removal repair and empty-list fallback.
- [ ] Implement `homeExpandedControls:boolean`, `setHomeExpandedControls(value:boolean):Promise<void>`, and pure model. UI copy: “Expanded Home controls”; description: “Matching controller prompts and individually selectable status items.” No Search/activation promises in this phase's setting.
- [ ] Run named tests RED→GREEN and typecheck; update old exact settings fixtures only for the new false-default property; commit.

### Task 3: Reversible native footer styling

**Files:** New `src/home/homeControlsDom.ts`, `src/home/homeControlsCss.ts`; tests `tests/home/homeControlsDom.test.ts`, existing `tests/home/{legendDom,legend}.test.ts`.
**Consumes:** Task1 fixture. **Produces:** NativeFooterControls/discovery/lease interfaces above.

- [ ] Write RED tests: verified structure resolves; ambiguous/missing footer rejects; original nodes/glyphs/labels and click handler identity retained; new groups/remounts rebind; suspend/dispose restore exact prior markers and are safe twice.
- [ ] Test one empty spacer with prompt groups around it, alternate glyph families/locales, callback notification only on real readiness changes, ignored owned-attribute mutations and no repeated-write observer loop.
- [ ] Discover by `#Footer` and the verified structure (one flex wrapper, one empty flex-grow spacer, each prompt's glyph+label children). Validate root geometry when usable. Mark root/wrapper and prompt side/edge; do not key on English labels or minified classes.
- [ ] Reuse source-pill fill/radius/tokens, style only native prompt groups, join adjacent right-side groups and keep left Menu separate. Preserve root/wrapper measurement and all glyph/label descendants. No new footer controls or header suppression.
- [ ] Observe child/text changes needed for native rerenders, filter own mutations, keep writes idempotent; no broad layout work on each focus event. Run lease/legend tests and typecheck; commit.

### Task 4: Optional focus-only status cells

**Files:** `src/home/StatusBar.tsx`, `src/components/GameStatusBar.tsx`, `src/home/homeControlsCss.ts`; new `tests/home/homeStatusControls.test.ts`, existing `tests/home/statusBarControllers.test.ts`.
**Consumes:** Model IDs/HomeStatusControls. **Produces:** Optional interactive rendering; legacy callers unchanged.

- [ ] Write RED presentation tests for each visible status item: connection, download, controller slots/+n, system battery/charging/low, clock, avatar and persona-dot fallback. No data means no empty control. Verify current read-only rendering when bridge omitted.
- [ ] Assert pointer/OK selects/highlights only: consume OK so it cannot bubble into Play, navigate, open settings, change preferences or open a keyboard. Keep localized footer action-description data when available; never replace native glyph nodes.
- [ ] Implement a hook-free status-cell presentation wrapper using Decky Focusable and stable IDs/refs, reusing current hooks/stores and typography/colours. Per-cell outline2px/offset2px fits existing pill; no second status bar or global input capture.
- [ ] Extend ControllerItems optionally without altering its default span output. Pass the bridge only from Home's GameStatusBar; keep menu/page callers legacy. Run status tests/typecheck; commit.

### Task 5: Home-only focus lifecycle and opt-in integration

**Files:** New `src/home/useHomeControls.ts`; `src/home/SpotlightHome.tsx`, `src/components/GameStatusBar.tsx`, scoped CSS; new `tests/home/homeControlsFocus.test.ts`.
**Consumes:** Policy, footer lease and status bridge. **Produces:** Home coordinator and active integration.

- [ ] Write RED tests: Up from highest action row enters last visible status ID or first visible cell; left/right clamp; Down/B restores previous valid action, else Play/recents/empty-Home fallback. Use named GamepadButton enum.
- [ ] Test deferred ref-registration repair after rerenders, download completion, controllers/persona removal, all cells gone and setting-off while focused. Never focus a detached/invisible node.
- [ ] Preserve native header access: Up from status returns focus to the existing Home action row and lets a subsequent normal Up follow Steam's original header path. Do not consume the native Search/header's events or modify the native input. Record this explicit bridge behaviour in tests; no guessed native target/route.
- [ ] Test menus/launches/routes/background loss suspend both status input and footer styling without focus theft; resume only in Home with input ownership. Preserve current content zones/memory and status/native-bar handoff. Stop existing held bumper/direction repeat before entering status.
- [ ] Implement the coordinator with registered refs, one deferred repair frame per update and existing `focusElement`/`takeSteamFocus`. One action-row Up handler enters status only while active; a one-shot bypass after Up-from-status allows the next Up through to Steam. Temporarily render our status cells read-only during that handoff so they cannot become native spatial-navigation targets. All other navigation stays original.
- [ ] Explicit tests: no Search field/keyboard/provider calls, unchanged native header attributes/handlers, no new status activation. Run focused policy/lease/status/focus tests/typecheck; commit.

### Task 6: Whole-change verification and later approved trial

**Files:** `docs/superpowers/reports/2026-10-29-expanded-home-controls-validation.md`; ignored synthetic browser fixtures/logs in this plan workspace.
**Consumes:** Tasks1–5. **Produces:** Reviewable frontend, limits and rollback documentation.

- [ ] Run fresh `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`; record actual totals and SHA256.
- [ ] Browser-check real presentation/controlled footer fixtures at829×467,1280×800,1500×845: native footer nodes/glyphs survive, no overlap/outlines clipped, selected cells and legacy callers correct, disabled expansion restores original markers/UI. Include long localized labels and duplicate controller names.
- [ ] One fresh whole-change review for Native execution; resolve actionable issues and repeat affected checks. Distinguish local fixtures from mounted Steam focus tests.
- [ ] Ask before any later device inspection/install. Current approval covers read-only contract discovery, not install/navigation/reload. Disclose inclusion of pending notification-details correction. For an approved install: closed menu, backup, stage/install checksum, reload only on success; no reboot, warn unsent drafts clear.
- [ ] Approved device acceptance: Up/status left/right/Down/B, deliberate native-header bypass, no unintended Play, dynamic cells, original native Search, menus, parent toggles, route return and cleanup. Do not launch a game or send a message merely for a highlight test. Record evidence/backup; no push/PR/release.

## Later phase retained

Full top-bar treatment/Home navigation and the highlighted compact Search pill remain the visual direction. Search activation expanding into a long field, saved-keyboard integration, query lifecycle/results/dismissal and provider are explicitly deferred and require a revised native integration design. Status-item activation destinations are deferred too.

## Self-review / execution

The scope amendment removes the invalid launcher assumption rather than pretending the input is a launcher. Tasks1→3 share footer fixtures; Task2→4/5 share policy/IDs; Task3→5 shares lease; Task4→5 shares the optional bridge. All five Review Focus cases have tests. Native execution continues under the user-approved reduced scope; no plan review or fresh device permission is inferred for installation.
