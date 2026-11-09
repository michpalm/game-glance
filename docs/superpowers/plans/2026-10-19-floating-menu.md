# Game Glance Floating Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an optional controller-operated floating menu using the approved design, real Steam bindings, and reliable native fallbacks.

**Architecture:** A pure menu model and coordinator control a React tree in Steam's existing menu host. Small adapters own native discovery, subscriptions, settings commands, and native handoffs. The host/focus milestone must pass on the Ally before settings and data panels are added.

**Tech Stack:** Existing TypeScript, React 19, `@decky/api`, `@decky/ui`, Vitest, linkedom, backend KV. No new runtime dependency is planned.

**Spec:** `docs/superpowers/specs/2026-10-19-floating-menu-design.md` — read both documents before execution.

## Global Constraints

- All work stays local. No fetch, pull, push, remote branch, PR, release, hosted deployment, or remote publication. Ally debugging/installing a locally built test ZIP is a target-device test, not a repository push; never publish that ZIP.
- Preserve all existing uncommitted work. At execution, follow the worktree skill using a local branch `codex/floating-menu` from the reviewed local HEAD. Do not reset, stash, copy, or commit the user's current dirty files. Do not run setup steps that contact Git remotes. Record the local base SHA and establish its baseline before editing.
- The new menu has its own optional setting, default off. It follows Game Glance's master disable behavior but does not require Spotlight Home to be enabled.
- Persist 1–4 unique pinned sections. Defaults: Navigate, Quick settings, Performance, Social. More is always present. Hidden sections remain in More.
- A running game adds the first In game section outside that allowance. Pin allowance stays four even when no game is running.
- Fixed Steam blue `#1a9fff` when no game accent is available; preserve `FRIEND_COLOURS` from `src/home/friends.ts`.
- No global manual event routing, native-root CSS hiding, hardcoded Steam bundle module IDs, profile database, raw game termination, or simulated production controls.
- Settings writes require authoritative readback. Normal close/unload never restores old user setting values.
- Embedded chat, generic plugin embedding, guide articles, notification Clear all, and custom soundtrack playback are deferred. Use explicit native handoffs.
- Run `npx tsc --noEmit` and `pnpm test` before `bash scripts/package.sh`; packaging alone does not validate code. Keep commits local and limited to this feature's paths.

## Review Focus

1. Another plugin patches the same method while ours is active: cleanup must preserve its later patch (Task 2).
2. A settings write finishes after a device/account/game change: it must not update the new context or send queued values there (Task 5).
3. A game exits with focus in an achievement/controller view: remove stale content and move to a valid remaining section (Tasks 1 and 8).
4. Keyboard/modal focus takes over during a held shoulder button: suspend menu input and avoid changing tabs on return without a fresh event (Task 3).
5. Settings load fails or master enablement changes during native handoff: leave native access usable and release owned resources exactly once (Tasks 2 and 4).

---

## File map and shared contracts

New production files live under `src/menu/`; tests under `tests/menu/`. Each task names its exact subset. Preserve existing styles and data readers; reuse them through adapters instead of copying whole components.

Shared signatures below are decisions for implementation, not code already added:

- In `model.ts`: `SectionId = 'navigate' | 'quick-settings' | 'performance' | 'social' | 'plugins' | 'help' | 'soundtrack' | 'in-game' | 'more'`; `PinnedSectionId` excludes `in-game` and `more`; `Entry = 'home' | 'quick-access'`; `Stop = () => void`.
- `GameContext { appId: number; gameId: string; name: string; kind: 'local' | 'streamed' | 'non-steam'; actionIds: string[] }`; unavailable/ambiguous native context returns null and exposes a native running-app chooser.
- `MenuState { phase: 'disabled' | 'closed' | 'custom-open' | 'native-handoff' | 'failed'; entry: Entry; section: SectionId; stack: string[]; pins: PinnedSectionId[]; game: GameContext | null; focus: Partial<Record<SectionId,string>> }`.
- `MenuEvent`: discriminated events `enable(value)`, `open(entry)`, `select(section)`, `step(-1|1)`, `push(viewId)`, `back`, `close`, `pins(value)`, `game(value)`, `focus(section,key)`, `handoff`, `failure`, and `reset`. Define as a TypeScript union, not untyped strings at call sites.
- In `steam/runtime.ts`: `NativeRequest` uses discriminants `kind: 'main-menu' | 'qam' | 'navigate' | 'game-action' | 'guide-article' | 'friend-chat'` for main menu, named QAM tab, Navigate destination, game action, guide article, and friend chat respectively; app/game/file/Steam IDs retain their native types. `NativeBindings` owns capabilities, `subscribeGame(listener): Stop`, `openNative(request): Promise<void>`, `attachHost(render: (nativeTree: ReactNode) => ReactNode): HostAttachment`, and `installIntentHandlers(handlers: {open: (entry: Entry, replayNative: Stop) => void; closed: Stop; suspended: (value: boolean) => void}): Stop`. Capabilities are a read-only set of discovered feature names, never inferred from a method name alone.
- In `host.tsx`: `HostAttachment { present(node: ReactNode): Promise<void>; suspend(): void; close(): void; dispose(): void }`. Mount failure rejects and leaves native rendering available. Render integration must preserve the original native tree for fallback.
- In `steam/setting.ts`: `SettingScope = { kind: 'global' } | { kind: 'game'; gameId: string } | { kind: 'unknown' }`; `SettingSnapshot<T> { available: boolean; value: T | null; pending: boolean; scope: SettingScope; error: string | null; min?: number; max?: number; step?: number; options?: readonly T[] }`; `SettingAdapter<T> { get(): SettingSnapshot<T>; subscribe(listener: Stop): Stop; set(value: T): Promise<void>; dispose(): void }`.

Use typed, dependency-injected seams around Steam calls. Tests run in the existing Node Vitest configuration; use linkedom for focused DOM integration tests without changing the global test environment. Device behavior must be checked on Steam itself.

### Task 1: Menu state, pin migration, and local history

**Files:** Create `src/menu/model.ts`, `src/menu/preferences.ts`, `tests/menu/model.test.ts`, `tests/menu/preferences.test.ts`.

**Interfaces:** Produce `defaultMenuState(): MenuState`, `reduceMenu(state: MenuState, event: MenuEvent): MenuState`, `visibleSections(state): SectionId[]`, and `selectedBarSection(state): SectionId`. Produce `createMenuPreferences(kv: KvBackend)` with `load(): Promise<void>`, `get(): {version:1; enabled:boolean; pins:PinnedSectionId[]}`, `subscribe(listener): Stop`, `setEnabled(value): Promise<void>`, and `setPins(value): Promise<void>`.

