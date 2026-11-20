# Online Status and Audio Device Pickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A status pill beside the Social heading (Online, Away, Invisible, Offline) and Output/Input device pills under the Quick settings sliders, both opening one shared menu dropdown.

**Architecture:** One shared dropdown (`MenuPicker`: a stateless view plus a thin stateful wrapper, the repo's pattern for testable menu components). A persona binding over Steam's friends store (`src/menu/steam/persona.ts`) feeds the Social panel; the existing Quick settings audio binding grows override read/write and a pure `audioChoices` that the panel renders.

**Tech Stack:** TypeScript, React 19, `@decky/ui` (`Focusable`), Steam globals (`g_FriendsUIApp.FriendStore`, `SteamClient.System.Audio`), vitest + linkedom.

**Spec:** `docs/superpowers/specs/2026-11-12-status-and-audio-pickers-design.md` (read it with this plan).

## Global Constraints

- Repo `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`, branch `fix/menu-contrast-play-handoff`. No commits or pushes unless Michael asks; each task ends with a **Checkpoint** (tests, `tsc`). Commit identity when asked: `Michael Palma <18511803+michpalm@users.noreply.github.com>`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Steam writes allowed: `FriendStore.SetUserPersonaState(value)` with value in {0, 1, 3, 7}; `Audio.SetDefaultDeviceOverride(id, type)`; `Audio.ClearDefaultDeviceOverride(type)`. Type 1 = output, 0 = input. Call nothing else new.
- Status values and copy: Online 1, Away 3, Invisible 7 (sub "Appear offline, still chat"), Offline 0 (sub "Sign out of Friends"). Dots: Online `#57cbde`, Away `#7f8a96`, Invisible hollow grey ring, Offline `#3d4450`.
- Audio copy: pill labels "Output" / "Input"; first option "Automatic", sub "Follows the connected device"; pill text without an override `Automatic · <active sName>`; with one, the device's `sName`. Device entries show `sName` only (no second line).
- The audio pills always show while the audio binding is available, even with one device.
- Pill look: the menu glass pill (edge `rgba(182,199,224,.4)`, glass, 12-on-32 corner as `sourcePillLook`'s radius), chevron; the list opens inside the menu panel, under its pill.
- Device check on the Ally: build, back up `~/homebrew/plugins/game-glance/dist/index.js`, install, reload via `scripts/cef-eval.mjs` (`CEF_URL=http://127.0.0.1:18082`). No presses on the device without asking.

## Review Focus

1. **The overridden device is unplugged** (headphones off while chosen): `overrideOutputDeviceId` names a device no longer in `vecDevices`. Expect the pill to read `Automatic · <active>` and Automatic to be ticked, never a blank or stale name. Test in Task 3.
2. **Steam changes the status itself** (auto-Away when idle, or Steam's own friends menu): expect the pill to follow without reopening the menu. Test in Task 2.
3. **Friends network down or logged off:** expect no status pill (no write possible), as Do not disturb hides. Test in Task 2.
4. **A status outside the four** (Busy 2, Snooze 4, Looking to… 5/6): expect a sensible label (Snooze reads "Away", others "Online") with nothing ticked unless it is exactly one of the four. Test in Task 2.
5. **A device vanishes while its list is open:** picking it must not call Steam with a missing id; expect no write and the list to refresh. Test in Task 3.

---

### Task 1: Shared menu dropdown

**Files:**
- Create: `src/menu/components/MenuPicker.tsx`
- Modify: `src/menu/styles.ts` (picker rules)
- Test: `tests/menu/menuPicker.test.ts`

**Interfaces:**
- Produces:
  - `type PickerOption<T extends string | number> = { id: T; label: string; sub?: string; dot?: string }` (`dot`: a CSS colour, or `'ring'` for the hollow ring)
  - `MenuPickerView<T>(props: { id: string; label?: string; text: string; dot?: string; options: PickerOption<T>[]; selected: T | null; open: boolean; onOpen(): void; onPick(id: T): void; onClose(): void }): JSX.Element` — the pill (a `Focusable` with `id`, class `gg-menu-picker`, `onActivate` = `onOpen`), and when `open` a list (`gg-menu-picker-list`) of `Focusable` entries (`gg-menu-picker-option`, `data-selected` on the selected one, `onActivate` = `onPick(id)`, `onCancel` = `onClose`).
  - `MenuPicker<T>(props: Omit<MenuPickerViewProps<T>, 'open' | 'onOpen' | 'onClose'>)` — holds `open`; closing returns focus to the pill.

- [ ] **Step 1: Failing tests** (call `MenuPickerView` directly, `@decky/ui` mocked with `Focusable: 'div'`, walk the tree like `socialPanel.test.ts`):
  - closed: one pill with the given `id`, its text, its label, its dot; no list.
  - open: the list holds one entry per option in order, with `label` and `sub`; only the selected one has `data-selected`; activating an entry calls `onPick` with its id; cancel on an entry calls `onClose`.
  - `selected: null` ticks nothing.
  - styles: `.gg-menu-picker` text has `text-overflow: ellipsis`; `.gg-menu-picker-option` has `white-space: normal`.
- [ ] **Step 2: Run** `npx vitest run tests/menu/menuPicker.test.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** the view, the wrapper and CSS in `src/menu/styles.ts`: `.gg-menu-picker` (inline-flex glass pill, chevron), `.gg-menu-picker-list` (absolute under the pill, `rgb(24,28,36)` background, the menu edge, radius, shadow, `z-index: 2`), `.gg-menu-picker-option` (row; selected: `background: rgba(255,255,255,.14)`, a trailing tick), `.gg-menu-picker-dot` (0.6em circle; `[data-dot="ring"]` a 2px `#9aa4b1` ring). Long names: the pill's text truncates with an ellipsis (`min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`); list entries wrap.
- [ ] **Step 4: Run** — PASS. **Checkpoint:** `npx tsc --noEmit -p .` clean.

### Task 2: Status binding and the Social pill

**Files:**
- Create: `src/menu/steam/persona.ts`
- Modify: `src/menu/startMenu.ts` (create it beside `quickSettings`), `src/menu/components/MenuShell.tsx` (pass `persona` to `SocialPanel`), `src/menu/components/SocialPanel.tsx:99` (the pill in `.gg-menu-heading` after `<h2>`; `SocialContents` takes `status?: PersonaView | null` and `onStatus?(value: PersonaValue): void`)
- Test: `tests/menu/persona.test.ts`, `tests/menu/socialPanel.test.ts`

**Interfaces:**
- Consumes: Task 1 `MenuPicker`, `PickerOption`.
- Produces:
  - `type PersonaValue = 0 | 1 | 3 | 7`
  - `PERSONA_OPTIONS: PickerOption<PersonaValue>[]` — in order Online(1), Away(3), Invisible(7, sub, dot 'ring'), Offline(0, sub), with the Global Constraints' copy and dots.
  - `type PersonaView = { value: PersonaValue | null; text: string; dot: string }`
  - `personaView(raw: unknown): PersonaView` — 1/3/7/0 map to themselves with the option's text and dot; 4 (Snooze) → text "Away", value null; any other number → text "Online", value null.
  - `type FriendStoreLike = { m_eUserPersonaState?: number; SetUserPersonaState?(value: number): void; AddPersonaStateChangedCallback?(callback: () => void): unknown }`
  - `createPersona(store: () => FriendStoreLike | undefined, online: () => boolean, pollMs = 1000): { read(): PersonaView | null; set(value: PersonaValue): Promise<void>; subscribe(listener: () => void): () => void }` — `startMenu.ts` passes `() => globals().g_FriendsUIApp?.FriendStore` and `() => friendsOnline(globals())` (export both from `nativeCore.ts`; `friendsOnline` is the check Do not disturb uses). `read()` is null when `SetUserPersonaState` is missing or `online()` is false; it registers `AddPersonaStateChangedCallback` when present and also polls `m_eUserPersonaState` every `pollMs` while subscribed. `set` calls `SetUserPersonaState(value)` only.

- [ ] **Step 1: Failing tests** (`persona.test.ts`, fake root):
  - `personaView(7)` → `{value:7,text:'Invisible',dot:'ring'}`; `personaView(4)` → `{value:null,text:'Away'}`; `personaView(2)` → `{value:null,text:'Online'}` (Review Focus 4).
  - `read()` null without `SetUserPersonaState`, and null while Friends is offline (Review Focus 3).
  - `set(3)` calls `SetUserPersonaState` once with exactly `3`.
  - **a status changed by Steam** (fake store value 1 → 3, fake timers advanced one poll) notifies the subscriber and `read()` returns Away (Review Focus 2); unsubscribing stops the poll.
  - `socialPanel.test.ts`: with `status`, the heading holds `<h2>Social</h2>`, then a picker with id `social:status`, then the online count; without `status`, no picker.
- [ ] **Step 2: Run** `npx vitest run tests/menu/persona.test.ts tests/menu/socialPanel.test.ts` — FAIL.
- [ ] **Step 3: Implement** `persona.ts`; render `<MenuPicker id="social:status" text={status.text} dot={status.dot} options={PERSONA_OPTIONS} selected={status.value} onPick={onStatus} />` in the heading; `SocialPanel` reads `persona` with `useSyncExternalStore(persona.subscribe, persona.read)`.
- [ ] **Step 4: Run** — PASS. **Checkpoint:** `tsc` clean.

### Task 3: Audio choices and the Quick settings pills

**Files:**
- Modify: `src/menu/steam/quickSettings.ts` (types; `audioChoices`; `devices` on the returned object), `src/menu/steam/nativeCore.ts:119` (`bindings.audio.setOverride` / `clearOverride` when `SetDefaultDeviceOverride` / `ClearDefaultDeviceOverride` exist; rescan after each), `src/menu/components/QuickSettingsPanel.tsx` (a row of two pickers after the sliders' grid, inside the same `gg-menu-quick-sliders` focus grid so Down from each slider reaches its pill), `src/menu/components/MenuShell.tsx:146` (pass `quickSettings.devices`)
- Test: `tests/menu/quickSettings.test.ts`

**Interfaces:**
- Consumes: Task 1 `MenuPicker`, `PickerOption`.
- Produces:
  - `AudioDevice` gains `sName: string`; `AudioState` gains `overrideOutputDeviceId: number; overrideInputDeviceId: number`.
  - `QuickSettingsBindings.audio` gains `setOverride?(deviceId: number, type: number): Promise<unknown>` and `clearOverride?(type: number): Promise<unknown>`.
  - `type DeviceChoice = 'auto' | number`
  - `audioChoices(state: AudioState | null, type: 0 | 1): { text: string; selected: DeviceChoice; options: PickerOption<DeviceChoice>[] } | null` — null without state; options: Automatic first, then each device with output (type 1) or input (type 0) in `vecDevices` order, label `sName`. `selected` is the override id when that id is in the filtered list, else `'auto'`; `text` follows the Global Constraints.
  - `createQuickSettings(…)` returns `devices?: { output: DevicePicker; input: DevicePicker }` with `DevicePicker = { read(): ReturnType<typeof audioChoices>; pick(choice: DeviceChoice): Promise<void>; subscribe: QuickSettingsBindings['subscribe'] }`, present only when both override functions exist. `pick('auto')` → `clearOverride(type)`; `pick(id)` → `setOverride(id, type)` only when `id` is in the current filtered list, else no call.

- [ ] **Step 1: Failing tests** (`quickSettings.test.ts`):
  - `audioChoices` with the Ally's devices (`46 Radeon…` no output, `47 Ryzen HD Audio Controller` out+in), no override: output text `Automatic · Ryzen HD Audio Controller`, selected `'auto'`, options `['auto', 47]`.
  - with headphones `48 WH-1000XM4` (output) and `overrideOutputDeviceId: 48`: text `WH-1000XM4`, selected `48`, options `['auto', 47, 48]`; input options unaffected.
  - **override 48 but 48 no longer in `vecDevices`:** text `Automatic · Ryzen HD Audio Controller`, selected `'auto'` (Review Focus 1).
  - `devices.output.pick(48)` calls `setOverride(48, 1)`; `pick('auto')` calls `clearOverride(1)`; input uses type 0.
  - **`pick(48)` after 48 has left `vecDevices`** makes no call (Review Focus 5).
  - no `devices` when either override function is missing.
- [ ] **Step 2: Run** `npx vitest run tests/menu/quickSettings.test.ts` — FAIL.
- [ ] **Step 3: Implement** the types, `audioChoices`, `devices`, the `nativeCore.ts` override bindings (await the Steam call, then `scan()`), and the panel row: two `MenuPicker`s with ids `quick:output` / `quick:input`, `label` "Output" / "Input", full column width, read through `useSyncExternalStore(picker.subscribe, picker.read)` (memoise `read` by the state's fingerprint so the snapshot is stable).
- [ ] **Step 4: Run** `npx vitest run` — all PASS. **Checkpoint:** `tsc` clean.

### Task 4: On the Ally

- [ ] **Step 1:** Build, back up, install, reload (Global Constraints). Ask Michael before any screenshot.
- [ ] **Step 2:** With Michael driving: the status pill shows Invisible today; set Online and see it in Steam's own friends list, then back; Up from the friends list reaches the pill; B closes the list and focus returns. Quick settings: both pills read `Automatic · Ryzen HD Audio Controller`; with Bluetooth headphones connected, choose them, hear the switch, the Volume slider follows, then Automatic again; unplug while chosen and the pill falls back.
- [ ] **Step 3:** Report; fix in the owning task before Michael decides on a commit.
