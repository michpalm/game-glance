# Social Radial Keyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an optional dual-stick Social keyboard with independent bottom-corner wheels and typing visible in the existing compose field.

**Architecture:** Keep the compact keyboard and shared draft/session/typing behavior. Add pure radial layout and selection modules, a scoped controller adapter, and a separate radial component portalled into the native popup document. Extend frost with two optional circular regions, not a rectangle spanning the chat.

**Tech Stack:** TypeScript, React/Decky, Vitest/linkedom, Python/pytest, Gamescope ReShade shader.

**Spec:** `docs/superpowers/specs/2026-10-29-social-radial-keyboard-design.md` (approved in chat 2026-10-29; source investigation included).

## Global Constraints

- Worktree: `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`, branch `codex/social-chat`. Planning baseline: `bab6d32`. Verify actual Git state before execution; preserve unrelated changes.
- This is an optional controller keyboard for Game Glance's Social message field, alongside the existing compact keyboard.
- Two independent wheels, one at each bottom corner of the screen. No shared keyboard panel. All letters visible across the two wheels.
- Left/right stick selects independently; L3/R3 types once per press. Centring clears selection and a centred click types nothing.
- Hold L2/R2 for that side's extra-character layer. Hold L1 for uppercase on both wheels; release restores lowercase. R1 cycles selected supported layouts locally without changing Steam settings.
- Y inserts a space; B deletes; A sends under existing Send eligibility; X closes and retains the draft.
- The draft appears directly in the existing Social message box, which must remain readable and unobstructed. No duplicate draft display in the keyboard.
- Default preference is Compact. Keep selected Steam layouts and existing input-method fallback. No new runtime dependency or controller remapping UI.
- Source/shape discovery only; no hard-coded Steam module IDs or minified exports. No unknown Steam export calls from CEF probes, no device-support/test flow, no manual Gamescope atom writes.
- No push, PR, release or device installation without explicit user approval. Backend installation requires a full device restart; frontend reload alone does not load Python changes.
- Use synthetic friend names/IDs in tests and anonymised frames in shared visuals. Preserve the paused compact drag fix handoff; do not mix its three pending fixes into this feature.
- Test first per task. Keep runtime effects injectable for meaningful Node tests; do not claim component mounting or device behavior from React element-tree/source-text checks.
- Local commits use `Michael Palma <18511803+michpalm@users.noreply.github.com>`. Attribute this work to the actual agent, not the prior handoff's Claude model. No remote changes.

## Review Focus

1. Opening with A/L3/R3 held must not send/type; releasing and pressing again acts once (Task 2).
2. Returning to centre and then clicking must not type the preceding letter; jitter near a wedge boundary must not flicker (Task 1).
3. A composed acute accent must survive trigger release, then combine with uppercase/lowercase letters; all symbols and dead keys remain reachable (Tasks 1 and 2).
4. Body-portalled wheels must be treated as inside the keyboard, not outside the menu; first outside tap dismisses only the keyboard, and closing removes all input ownership (Tasks 3 and 4).
5. Opening either wheel must not clear existing menu frost, change allocation, or blur the intervening chat; old/new backend mismatch must fail gracefully (Task 5).

## Files and responsibilities

- New `src/menu/keyboard/radialLayout.ts`: layout partition and character-layer construction.
- New `src/menu/keyboard/radialSelection.ts`: angle selection, centre and boundary hysteresis.
- New `src/menu/keyboard/controllerFeed.tsx`: source-signature hook discovery, narrow feed types, effect lifecycle/error boundary. Keep existing compact feed untouched unless a shared extraction is necessary and covered.
- New `src/menu/keyboard/radialInput.ts`: deterministic button edges, modifier state, layout rearming, commands and draft edits using `typing.ts`.
- New `src/menu/keyboard/radialRuntime.ts`: injected frame/event lifecycle, no Steam globals in tests.
- New `src/menu/keyboard/radialPlacement.ts`: viewport corner geometry and compose-clear sizing.
- New `src/menu/components/RadialKeyboard.tsx`: view and portal/session integration; export a hook-free view for element-tree checks.
- New `src/menu/radialStyles.ts`: native-document-scoped wheel styles and token inheritance; include from `src/menu/styles.ts`.
- Modify `preferences.ts`, `components/MenuPreferences.tsx`: persisted mode choice.
- Modify `components/SocialPanel.tsx`, `components/MenuShell.tsx`, `navigation.ts`: renderer selection and scoped input ownership.
- Modify frontend frost types/lookup/allocation/measurement/Home and matching Python contracts/allocation/native uniforms/shader: separated wheel masks.

