# Console-like settings, Part 1: the Wi-Fi page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Game Glance menu, Quick settings' Wi-Fi switch becomes a row that steps into Game Glance's own Wi-Fi page (switch, connected network, other networks, join with a password); the skin over Steam's Settings is removed.

**Architecture:** One adapter (`src/menu/steam/wifi.ts`) maps Steam's own network store (`window.SystemNetworkStore`, the store Quick settings' Wi-Fi switch already reads in `nativeCore.ts`) to a plain snapshot and five commands. The page is a menu view pushed on the Quick settings stack (the pattern Navigate's Game Glance tile uses), drawn with the menu's own rows; a password is typed on the menu's keyboard. Nothing observes Steam's DOM. `src/nativeSettings/` is deleted.

**Tech Stack:** TypeScript, React (Decky, `@decky/ui`), vitest. No backend change.

**Spec:** `docs/superpowers/specs/2026-11-13-console-settings-design.md` (Part 1, Retiring the Settings skin, Constraints).

## Global Constraints

- **Steam's store, read on the Ally 2026-11-13** (`window.SystemNetworkStore`, a MobX store; names are un-minified class members):
  `isWifiEnabled`, `hasWirelessDevice`, `networkManagementAvailable`, `userVisibleAccessPoints`, `SetWifiEnabled(bool)`, `StartScanningForNetworks()`, `StopScanningForNetworks()`, `Connect({ deviceId, deviceWapId, credentials?: { username, password } }) → Promise<boolean>`. Each access point: `type` (1 wired, 2 wireless, 3 virtual), `state` (0 NotPresent, 1 Failed, 2 Disconnected, 3 Disconnecting, 4 Connecting, 5 Connected, 6 Retrying), `isConnected`, `showAsLocked`, `isSaved`, `isConnectable`, `isForgettable`, `deviceId`, `deviceWapId`, `key`, `Disconnect() → Promise<boolean>`, `Forget() → Promise<boolean>`, `wirelessAPInfo: { ssid, estrength (0 None … 4 Excellent), esecurity (bit flags: 0 None, 1 StaticWep, 2 DynamicWep, 4 Wpa, 8 WpaEnterprise, 16 Wpa2, 32 Wpa2Enterprise, 64 Wpa3, 32768 Unsupported), is_saved, is_active }`.
- **`wirelessAPInfo.password` holds a saved password in clear text.** The adapter never reads, copies, logs or returns it. A typed password lives only in the page's state until `connect` resolves, then is cleared; it is never logged, stored or put in a snapshot.
- Network names are personal: never logged (not in warnings either), never sent anywhere.
- Device probes are read-only. Real changes on the device (joining, forgetting, switching Wi-Fi off) happen only in Task 6, with Michael, on networks he names. Never call a Steam function this plan does not list.
- A missing store or method hides the feature (the row stays today's switch; a missing command hides its action). It never throws into the menu.
- Reuse the menu's components and focus rules (`Crumb`, `MenuAction`, `MenuKeyboard`, `data-gg-focus` keys, `installPageScroll`). No `MutationObserver` on Steam's pages.
- Only the Wi-Fi tile changes in Quick settings; Bluetooth stays the switch it is (spec Part 3).
- Commit only on Michael's word; identity `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"`; never push.
- Base: the working tree as it is (Quick settings headings removed, `tests/menu/quickSettingsPanel.test.ts`). Baseline: `npx vitest run` 3309 passed, `npx tsc --noEmit -p .` clean.

## Review Focus

1. **Steam's store or one of its members is missing or throws** (Steam update, Desktop mode, `networkManagementAvailable` false): Quick settings must still show the old Wi-Fi switch and the page must not open. → Task 1 (`available` false), Task 2 (falls back to the switch).
2. **The password leaks**: a snapshot, a log line, an error message or React state that outlives the attempt carries it. → Task 1 (snapshot has no password field, even when Steam's object has one), Task 4 (cleared on resolve, on B, on unmount).
3. **A join that fails or never resolves** (wrong password, out of range, Steam's promise hangs): the row must return to selectable with a reason, not stay "Connecting…" forever. → Task 1 (`connect` resolves false after 30 s), Task 3 (failed row state).
4. **The list changes under the cursor** while scanning (a network appears, vanishes, reorders): focus must stay on the same network, or move to the nearest row when it is gone, never to the tab bar. → Task 3 (stable keys, order rule, focus test).
5. **Leaving the page mid-scan or mid-join** (B, L1/R1, menu closed, plugin unload): scanning stops, no state update after unmount. → Task 3 (scan stops on every exit).

---

### Task 1: The Wi-Fi adapter

**Files:** Create `src/menu/steam/wifi.ts`; Test `tests/menu/wifi.test.ts`.

**Interfaces — Produces:**
```ts
export type WifiState = 'connected' | 'connecting' | 'failed' | 'idle';
export interface WifiNetwork { key: string; name: string; strength: 0|1|2|3|4; locked: boolean; saved: boolean; state: WifiState;
    /** One password cannot join it (enterprise or unsupported security): the page sends the player to Steam. */ needsSteam: boolean }
export interface WifiSnapshot { available: boolean; enabled: boolean; connected: WifiNetwork | null; others: WifiNetwork[] }
export interface WifiBindings {
    read(): WifiSnapshot; subscribe(listener: Stop): Stop;
    setEnabled(value: boolean): void; scan(on: boolean): void;
    connect(key: string, password?: string): Promise<boolean>; disconnect(key: string): Promise<boolean>; forget(key: string): Promise<boolean>;
}
export function createWifiBindings(store: unknown, timers?: { setInterval: typeof setInterval; clearInterval: typeof clearInterval; setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout }): WifiBindings;
export function wifiSummary(snapshot: WifiSnapshot): string; // the Quick settings row's state line
```

- [ ] **Step 1: Failing tests** (`tests/menu/wifi.test.ts`, a fake store object with the members above):
  - `read()` with no store, a store without `userVisibleAccessPoints`, `hasWirelessDevice` false, or `networkManagementAvailable` false → `{ available: false, enabled: false, connected: null, others: [] }`; a store whose getter throws → the same, no throw.
  - Maps only `type === 2` access points with a `wirelessAPInfo`; `name` = `ssid`; `strength` = `estrength` clamped to 0–4; `locked` = `showAsLocked`; `saved` = `isSaved`; `key` = the access point's `key`.
  - `state`: 5 → `connected`; 4 and 6 → `connecting`; 1 → `failed`; else `idle`. `connected` is the one with `state` 5; state 0 (NotPresent) is left out.
  - `needsSteam` is true when `esecurity` has bit 8, 32 or 32768 set, or bit 1 or 2; false for 0, 4, 16, 64 and their combinations.
  - `others` order: saved first, then by `strength` descending, then by `name` (`localeCompare`), then `key`; two access points with the same `name` keep only the strongest (saved wins a tie).
  - **No snapshot field named `password`, and `JSON.stringify(read())` does not contain the fake store's `wirelessAPInfo.password` value.**
  - `subscribe`: polls every 500 ms while there is a listener and calls listeners only when `JSON.stringify(read())` changed; the last unsubscribe clears the interval.
  - `setEnabled(v)` calls `SetWifiEnabled(v)`; `scan(true/false)` calls `Start…/StopScanningForNetworks()` once per change (a second `scan(true)` does nothing); a missing method is a no-op.
  - `connect(key)` calls `store.Connect({ deviceId, deviceWapId })`; `connect(key, 'pw')` adds `credentials: { username: '', password: 'pw' }`; an unknown key resolves `false` without calling Steam; a rejected or thrown `Connect` resolves `false`; a `Connect` that never settles resolves `false` after 30 000 ms (fake timers).
  - `disconnect(key)` / `forget(key)` call that access point's `Disconnect()` / `Forget()` and resolve their boolean; missing method → `false`.
  - `wifiSummary`: not available → `''`; disabled → `'Off'`; connected → its name; a network `connecting` → `'Connecting…'`; else `'Not connected'`.
- [ ] **Step 2:** `npx vitest run tests/menu/wifi.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** `wifi.ts`. Every read of the store goes through one `try`; `wirelessAPInfo` is read field by field (`ssid`, `estrength`, `esecurity` only).
- [ ] **Step 4:** Same command → PASS.

### Task 2: The Wi-Fi row in Quick settings and the view

**Files:** Modify `src/menu/views.ts`, `src/menu/steam/nativeCore.ts`, `src/menu/steam/runtime.ts` (where `quickSettings` is assembled for `MenuShell`), `src/menu/components/QuickSettingsPanel.tsx`, `src/menu/components/MenuShell.tsx`, `src/menu/styles.ts`; Test `tests/menu/views.test.ts`, `tests/menu/quickSettingsPanel.test.ts`, `tests/menu/styles.test.ts`.

**Interfaces — Consumes:** `createWifiBindings`, `wifiSummary`, `WifiBindings`. **Produces:** `export const WIFI_VIEW = 'quick:wifi-page'` and `export const WIFI_ROW = 'quick:wifi'` in `views.ts`; `returnFocusKey(WIFI_VIEW) === WIFI_ROW`; `QuickSettingsPanel` props gain `wifi?: WifiBindings` and `openWifi?(): void`; the menu's quick-settings object gains `wifi?: WifiBindings` (built in `nativeCore.ts` from the same `root.SystemNetworkStore` the `wifi` toggle uses).

- [ ] **Step 1: Failing tests:**
  - `views.test.ts`: `returnFocusKey(WIFI_VIEW)` is `WIFI_ROW`.
  - `quickSettingsPanel.test.ts`: with `wifi` whose snapshot is available and `openWifi` given, the toggle grid's first child is a `MenuAction` with `id` `WIFI_ROW`, class `gg-menu-setting gg-menu-setting-step`, whose text is `Wi-Fi` and `wifiSummary(snapshot)`, and whose `onAction` is `openWifi`; no `Control` with id `wifi` is drawn; the other five keep their order.
  - Same file: `wifi` missing, or its snapshot `available: false` → the grid is exactly today's six toggles (the existing test, unchanged).
  - `styles.test.ts`: `.gg-menu-setting-step` exists, is a flex row with the label block and a trailing chevron, and has the toggle tiles' min-height (so the grid's rows stay 56 px).
- [ ] **Step 2:** `npx vitest run tests/menu/views.test.ts tests/menu/quickSettingsPanel.test.ts tests/menu/styles.test.ts` → FAIL.
- [ ] **Step 3: Implement.** The row: icon `LuWifi`, label `Wi-Fi`, summary under it in the dim label style, `LuChevronRight` at the end, `data-gg-focus={WIFI_ROW}` (the same key the toggle had, so remembered focus still lands). `MenuShell`: `openWifi={() => dispatch({ type: 'push', viewId: WIFI_VIEW })}`; when Quick settings' stack top is `WIFI_VIEW`, content is `<WifiPage/>` (Task 3; until then a placeholder element with the crumb).
- [ ] **Step 4:** Same command → PASS; `npx vitest run tests/menu` all pass.

### Task 3: The Wi-Fi page

**Files:** Create `src/menu/components/WifiPage.tsx`, `src/menu/wifiPage.ts` (pure row model); Modify `src/menu/components/MenuShell.tsx`, `src/menu/styles.ts`, `src/menu/socialScroll.ts` (the page's focusables for `installPageScroll`, as `QUICK_FOCUSABLES`); Test `tests/menu/wifiPage.test.ts`, `tests/menu/wifiPageView.test.ts`.

**Interfaces — Consumes:** `WifiBindings`, `WifiSnapshot`, `Crumb`, `MenuAction`, `ToggleField` wrapper as in `QuickSettingsPanel`'s `Control`. **Produces:**
```ts
// wifiPage.ts
export type WifiRow =
  | { kind: 'switch'; on: boolean }
  | { kind: 'note'; text: string }                       // Wi-Fi off / nothing found yet
  | { kind: 'heading'; text: 'Connected' | 'Other networks' }
  | { kind: 'network'; network: WifiNetwork; status: string; actions: WifiAction[] };
export type WifiAction = 'join' | 'password' | 'disconnect' | 'forget' | 'steam';
export function wifiRows(snapshot: WifiSnapshot, failed: ReadonlyMap<string, string>): WifiRow[];
export function nextFocusKey(before: string[], after: string[], focused: string): string | null;
// WifiPage.tsx
export function WifiPage(props: { wifi: WifiBindings; openSteamInternet(): void; askPassword(network: WifiNetwork): Promise<string | null> }): JSX.Element;
```

- [ ] **Step 1: Failing tests** (`wifiPage.test.ts`):
  - Off → `[switch(off), note('Turn on Wi-Fi to see networks.')]`.
  - On, nothing → `[switch(on), note('Looking for networks…')]`.
  - Connected network → `heading Connected`, then its row with status `Connected` and actions `['disconnect', 'forget']` (`forget` only when `saved`).
  - Others → `heading Other networks`, rows in the snapshot's order. Actions: `needsSteam` → `['steam']` and status `Set up in Steam settings`; saved or not locked → `['join']`; locked and not saved → `['password']`; `state: 'connecting'` → no actions, status `Connecting…`; a key in `failed` → status is that reason, actions as when idle.
  - `nextFocusKey`: focused key still present → itself; gone → the key that now sits at its old index, else the last, else `null`.
- [ ] **Step 2:** `npx vitest run tests/menu/wifiPage.test.ts` → FAIL.
- [ ] **Step 3: Implement** `wifiPage.ts`; same command → PASS.
- [ ] **Step 4: Failing tests** (`wifiPageView.test.ts`, element-tree style as `quickSettingsPanel.test.ts`, with `react`'s hooks exercised through the project's existing renderer helper if one is used in `tests/menu`, else by calling the pure parts):
  - The tree starts with `Crumb` (`parent: 'Quick settings'`, `title: 'Wi-Fi'`), then one focus group whose children are the rows; each network row has `data-gg-focus` `wifi:<key>`; a `needsSteam` row carries class `gg-menu-row-dim`.
  - Mount calls `wifi.scan(true)`; unmount calls `wifi.scan(false)` and unsubscribes; switching Wi-Fi off also calls `scan(false)`.
  - A on a `join` row calls `wifi.connect(key)`; on a `password` row calls `askPassword(network)` then `wifi.connect(key, answer)`, and does nothing when the answer is `null`; a `false` result puts `Couldn't connect. Check the password.` (password case) or `Couldn't connect.` in `failed` for that key; a later `connected` or a new attempt clears it.
  - A on the connected row shows its actions in the row (`Disconnect`, `Forget`); B closes them first, then leaves the page.
  - A on a `steam` row calls `openSteamInternet()`.
  - After a join resolves on an unmounted page, no state is set (no React warning; assert via the test's console spy).
- [ ] **Step 5:** `npx vitest run tests/menu/wifiPageView.test.ts` → FAIL.
- [ ] **Step 6: Implement** `WifiPage.tsx` and wire it in `MenuShell` (`openSteamInternet` = the existing native hand-off with Steam's `/settings/internet` route, added to `steam/routes.ts` next to the `settings` destination; `askPassword` from Task 4, until then `async () => null`). Row look: the `.r` rows of mock-up `2-wifi.png` (signal bars = 4 bars lit by `strength`, lock icon when `locked`, check mark on the connected row), tokens from `styles.ts`.
- [ ] **Step 7:** Same command → PASS; `npx vitest run tests/menu` all pass.

### Task 4: Typing a password

**Files:** Create `src/menu/components/WifiPassword.tsx`; Modify `src/menu/components/MenuShell.tsx`, `src/menu/keyboard/context.ts` (a `WIFI` keyboard context: completion label `Join`, focus returns to the network's row), `src/menu/styles.ts`; Test `tests/menu/wifiPassword.test.ts`, `tests/menu/keyboard/` (context test beside the existing ones).

**Interfaces — Consumes:** `MenuKeyboard`, `createKeyboardSession`, `KeyboardContext`, `WifiNetwork`. **Produces:** `WifiPassword({ network, session, layouts, onDone(password: string | null) })` and, in `MenuShell`, `askPassword(network): Promise<string | null>` passed to `WifiPage`.

- [ ] **Step 1: Failing tests:**
  - The view shows the network's name, a field that renders the draft as `•` per character, and a `Show` / `Hide` control that toggles the real text; hidden is the default each time it opens.
  - `Join` (the keyboard's completion) calls `onDone(draft)` only when the draft has at least 8 characters for security bits 4/16/64 (WPA family), at least 1 otherwise; below that the completion is disabled.
  - B (keyboard closed) calls `onDone(null)`.
  - After `onDone`, and on unmount, the component's draft state is `''` (assert through a ref the test reads, or the rendered field).
  - The `WIFI` keyboard context: `completionLabel` `'Join'`; `restoreFocus` focuses `[data-gg-focus="wifi:<key>"]`.
  - The draft never appears in `console` output during the flow (spy on `console.log/warn/error`).
- [ ] **Step 2:** `npx vitest run tests/menu/wifiPassword.test.ts tests/menu/keyboard` → FAIL.
- [ ] **Step 3: Implement.** The password view is pushed on the Quick settings stack above `WIFI_VIEW` (`'quick:wifi-password'`, returning focus to the network's row); the keyboard opens with it, in the player's chosen keyboard mode (compact or radial), as Social does.
- [ ] **Step 4:** Same command → PASS; `npx vitest run` all pass; `npx tsc --noEmit -p .` clean.

### Task 5: Retire the Settings skin

**Files:** Delete `src/nativeSettings/` (14 files), `tests/nativeSettings/`, `scripts/native-settings-preview.mjs`, `scripts/check-native-settings-preview.mjs`, `scripts/check-native-settings-motion.mjs`; Modify `src/index.tsx` (the import, `NATIVE_SETTINGS_COMPONENT`, `addGlobalComponent`, the `'native Settings remove'` cleanup step), `src/menu/components/GameGlancePages.tsx`, `src/menu/components/MenuPreferences.tsx`, any test that mocks `NativeSettingsHost` (`tests/menu/pluginLifecycle.test.ts`); Test `tests/menu/gameGlancePages.test.ts`, `tests/menu/preferences.test.ts`.

- [ ] **Step 1: Failing tests:** the option's label is `Restyle Steam's menus` and its description `Apply the Game Glance theme to Steam's context menus. Requires the Game Glance menu.` in both places it is drawn; `preferences.test.ts` still reads and writes the stored key `restyleSteamSettings` (kept, so a pre-release value carries over; add a comment saying it now governs the context menus only).
- [ ] **Step 2:** `npx vitest run tests/menu/gameGlancePages.test.ts tests/menu/preferences.test.ts` → FAIL (old label).
- [ ] **Step 3:** Delete and unwire as listed; change the two labels. `grep -rn "nativeSettings\|NativeSettings\|native-settings" src tests scripts` → no match. Anything `src/nativeSettings/` exported that another module still imports stays, moved next to its remaining user; list each in the ledger.
- [ ] **Step 4:** `npx vitest run` all pass; `npx tsc --noEmit -p .` clean; `npm run build` exit 0.

### Task 6: On the Ally and the Steam Deck, with Michael

- [ ] **Step 1:** Backup the installed `dist/index.js`, install the build, reload the plugin.
- [ ] **Step 2: Read-only:** Quick settings shows the Wi-Fi row with the current network's name; A opens the page; the connected network and a growing list of others appear; B returns to the Wi-Fi row; L1/R1 leave the page; over a game the same. Steam's Settings opens in Steam's own look. Record frame time or a screen recording only if Michael asks.
- [ ] **Step 3: Writes, each only on Michael's word and on networks he names:** join a saved network; join a new one with its password; a wrong password (row shows the reason, stays selectable); Forget; Wi-Fi off and on from the page; a `needsSteam` network if one is in range (opens Steam's Internet page).
- [ ] **Step 4:** Moving focus on the page and in Quick settings feels as fast as the rest of the menu (Michael's judgement; this was the complaint that started the work).
- [ ] **Step 5:** The same checks on the Steam Deck (docked and handheld on one of the two). Where the Deck's store differs, the row falls back to the switch; record what differs.
- [ ] **Step 6:** Ledger the results in the spec's Part 1 as "Device results"; commit only on Michael's word.