- [ ] **Step 1 — failing tests.** Assert default pins `['navigate','quick-settings','performance','social']`; KV key `menu:preferences`, version 1 and enabled false. Assert zero/invalid pins reset to defaults; duplicate/unknown pins are removed; five valid old pins retain their first four. An interactive fifth pin or removal of the final pin rejects without changing state. Assert `visibleSections` adds `in-game` first only with a game, and `more` last. Opening hidden Quick settings selects More in the bar; B returns to More. Same entry toggles closed, other entry changes entry/section, and nested B pops one level. Game exit clears game-specific stack and focus and selects Navigate if In game was active.
  Contract examples: `default pins and game slot`: `expect(visibleSections(defaultMenuState())).toEqual(['navigate','quick-settings','performance','social','more'])`; `fresh Quick Access chooses hidden section`: assert `state.section === 'quick-settings'` and `selectedBarSection(state) === 'more'`; `game exit removes detail`: assert `state.stack` is `[]` and `state.section === 'navigate'`.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/model.test.ts tests/menu/preferences.test.ts`; expect missing exports/behavior failures, not test-environment errors.
- [ ] **Step 3 — implement.** Keep the reducer pure. Preferences use existing `KvBackend`, with immutable snapshots and serialized saves. Loading a newer unsupported schema leaves the feature disabled and preserves the stored value; it must not silently overwrite it. Do not edit the existing master settings schema.
- [ ] **Step 4 — run green.** Repeat those tests plus `npx tsc --noEmit`; require all pass. Include the game-exit assertion from Review Focus 3.
- [ ] **Step 5 — local commit.** Stage only the four named files; commit `feat: model floating menu state and preferences`.

### Task 2: Guarded native discovery, intent dispatch, and coordinator

**Files:** Create `src/menu/steam/runtime.ts`, `src/menu/steam/patchOwnership.ts`, `src/menu/coordinator.ts`, `tests/menu/runtime.test.ts`, `tests/menu/coordinator.test.ts`.

**Interfaces:** Consume Task 1. Produce `discoverMenuRuntime(): NativeBindings | null` and `createMenuCoordinator({bindings, getState, dispatch, render}): {start(): Stop; open(entry: Entry): Promise<void>; handoff(request: NativeRequest): Promise<void>; close(): void}`. Intent handlers preserve original Home/Quick Access semantics and forward unmatched/native requests.

- [ ] **Step 1 — failing tests.** Inject a fake native menu/window and assert: no supported host returns null; no assignment to a non-writable bound QAM method; no patch before enablement; mount failure replays the original opening once; modal suppression/VR delegates; tab-selection-only requests never show the menu; ordinary programmatic requests stay native; keyboard/configurator return logic in the original handler runs. Assert same/opposite button behavior is based on one owned intent, not duplicate render activation. Handoff suspends custom focus before native open. A later foreign patch survives cleanup. Disable during handoff, exception during start, and repeated stop each release owned resources exactly once.
  Named assertions: `foreign patch survives stop`: `expect(target.OpenSideMenu).toBe(foreignPatch)`; `failed mount replays native once`: `expect(replayNative).toHaveBeenCalledTimes(1)`; `selection-only QAM does not mount`: `expect(attachHost).not.toHaveBeenCalled()`. The tests define their fake target/bindings and spies explicitly.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/runtime.test.ts tests/menu/coordinator.test.ts`.
- [ ] **Step 3 — implement.** Discover export shapes/signatures with `@decky/ui` discovery helpers and validate descriptors/window context before patching. Preserve the original native renderer/action delegates. Install intent scope around original button dispatch and a guarded common opening seam; never copy the prototype's catch-all controller router. Track each cleanup resource immediately after acquisition, unwind partial installs, restore descriptors only while owned, and log discovery failures once. `openNative` has a scoped bypass cleared in finally. No native write is issued during discovery.
- [ ] **Step 4 — run green.** Repeat both suites and typecheck. Cover Review Focus 1 and 5 with descriptor/function-identity assertions, not only call counts.
- [ ] **Step 5 — local commit.** Stage named files only; commit `feat: coordinate native and floating menu lifecycles`.

### Task 3: Native-host React shell and controller navigation

**Files:** Create `src/menu/host.tsx`, `src/menu/components/MenuShell.tsx`, `src/menu/components/MenuBar.tsx`, `src/menu/components/MorePanel.tsx`, `src/menu/styles.ts`, `tests/menu/host.test.ts`, `tests/menu/navigation.test.ts`.

**Interfaces:** Consume the model/coordinator/runtime contracts. `MenuShell({state, dispatch, handoff, close})` renders the frame; `MenuBar({state, dispatch})` renders visible sections. `MorePanel({state, preferences, handoff, dispatch})` provides hidden sections, Configure menu and Open Steam menu. `createNativeHost(bindings): HostAttachment` owns its React/native focus subtree.