## Execution sequence

### Task 1: Pure layout, selection and placement

**Files:** Create `radialLayout.ts`, `radialSelection.ts`, `radialPlacement.ts` under `src/menu/keyboard/`; tests in `tests/menu/keyboard/{radialLayout,radialSelection,radialPlacement}.test.ts`. Reuse existing Spanish fixture and `KeyDef`/`KeyboardLayout`.

**Interfaces:**
- `type Side = 0 | 1`.
- `type RadialLayout = { letters: [KeyDef[], KeyDef[]]; symbols: [KeyDef[], KeyDef[]] }`.
- `buildRadialLayout(layout: KeyboardLayout): RadialLayout`.
- `selectRadial(previous: number | null, axis: {x:number;y:number}, count:number): number | null`, where axes are normalised and positive Y is up.
- `type WheelBounds = {left:number;top:number;diameter:number}`; `radialBounds(view:{width:number;height:number}, field:{left:number;top:number;width:number;height:number}): [WheelBounds,WheelBounds] | null`.

- [x] Write failing tests. Spanish clockwise letters are exactly `qwertçgfdsazxc` and `yuiopñlkjhvbnm`; w/u at twelve o'clock. Every source letter appears once, shifted/dead metadata is retained, and input arrays are unmodified. QWERTY and Swedish use generic balanced row splits. Extra layers contain every unique printable symbol plus dead keys from both compact symbols rows and the letters bottom row (the main acute lives there), exclude space/control keys, and never truncate to 14.
- [x] Selection tests: top selects index 1 for 14 wedges; left/right/down land on the nearest wedge; zero/tiny axes return null; NaN/Infinity/empty count return null; previous selection clears at centre; wraparound and adjacent boundary retention work. Use entry magnitude .45, exit magnitude .35, angular retention `min(.04, .15 * 2π/count)` radians as initial device-tuning constants, not measured Steam guarantees.
- [x] Placement tests: 829×467 and 1500×845 viewports give two equal-size non-overlapping circles at opposite bottom corners, inside the viewport with hints reserved below, clear of the real compose rectangle. Start diameter `min(280,max(160,.18*view.width))`, 12px edge inset, 30px hint reserve. Reduce diameter if necessary to avoid compose; return null below 120px or if no pair fits. A resized viewport recomputes correctly without menu-scale input.
- [x] Run `npx vitest run tests/menu/keyboard/radialLayout.test.ts tests/menu/keyboard/radialSelection.test.ts tests/menu/keyboard/radialPlacement.test.ts`; confirm failures for missing behavior.
- [x] Implement these pure functions. Generic letters: split each letter row in two; award an odd extra key to the side with fewer accumulated letters (tie left), then concatenate top forward, middle reversed, bottom forward. Use the explicit Spanish arrangement only when its full expected character set is present; otherwise generic split preserves actual data. Segment centres follow `-π/2+(index-1)*2π/count` in screen coordinates. Deduplicate character definitions by character and dead-key mapping, preserving first occurrence.
- [x] Run the three files and existing layout/typing/placement tests. Commit `Menu keyboard: radial layouts and independent corner geometry`.

### Task 2: Controller feeds and deterministic typing engine

**Files:** Create `controllerFeed.tsx`, `radialInput.ts`, `radialRuntime.ts`; tests `tests/menu/keyboard/{controllerFeed,radialInput,radialRuntime}.test.ts`. Modify `typing.ts` only if a shared correctness change is required and add its regression test.

**Interfaces:**
- `AxesSnapshot = {nControllerIndex:number;LeftJoystick:{x:number;y:number};RightJoystick:{x:number;y:number};flLeftTrigger?:number;flRightTrigger?:number}`.
- `ButtonsSnapshot = {nControllerIndex:number;bLeftStickClick:boolean;bRightStickClick:boolean;bLeftTrigger:boolean;bRightTrigger:boolean;bLeftBumper:boolean;bRightBumper:boolean;bButtonNorth:boolean;bButtonEast:boolean;bButtonSouth:boolean;bButtonWest:boolean}`.
- `discoverControllerFeeds(lookup:(predicate:(value:unknown)=>boolean)=>unknown): {useAxes:(index:number)=>AxesSnapshot|undefined;useButtons:(index:number)=>ButtonsSnapshot|undefined} | null`.
- `RadialCommand = {type:'key';key:KeyDef;uppercase:boolean} | {type:'space'} | {type:'delete'} | {type:'send'} | {type:'close'} | {type:'layout'}`.
- `createRadialInput(): {sample(axes:AxesSnapshot,buttons:ButtonsSnapshot,layout:RadialLayout): {selection:[number|null,number|null];extra:[boolean,boolean];uppercase:boolean;commands:RadialCommand[]};reset():void}`.
- `applyRadialCommand(state:TypingState, command:RadialCommand): TypingState` handles only draft edits; send/close/layout leave the reducer state unchanged for the runtime to act on.
- `startRadialRuntime(deps:{view:Window;document:Document;read():{axes:AxesSnapshot;buttons:ButtonsSnapshot}|null;layout():RadialLayout;ownsInput():boolean;changed(view:{selection:[number|null,number|null];extra:[boolean,boolean];uppercase:boolean}):void;command(value:RadialCommand):void;failed():void}):()=>void`.
- React `ControllerFeed` receives one valid controller index, the discovered hook pair and a snapshot callback; an error boundary calls failure and unmounts the subscriber.

- [x] Write failing tests for source-signature discovery with renamed exports and missing/throwing lookups; never invoke a discovered hook outside React. Validate snapshot shape/index and normalise both stick axes using the existing helper.
- [x] Input-engine tests: independent simultaneous sticks; each click types its selected side once; held clicks and A/Y/B/R1 do not repeat; initial held actions require release before acting; centred clicks emit no key; digital trigger booleans independently select layers; L1 affects both sides; R1 emits one layout command and disarms each wheel until that stick centres. Trigger transitions recompute selection for the new segment count without carrying an index from a different-size layer. Layout/close commands outrank typing/send in the same snapshot to avoid input leaking across transitions.
- [x] Draft tests using real `press`: acute selected with a trigger, trigger released, then a => á; L1 plus a => A, and acute then L1+a => Á; release L1 then a => a; Y after accent inserts accent alone; grapheme deletion removes an emoji/á once; an already held accent is cleared by B according to the existing reducer. L1 must not shift symbol punctuation.
- [x] Runtime tests with injected snapshots and a real EventTarget/RAF queue: no redraw for unchanged selection; actions suppressed when `ownsInput()` is false; lost ownership requires a fresh baseline on recovery; cleanup cancels RAF/listeners and subsequent frames cannot edit the draft. Feed absence closes radial through `failed()` rather than looping or calling support-flow APIs.
- [x] Run `npx vitest run tests/menu/keyboard/controllerFeed.test.ts tests/menu/keyboard/radialInput.test.ts tests/menu/keyboard/radialRuntime.test.ts`; confirm intended failures, implement, rerun plus keyboard suite. Commit `Menu keyboard: scoped dual-stick input and radial typing`.