- [ ] **Step 1 — failing tests.** With linkedom and fake host/focus ownership, assert failed discovery/mount preserves native content; only custom-open can take input; suspend/dispose deactivate and remove owned trees once; remembered focus restores by stable key or falls back when missing. Assert B on Configure menu returns to More, shoulder traversal follows visible sections, pointer selection updates the same model, and controls do not overlap at layout breakpoints. Hold/repeat events while a modal/keyboard is active must not queue tab switches for later replay.
  Named assertions: `modal consumes held shoulder`: `expect(afterModal.section).toBe(beforeModal.section)`; `failed render preserves native tree`: `expect(renderedTree).toBe(nativeTree)`; `dispose twice releases tree once`: `expect(releaseTree).toHaveBeenCalledTimes(1)`. Capture these values through the fake host/focus interface, not private React internals.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/host.test.ts tests/menu/navigation.test.ts`.
- [ ] **Step 3 — implement.** Use Decky/Steam Focusable/navigation primitives inside the native menu's owning window/context. Discover and wrap the actual renderer with a native fallback/error boundary. Capture the validated native export shape in a test fixture; if a stable render seam cannot be resolved, stop at this gate and revise the host design rather than falling back to global input routing. Scope styles to `.gg-menu`; derive artwork tint from existing `home/accentMemo.ts`/`home/accent.ts` facilities; Steam blue when unavailable. Start from the accepted mock at 1.03× the tested scale, with responsive reflow and rounded restrained focus. Render native-entry placeholders for not-yet-wired panels, never fake setting controls. Pins and game identity remain model-driven.
- [ ] **Step 4 — run green.** Run the two suites and typecheck; retain a device checklist for the real keyboard/modal test in Task 4. This covers Review Focus 4.
- [ ] **Step 5 — local commit.** Stage named files only; commit `feat: render floating menu in the native Steam host`.

### Task 4: Default-off integration and mandatory first Ally gate

**Files:** Create `src/menu/startMenu.ts`, `src/menu/components/MenuPreferences.tsx`, `tests/menu/startMenu.test.ts`; modify `src/index.tsx`, `src/components/SettingsPanel.tsx`; create `docs/device-checklists/floating-menu.md`.

**Interfaces:** `startMenu({masterSettings, preferences, discover}): Stop`; consume the existing master settings `get`/`subscribe`, Task 1 preferences and Task 2 runtime discovery. `MenuPreferences` uses that same preferences instance and provides enablement plus Open Steam menu.

- [ ] **Step 1 — failing tests.** Assert interception starts only after successful preferences load and when master enabled plus menu enabled. Master-disabled and menu-disabled leave native menus unpatched. Preferences load rejection keeps native access and permits retry. Turning either switch off during native handoff fully disposes owned custom resources. Unload continues other plugin cleanup steps if menu cleanup throws. Spotlight Home off does not disable an otherwise enabled menu.
  Named assertions: `preferences load rejects`: `expect(discover).not.toHaveBeenCalled()` and native recovery remains callable; `master disabled during handoff`: `expect(stopNativeHooks).toHaveBeenCalledTimes(1)`; `Spotlight Home independent`: enabling only the menu/master starts discovery with Spotlight Home false.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/startMenu.test.ts`.
- [ ] **Step 3 — implement.** Add one independently guarded startup/cleanup entry to the existing plugin lifecycle. Add default-off menu settings using existing KV loading/persistence patterns. Do not restructure unrelated Home/settings work. Document exact test steps, restoration state and evidence category in the new checklist.
- [ ] **Step 4 — local/device gate.** Run typecheck and `pnpm test`, then package a local test ZIP. Verify `unzip -t out/game-glance.zip` and record its SHA-256 before any Ally copy. On the Ally check Home/in-game buttons, same/opposite press, A/B/LB/RB, touch/mouse, keyboard/modal/held button, native Decky/configurator return, game input, disable, reload and failed-mount recovery. Restore native menus after testing. Do not start Tasks 5–9 until this gate passes or the user reviews a documented host limitation.
- [ ] **Step 5 — local commit.** Stage only named files and checklist; commit `feat: integrate optional floating menu with safe native recovery`.

### Task 5: Authoritative setting adapter and write queue

**Files:** Create `src/menu/steam/setting.ts`, `src/menu/steam/writeQueue.ts`, `tests/menu/setting.test.ts`, `tests/menu/writeQueue.test.ts`.