**Runtime decision:** Use ordinary axes/button hooks with the active Steam controller index, fallback zero, in range 0–15. If active controller changes, unmount the old subscriber and reset the input baseline before subscribing to the new index. Do not start device-support flows, disable Home/Quick Access, enable analog messages or set keyboard action sets. The existing axes hook already serves the compact drag; if the radial device check proves additional input setup necessary, investigate source and restoration before introducing any global side effect.

### Task 3: Separate corner-wheel renderer and session lifecycle

**Files:** Create `components/RadialKeyboard.tsx`, `radialStyles.ts`; modify `styles.ts`, `presentation.ts` if needed to include the new portal in reveal gates. Tests `tests/menu/radialKeyboard.test.ts`, `tests/menu/keyboard/radialRuntime.test.ts`, `tests/menu/styles.test.ts`, `tests/menu/presentation.test.ts` (create only if absent).

**Interfaces:**
- `RadialKeyboard` accepts the same draft/layout/session/send/field responsibilities as `MenuKeyboard`, with `unavailable():void` for recoverable fallback and `ownsInput():boolean` for modal/input gating.
- Hook-free `RadialKeyboardView` accepts wheel bounds, layouts, selection/layers/uppercase, layout short name, and callbacks; exposes two refs/region elements and no draft text copy.
- Portal wrapper class `.gg-radial-keyboard-host`; two frost attributes `keyboard-left` and `keyboard-right`. Host is in `field().ownerDocument.body`, outside transformed `.gg-menu`; CSS variables are explicitly inherited/copied from the menu token source.

- [x] Write failing view-element tests: exactly two wheels and both local hints; no duplicate draft, shared panel or drag strip; each wedge has a textual character; selected and blank centres reflect state; uppercase labels on both sides; current layout short name shown. A pure view test proves props/markup, not mounted Steam behavior.
- [x] Add DOM lifecycle tests for a small extracted portal/event lease used by the component: outside-tap inside set contains both wheels and compose; wheel clicks never hit outside-menu dismissal; outside click dismisses only keyboard; resize repositions using Task 1; unavailable placement closes with a recoverable message. Closing restores compose focus only if that same chat is still active.
- [x] Run targeted tests and confirm missing behavior. Implement the view and session wrapper. Mount Task 2 subscribers only for an open usable radial session. Keep freshest draft/send/layout callbacks in refs and clear held accents on layout/close. Trigger release preserves accents. On R1 use existing next-supported-layout logic and reset selection/rearm. Keep physical input through the existing capture helper, without duplicate handlers.
- [x] Style scoped native-document circles using existing glass/readability and label-shadow tokens. Hints reserve 30px below each wheel; no Social-column blur. Tie opacity/reveal to menu presentation and hide/dispose body portals when it closes; a hidden portal cannot retain keyboard ownership. Pointer wedge activation may type for testing, but never dismiss the popup.
- [x] Run targeted tests and keyboard suite. Commit `Menu keyboard: independent radial wheels in screen corners`.

### Task 4: Saved mode and menu input ownership

**Files:** Modify `preferences.ts`, `components/MenuPreferences.tsx`, `components/SocialPanel.tsx`, `components/MenuShell.tsx`, `navigation.ts`; tests `tests/menu/{preferences,socialPanel,navigation}.test.ts`, plus a hook-free preferences view test if needed.

**Interfaces:**
- `type SocialKeyboardMode = 'compact' | 'radial'` in `preferences.ts`.
- `MenuPreferences` snapshot gains `socialKeyboard:SocialKeyboardMode`; store adds `setSocialKeyboard(mode:SocialKeyboardMode):Promise<void>`. Maintain existing version/future-schema protection and preserve the mode when saving enabled/pins.
- `SocialPanel` gains a mode prop and `ownsInput()` input gate from shell; renderer follows the saved preference. Feed failure is a per-open override to Compact plus an inline error, without silently changing the saved preference.
- A session-scoped owner distinguishes radial input from compact cancel handling. Prefer optional `KeyboardSession` ownership metadata with explicit `mode()`/`setMode(mode|null)` methods over a process-wide flag; both keyboard renderers set/clear ownership through their lease.