**Interfaces:** Produce the SettingAdapter/Snapshot contracts above. `createSettingAdapter<T>({read, subscribe, write, contextKey, validate, coalesceMs, timeoutMs}): SettingAdapter<T>`, where `read: () => Omit<SettingSnapshot<T>, 'pending' | 'error'>`, `write: (value:T, contextKey:string)=>Promise<void>`, `subscribe: (listener: Stop)=>Stop`, `contextKey: ()=>string`, and `validate: (value:T, snapshot:SettingSnapshot<T>)=>T|null` (null rejects the request). Coalescing/timeout values are milliseconds. `contextKey()` is captured for each issued command. A queued value belongs only to that key.

- [ ] **Step 1 — failing tests.** Write tests for clamped native readback, unavailable controls, rejection, timeout, rapid 60→61→62 changes, stale completion, and disposal. Assert no success before a matching/clamped authoritative update, no stale completion overriding a newer snapshot, and no queued command crossing a changed context. An issued command remains observed until acknowledgement/error even if its panel closes. A later explicit user/native change must not be overwritten by restoring the old value.
  Named assertions: `stale completion cannot replace new context`: `expect(adapter.get().value).toBe(newContextValue)`; `queued value is dropped after device change`: `expect(write).not.toHaveBeenCalledWith(oldQueuedValue,newContextKey)`; `close does not restore old setting`: `expect(write).not.toHaveBeenCalledWith(originalValue,contextKey)`. Use an originalValue different from every intentional test command.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/setting.test.ts tests/menu/writeQueue.test.ts` with fake timers and a controllable native subscription.
- [ ] **Step 3 — implement.** Serialize issued writes; coalesce unsent slider values, discard obsolete contexts, use a 3-second default acknowledgement timeout and surface timeout as unconfirmed state, not guaranteed failure of the native write. Keep last authoritative value and continue listening for late updates. Release native listeners only when all required in-flight observation is settled or transferred to session ownership. This is Review Focus 2.
- [ ] **Step 4 — run green.** Repeat targeted tests and typecheck. Assert pending/error transitions and listener disposal.
- [ ] **Step 5 — local commit.** Stage named files; commit `feat: reconcile menu setting writes with native readback`.

### Task 6: Navigate, Quick settings and core native entries

**Files:** Create `src/menu/steam/routes.ts`, `src/menu/steam/quickSettings.ts`, `src/menu/steam/notifications.ts`, `src/menu/components/NavigatePanel.tsx`, `src/menu/components/QuickSettingsPanel.tsx`, `tests/menu/routes.test.ts`, `tests/menu/quickSettings.test.ts`, `tests/menu/notifications.test.ts`; modify `src/menu/components/MenuShell.tsx`.

**Interfaces:** `createRoutes(bindings): {open(request:NativeRequest):Promise<void>}`; `createQuickSettings(bindings): {controls:Record<string,SettingAdapter<number|boolean>>; dispose():void}`; `createNotificationBadge(bindings): {get():number; subscribe(listener):Stop; dispose():void}`. Native request QAM names are `notifications`, `friends`, `quick-settings`, `performance`, `help`, `soundtrack`, `decky`; map them to discovered enum values, not mock tab positions. Navigate destinations are `library`, `store`, `downloads`, `settings`, `profile`, `power`. Game action IDs are the native capability-derived action names; guide handoffs include app ID and full published-file ID; friend handoffs include the full Steam ID string.

- [ ] **Step 1 — failing tests.** Test accepted Navigate grid destination mapping; current-user Profile resolver and parental/offline guards; native Power workflow. Audio selects active output rather than first device, enum AllOutput=1 and a separate valid microphone path; missing input/output capabilities ignore meaningless volume fields. Brightness follows callback-fed state. Wi-Fi, Bluetooth, Airplane, Night mode, UI scaling and Friends DND use their inspected native bindings only when available. Assert a two-group/zero-unviewed notification state displays no badge, opens native notifications and invokes no clear/viewed operation itself. Every native handoff deactivates custom focus first.
  Named assertions: `active output is not first`: `expect(writeVolume).toHaveBeenCalledWith(909,1,0.5)` for first device 908 / active 909; `tray count is not badge`: `expect(badge.get()).toBe(0)` with two groups; `zero badge never clears`: `expect(clearToasts).not.toHaveBeenCalled()`.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/routes.test.ts tests/menu/quickSettings.test.ts tests/menu/notifications.test.ts`.
- [ ] **Step 3 — implement.** Use Task 5 adapters and source the exact live toggle handlers described in the investigation. Keep unsupported controls absent with a native Quick Settings entry. Set output-volume and brightness coalescing to 100 ms; toggles issue immediately. Place Wi-Fi/Bluetooth side by side and verified Other toggles together. Label Friends DND scope. Wire badge left of bell; zero omits count. Help, Soundtrack and Open Steam menu use the shared native request path.
- [ ] **Step 4 — run green/device.** Run the three suites and typecheck. On Ally test reversible readback for newly wired controls; do not disable the only network path used for testing. Record untested/network-sensitive controls explicitly, retaining native access rather than claiming validation. Recheck device changes and readback failure behavior.
- [ ] **Step 5 — local commit.** Stage named files; commit `feat: connect menu navigation and quick settings`.

### Task 7: Capability-aware Performance panel

**Files:** Create `src/menu/steam/performance.ts`, `src/menu/components/PerformancePanel.tsx`, `tests/menu/performance.test.ts`; modify `src/menu/components/MenuShell.tsx`, device checklist.

**Interfaces:** `createPerformance(bindings): {controls:Record<string,SettingAdapter<number|boolean|string>>; getProfile():{currentGameId:string;activeProfileId:string;isGameSpecific:boolean;label:string}; subscribeProfile(listener):Stop; setGameSpecific(enabled:boolean):Promise<void>; dispose():void}`. Profile toggle delegates to Steam; no Game Glance profile persistence.

- [ ] **Step 1 — failing tests.** Assert native platform bounds/options are used (fixture 4–20 W, 200–1800 MHz, three profile strings), stale legacy 3–15 W limits are ignored for client TDP, unknown scope is never marked game-specific, and current game 1057090/active 769 reports default profile. Cover missing service, display changes, fractional frame target choices, unavailable HDR/VRR, disabled/deferred controls and enum ordering: scaling IDs Auto=1, Integer=2, Fit=3, Fill=4, Stretch=5 despite displayed Stretch preceding Fill. Native profile toggle targets the native current game and normal close performs no reset/save/restore.
  Named assertions: `service bounds win`: `expect(controls.tdp.get()).toMatchObject({min:4,max:20})`; `default profile with game running`: `expect(adapter.getProfile()).toMatchObject({currentGameId:'1057090',activeProfileId:'769',isGameSpecific:false})`; `no invented per-game client scope`: `expect(controls.frameLimit.get().scope).toEqual({kind:'unknown'})` until supported by native evidence.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/performance.test.ts`.
- [ ] **Step 3 — implement.** Keep client-setting controls separate from legacy profile-aware controls. Query platform service capabilities and native refresh choices; invalidate on capability changes. Use native-equivalent coalescing: frame target 700 ms, GPU clock 200 ms, simple toggles immediate; use 100 ms only when no native delay is specified for a continuous control. Preserve profile pill, four internal subsections and Disable limit/VRR row. Reset opens native Performance until its full workflow passes its separate test. Retain a native Performance action.
- [ ] **Step 4 — run green/device.** Run targeted tests and typecheck. Validate each enabled write with reversible readback; recheck capability bounds after power/display changes. Do not enable/save a previously unused game profile merely to claim cross-game persistence without a restoration plan. Record stored-value and effective-gameplay measurements separately.
- [ ] **Step 5 — local commit.** Stage named files/checklist; commit `feat: connect performance controls to native capabilities`.

### Task 8: Running game, achievements, guides and controller overview

**Files:** Create `src/menu/steam/runningGame.ts`, `src/menu/steam/achievements.ts`, `src/menu/steam/guides.ts`, `src/menu/steam/controller.ts`, `src/menu/components/RunningGamePanel.tsx`, `src/menu/components/AchievementsPanel.tsx`, `src/menu/components/GuidesPanel.tsx`, `src/menu/components/ControllerOverview.tsx`; create matching `tests/menu/{runningGame,achievements,guides,controller}.test.ts`; modify MenuShell and checklist.

**Interfaces:** `createRunningGame(bindings): {get():GameContext|null;subscribe(listener):Stop;dispose():void}`. Data adapters provide `load(context, signal)` and `dispose()`: achievements returns `{total,earned,entries}`; guides accepts `{appId,page,pageSize,collection:'popular'|'favorites'}` and returns `{page,totalPages,entries}`; controller accepts `{appId,controllerIndex}` and returns `{title,official,recommended,groups}` or a typed unavailable result. Define these immutable result types in their owning files. Keep IDs as native numbers/strings, especially guide/Steam IDs as strings.

- [ ] **Step 1 — failing tests.** A foreground Steam ID 769 with running Ori selects Ori; ambiguous/multiple/streamed/non-Steam state uses available native actions. No direct termination. Reject stale responses after game exit/account changes; assert the active game panel's stack/focus moves safely (Review Focus 3). Full catalog contains all 37 fixture entries rather than only highlights; locked hidden achievements stay concealed until explicit reveal and zero progress range is safe. Guides support zero favorites, page boundaries, missing author, filtered content and failed request; no implicit favorite/vote mutation. Controller handles differ from indices, follows the active valid device, and never frees a borrowed config or mislabels recommended as official.
  Named assertions: `full achievement catalog`: `expect(result.entries).toHaveLength(37)`; `borrowed configuration is never freed`: `expect(freeConfig).not.toHaveBeenCalledWith(borrowedHandle)`; `unavailable author keeps guide readable`: `expect(result.entries[0].title).toBe(guideTitle)` and the unavailable-author label is present.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/runningGame.test.ts tests/menu/achievements.test.ts tests/menu/guides.test.ts tests/menu/controller.test.ts`.