- [x] Write failing preference tests: legacy/missing/invalid -> Compact, valid Radial roundtrips, concurrent enabled/pins saves retain mode, future versions remain write-protected. UI has `Social keyboard` with `Compact`/`Radial`, disabled until preferences ready and errors surfaced.
- [x] Routing tests dispatch real cancel/tab/direction events through the scoped handlers: while radial is open B/L1/R1/handled face buttons cannot close the keyboard, change tabs, or activate compose again. B causes one deletion through the feed, not both feed and event callbacks. Once closed, original B/tab behavior resumes; Compact's first-B-close behavior is unchanged. Native modals suspend input; do not swallow Home/Quick Access globally.
- [x] Social element-tree tests: renderer selection, unchanged compose draft and Send condition, IME fallback, open/close and another-friend exits. Mode change while open closes the current session before next opening. Feed/placement failure preserves draft and exposes Compact fallback.
- [x] Run `npx vitest run tests/menu/preferences.test.ts tests/menu/socialPanel.test.ts tests/menu/navigation.test.ts` and intended new tests; confirm red then implement.
- [x] Integrate Task 3. Body portals are inside keyboard outside-tap handling even though not inside `.gg-menu`. Narrow event ownership to active radial chat, reset on any session exit, and test cleanup after error and menu close. Run all `tests/menu`. Commit `Menu keyboard: saved radial mode and scoped controller routing`.

### Task 5: Separate circular frost regions end to end

**Files:** Modify `src/menu/frost/{types,host,geometry,controller,home}.ts`, and `backend.ts` only if validation explicitly enumerates regions; `py_modules/gameglance/frost/{contracts,shader,native}.py`, `assets/qam-frost.fx.in`; corresponding `tests/menu/frost/*.test.ts`, `tests/py/test_frost_{shader,native,leases,service}.py` as affected.

**Interfaces:**
- Ordered region IDs become `bar,panel,notifications,status,keyboard,keyboard-left,keyboard-right`; optional set contains the three keyboard regions, retaining compact `keyboard`.
- Host finds radial elements under `.gg-radial-keyboard-host` in the native source document, not `.gg-menu`. Required menu/status lookup stays unchanged.
- `RADIAL_TILE_CSS = {width:280,height:280}` in TS/Python, times DPR, matches Task 1 maximum circle size and does not depend on visibility/selection/layer. No allocation changes while opening/closing/typing.
- Shader uniform prefix names `KeyboardLeft`/`KeyboardRight` and radius uniforms; each has its own D/H/V tile chain, mask, track-empty check and composite contribution. Frontend hyphenated IDs map explicitly to these uniform names; do not rely on a string conversion that produces invalid identifiers.

- [x] Write failing JS/Python tests for both absent, one present, both present, and switching Compact/Radial. Zero optional regions accepted; zero required region rejected. Circle radius is half diameter; masks leave the middle of the chat outside both new regions. Body-portalled lookup, Home surface cleanup and hidden/unplaced circles work.
- [x] Test opening/closing keeps allocation/shader key unchanged for identical context; changes only optional region geometry and does not publish a null clearing existing frost. Selection/layer changes do not trigger geometry RPC updates. Ensure generation/session-close cleanup and fixed-budget allocations still work.
- [x] Add shader/native tests for both new uniform pairs, nonzero/zero geometry, masks/three blur passes and native allowlists. Test backend contract mismatch becomes the existing unavailable/solid fallback rather than clearing chat or throwing unhandled errors. Preserve current compact region coverage.
- [x] Run `npx vitest run tests/menu/frost` and the repository Python test command after verifying a usable environment. Confirm intended failures, implement the paired contract/shader changes, rerun both suites. Commit `Frost: separate optional masks for radial keyboard wheels`.