- [ ] **Step 3 — implement.** Reuse native game actions/history and context; Resume/Exit/Notes/Recording/details remain native. Read achievements from full native catalog, subscribe where the callback contract is verified. Guides use native PublishedFile read services, language/content preferences and bounded page size 10; article selections hand off using the native game-controls history. No article bodies fetched. Controller reader owns only handles it acquired; if cold-load/decode/free cannot be verified, return unavailable and offer native overview. Do not mutate the active editing configuration just to render a summary. All requests are lazy on section entry and guarded by context generation.
- [ ] **Step 4 — run green/device.** Run targeted tests/typecheck. Verify native history/Back for each handoff, game exit during load, guide empty/offline behavior, and controller disconnect. Custom controller overview remains gated until independent cold-load/free succeeds; log a native fallback as a supported result, not custom-overview success.
- [ ] **Step 5 — local commit.** Stage named files/checklist; commit `feat: add live running-game menu content`.

### Task 9: Social native chat and reusable Game Glance settings

**Files:** Create `src/menu/steam/social.ts`, `src/menu/steam/plugins.ts`, `src/menu/components/SocialPanel.tsx`, `src/menu/components/PluginsPanel.tsx`, `src/components/settings/SettingsSections.tsx`, `tests/menu/social.test.ts`, `tests/menu/plugins.test.ts`; modify `src/components/SettingsPanel.tsx`, MenuShell, checklist.

**Interfaces:** Social consumes existing `readFriends`, `mapFriends`, `FRIEND_COLOURS` and produces a subscribed immutable friend list with `openChat(steamId:string):Promise<void>`. Plugins exposes a read-only list and native Decky handoff. `SettingsSections({section,layout:'decky'|'menu'})` uses existing settings/backend/action handlers; the existing SettingsPanel keeps its Decky presentation.

- [ ] **Step 1 — failing tests.** Assert stable full-string Steam IDs, existing presence colors and 30/70 layout selection; offline/empty friends do not create chats. Chat selection invokes only native handoff, with no custom read acknowledgement, queue initialization or send. Arbitrary plugins open Decky, never mount plugin.content. Game Glance view and existing Decky view read/write the same settings/actions and reflect each other's changes; unmount invokes no update/install action. Use controller DOM tests only for focus and selection behavior, not markup snapshots.
  Named assertions: `open chat uses string ID`: `expect(openNative).toHaveBeenCalledWith({kind:'friend-chat',steamId:'76561198000000000'})` (make this the NativeRequest discriminant); `native chat does not send`: `expect(sendChatMessage).not.toHaveBeenCalled()`; `same settings instance`: change an existing setting through one presentation and assert the other reads the updated store value.

- [ ] **Step 2 — run red.** `npx vitest run tests/menu/social.test.ts tests/menu/plugins.test.ts` plus existing affected settings tests.
- [ ] **Step 3 — implement.** Keep selected friend's compact identity and the native chat action in the right pane; no sample messages/composer. Refactor only the settings presentation necessary for the shared section body; retain all current conditional controls, preload/cache/update handlers and confirmations. Decky lifecycle stays native for other plugins. Reuse SettingsPanel changes from the local base only; reconcile the user's separate dirty settings work later in a deliberate local integration step.
- [ ] **Step 4 — run green/device.** Run targeted/affected tests and typecheck. Verify native chat keyboard/Back without sending a live message; verify Game Glance settings changes from both entries and plugin/modal fallback. Any live message test needs a direct user instruction naming the intended send.
- [ ] **Step 5 — local commit.** Stage named files/checklist; commit `feat: integrate social and plugin menu fallbacks`.

### Task 10: Whole-feature local verification and review package

**Files:** Modify `docs/device-checklists/floating-menu.md`, `docs/features.md`; update regression tests only where device findings identify a real gap. No version/release metadata change is required for a local test.

**Interfaces:** Consumes the completed feature and its result checklist. Produces a local reviewable diff, verified test ZIP, hashes and an honest device result matrix. No remote artifact is produced.

- [ ] **Step 1 — review gaps.** Compare every spec behavior to the implemented panels and checklist. For a discovered behavior defect, write its failing regression first and complete that targeted red/green cycle. Do not add repetitive tests merely to increase coverage.
- [ ] **Step 2 — run full checks.** `npx tsc --noEmit` and `pnpm test`; expect zero failures. Then `bash scripts/package.sh`, `unzip -t out/game-glance.zip`, `shasum -a 256 out/game-glance.zip`. Inspect package contents to confirm the built implementation is present. Identify unrelated baseline failures separately; do not silently fix or claim them passing.
- [ ] **Step 3 — Ally acceptance.** Test Home/game contexts, no artwork fallback, 1/4 pin limits, hidden sections, dynamic In game, data errors, native fallbacks, slider ordering/readback, keyboard/modal, sleep/resume, display/controller changes, disable and reload while open. Review the 3% scale increase and focus treatment. No simulated settings, fake chats, sample guides or placeholder player may remain in the functional build. Restore native/default-off state after testing unless the user asks to keep the feature enabled.
- [ ] **Step 4 — local review.** Use the execution workflow's required independent review with the approved execution method. Resolve findings, rerun checks justified by changes, and record any remaining device limitation. Compare the feature branch only against its recorded local base. Do not merge/cherry-pick over current user changes as an incidental final step.
- [ ] **Step 5 — local commit/report.** Commit only feature documentation and verified fixes. Report local branch/base/final SHAs, tests, ZIP hash, device results and remaining gaps. Do not push, open a PR, create a release or publish anything.

## Plan self-review and execution handoff

Coverage: Tasks 1–4 cover bar/history/persistence/host/focus and enablement; 5–7 cover authoritative settings and profile boundaries; 8 covers running-game/data panels; 9 covers the agreed Social/plugin fallbacks; 10 covers complete visual/device/package review. All five Review Focus items have named owning tests. Shared contracts use the same signatures throughout.

The first Ally host gate is an explicit stopping point if native render/focus integration is not sound. Later tasks do not justify bypassing it with the disposable prototype. Per-game persistence and effective-performance claims remain bounded by the evidence in the spec.

Plan status: ready for user review, not executing. Recommend inline execution by the current agent using `superpowers:executing-plans`, with sequential local commits and the stated device gates; the coordinator/host/setting contracts are tightly coupled. Delegated execution remains an alternative if the user prefers it. No agents are dispatched by writing this plan, and no execution method is assumed approved.