### Task 6: Whole-suite verification and focused review

**Files:** Update this plan/spec status and the radial plan's own progress ledger; fix only findings from this feature. Do not delete the earlier compact keyboard plan's SDD workspace.

- [x] Run `npm run typecheck`, `npm test`, and `npm run build` from the worktree. Run the full `tests/py` suite using an existing verified venv; if missing, create a task-owned temporary venv from project requirements rather than assuming the handoff's scratch path still exists. Record actual command, counts and failures.
- [x] Render both full-frame layout states with anonymised real Ally imagery: handheld and docked, letters and trigger extras, uppercase and blank centres. Check live component geometry/style in a browser harness where possible; do not present the earlier clickable HTML mock as runtime verification.
- [x] Obtain a focused independent review of changes since the recorded execution baseline: subscriptions/controller indices, event ownership and duplicate actions, accent/modifier state, lifecycle/portals, frontend/backend region parity, fallback and compact regressions. Follow the chosen execution workflow's review gates; fix important findings and rerun relevant checks.
- [x] Record local completion and remaining device-only checks. No installation until explicitly authorised. Commit the checked feature/documentation with accurate agent attribution; do not mark the Ally checks as passed.

### Task 7: Authorised Ally trial and tuning

**Files:** Update spec acceptance/status and ledger only after actual device evidence; small fixes receive their own failing regression tests where feasible.

- [ ] Present the concrete checked build and backup/restore plan to the user for install approval. Install only with the in-game menu closed; back up frontend/backend files, verify transferred checksums, and arrange the required full restart for changed Python. Never use direct effect-atom injection or start device calibration flows.
- [ ] With user controller input, verify each stick separately and simultaneously; each L3/R3; independent/both triggers; L1 uppercase across both wheels; R1 layout changes; Y/B/A/X; blank centred clicks; no repeats on holds or stale held actions at opening.
- [ ] Type Spanish accents by selecting acute with a trigger, releasing it, then selecting lower/uppercase letters. Confirm actual draft is legible and Send eligibility/loading is shared. Test a long draft, grapheme delete, one-layout cycle, unavailable feed and active-controller change.
- [ ] Check game/Home and handheld/docked corners, new/fresh frost worker, menu close/reopen, chat/friend/tab/Notifications exits, native modal interruptions, outside taps, and switching back to Compact. Compare keyboard responsiveness while idle/selecting/typing; ensure no frost RPC per selection frame.
- [ ] Record actual results and any tuning constants. Only then mark device acceptance complete. Keep branch local; publishing/merging remains the user's decision.

## Plan self-review

- Coverage: Task 1 covers all characters/angle/geometry; Task 2 controls/modifiers/typing; Task 3 independent UI and session lifetime; Task 4 opt-in mode and ownership; Task 5 two-region frost; Tasks 6–7 automated and device acceptance.
- Interfaces: Task 1 owns `RadialLayout` and selection geometry; Task 2 imports those and emits `RadialCommand`; Task 3 consumes commands/snapshots; Task 4 owns preference/session routing; Task 5 consumes the component's exact two region IDs.
- All five Review Focus items have explicit regression assertions in their owning tasks. No device acceptance is inferred from source reading or pure tests.
- Spec clarification: include the main dead key from the compact letters bottom row in extra characters; using compact symbols rows alone would omit Spanish acute. This preserves the approved intent of accessible accents and existing reducer semantics.
- Execution begins only after the user reviews this written plan and selects Native or Subagent-driven execution. Recommend Native: these tasks share controller/session/frost interfaces, and one implementer can preserve that context efficiently with a final independent review.

## Execution status

Tasks 1–6 implemented and checked locally under Native execution. Task 7 remains pending installation/restart approval and resolution of the inherited Compact drag installation blocker. Validation report: `docs/superpowers/reports/2026-10-29-social-radial-keyboard-local-validation.md`.
