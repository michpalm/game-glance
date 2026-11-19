# Settings Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Steam's bare `/settings` page with Game Glance's Settings home (S2c list + S2b panel). The page shows
how things are set and jumps to Steam's exact settings page.

**Architecture:**
- A `/settings` route patch wraps Steam's element in `SettingsGate`, as `src/patches/libraryPage.tsx` does. Ours shows
  only on the bare path.
- Pure modules hold the list and its movement, the glance per entry and the value formats. Readers take a snapshot of
  Steam's stores. A small backend change lists paired Bluetooth devices.
- One view draws the list and the panel on the page kit.

**Tech Stack:** TypeScript, React, `@decky/ui` (Focusable, DialogButton, Navigation), `react-icons/lu`, vitest; Python
(Decky backend), pytest.

**Spec:** `docs/superpowers/specs/2026-11-19-settings-home-design.md`

## Global Constraints

- Units are 1920-wide mock-up pixels (`unit()`), on the page kit (`PageFrame`, `pkButton`), with styles scoped
  `.gg-settings`.
- **Ours only on the exact path `/settings`** (a trailing slash is allowed). Any `/settings/<page>` is Steam's element.
- **Reads only.** No Steam call that changes anything. Calls allowed: `SystemDisplayManagerStore.GetState()` and
  `SteamClient.System.Audio.GetDevices()` (sources read); everything else is plain field reads.
- **Unreadable values:** an absent or unreadable value is left out, never guessed. The panel always keeps its
  description and "More in Steam's settings".
- **Copy is fixed:**
  - group names "Device", "Games", "People", "You", "System";
  - the button "More in Steam's settings";
  - the menu line prefix "Already in the menu: ";
  - "On" / "Off" / "Never".
- **Focus look:** a focused list entry and More are light (`rgba(255,255,255,.92)`) with text `#10141a`; no button
  badges on rows.
- **Commits:** only when Michael says. Identity `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"`,
  trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Device reloads:** only with no Game Glance page or menu open (`.gg-gm`, `.gg-storage`, `.gg-ach`, `.gg-dl`,
  `.gg-library`, `.gg-media`, `.gg-settings`; `.gg-menu` in MainMenu_uid2), with a 40 s kill. A backend change
  needs a Decky restart.

## Review Focus

1. **Steam changed a store:** `settingsStore`, `App.m_CurrentUser` or `friendStore` is missing, or a field has another
   type. Every panel still draws its heading, description and More, and nothing throws (Task 2's
   `glanceFor({}, …)` test).
2. **Display or sound read fails or never settles:** `GetState()` rejects, or `GetDevices()` hangs. Those rows stay
   out, the page stays usable, and a 3 s limit applies (Task 3 test).
3. **No controller connected:** Controllers' More opens Steam's page without a broken route (Task 1 `steamRoute`
   test).
4. **B on Steam's page returns to ours:** it lands on the same entry and the same group, even though Steam replaced
   its history entries while you moved between its pages (Task 5 memory test plus the PS5 check).
5. **busctl missing or BlueZ off:** the paired list is empty, and the Bluetooth panel says nothing about devices
   rather than "none" (Task 4 test).

## File Structure

- `src/settings/settingsModel.ts`: groups, entries, movement, closed-group preview, Steam route per entry.
- `src/settings/settingsGlance.ts`: the snapshot type, the glance per entry, value formats.
- `src/settings/steamSettings.ts`: reads the snapshot from Steam (sync fields plus async display, audio and Bluetooth).
- `py_modules/gameglance/bluetooth.py` and `main.py`: paired devices.
- `src/settings/settingsStyles.ts`, `src/settings/SettingsPage.tsx`: view, live page, gate.
- `src/settings/settingsState.ts`: memory and gate decision.
- `src/patches/settingsPage.tsx`; modify `src/data/settings.ts`, `src/menu/components/GameGlancePages.tsx`,
  `src/components/SettingsPanel.tsx` and `src/index.tsx`.

---

### Task 1: List model

**Files:** create `src/settings/settingsModel.ts`; test `tests/settings/settingsModel.test.ts`.

**Interfaces — Produces:**
```ts
export type EntryKey = 'display'|'sound'|'bluetooth'|'controllers'|'keyboard'|'power'|'ingame'|'recording'|'compat'|'downloads'|'cloud'|'remoteplay'|'friends'|'family'|'notifications'|'account'|'customization'|'accessibility'|'system'|'interface'|'security';
export interface Entry { key: EntryKey; name: string; group: string }
export const GROUPS: { name: string; entries: Entry[] }[];
export function entriesOf(group: string): Entry[];
export function moveFocus(key: EntryKey, dir: 'up'|'down'): EntryKey;   // crosses groups; stops at both ends
export function jumpGroup(key: EntryKey, step: -1|1): EntryKey;         // first entry of prev/next group; wraps
export function closedPreview(group: string): string;                   // names joined by " · "
export function steamRoute(key: EntryKey, firstController: { type: number; index: number } | null): string;
```

- Entry names and their order are as in spec §2.
- **Routes:**
  - `display` → `/settings/display`; `sound` → `/settings/audio`; `recording` → `/settings/gamerecording`;
    `compat` → `/settings/compatibility`; `remoteplay` → `/settings/remoteplay`; `power` → `/settings/power`.
  - Every other entry → `/settings/<key>`.
  - `controllers` → `/settings/controller/<type>/<index>` when a controller is given, else `/settings/controller`.

- [ ] **Step 1: Write the failing tests.**
  - `GROUPS.map(g=>g.name)` equals `['Device','Games','People','You','System']`, and there are 21 entries in all.
  - `moveFocus('power','down')` → `'ingame'`; `moveFocus('ingame','up')` → `'power'`; `moveFocus('display','up')` →
    `'display'`; `moveFocus('security','down')` → `'security'`.
  - `jumpGroup('bluetooth',1)` → `'ingame'`; `jumpGroup('display',-1)` → `'system'`; `jumpGroup('security',1)` →
    `'display'`.
  - `closedPreview('People')` → `'Friends and chat · Family · Notifications'`.
  - `steamRoute('sound',null)` → `'/settings/audio'`; `steamRoute('controllers',{type:30,index:0})` →
    `'/settings/controller/30/0'`; `steamRoute('controllers',null)` → `'/settings/controller'` (Review Focus 3).
- [ ] **Step 2:** Run `npx vitest run tests/settings/settingsModel.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run again. Expected: PASS.

### Task 2: Glance per entry and formats

**Files:** create `src/settings/settingsGlance.ts`; test `tests/settings/settingsGlance.test.ts`.

**Interfaces.** Consumes `EntryKey` and `GROUPS`. Produces:
```ts
export interface SettingsSnapshot {          // every field optional: absent = unreadable
  client?: Record<string, unknown>;          // settingsStore.m_ClientSettings
  settings?: Record<string, unknown>;        // settingsStore.m_Settings
  friendSettings?: Record<string, unknown>;  // settingsStore.m_FriendSettings
  timeZone?: string;
  user?: { accountName?: string; balance?: string; familyName?: string; familyMembers?: number; notifications?: Record<string, number> };
  friends?: { online: number; total: number };
  language?: string;
  display?: { description: string; width: number; height: number; refresh: number; hdr: boolean; vrr: boolean } | null;
  audio?: { output?: string; outputVolume?: number; input?: string } | null;
  bluetooth?: { name: string; connected: boolean; kind: 'gamepad'|'audio'|'other'; percent?: number }[] | null;
  controllers?: { name: string; wireless: boolean; percent?: number }[];
}
export interface GlanceRow { label: string; value: string }
export interface GlanceItem { name: string; state: string; ok: boolean }
export interface Glance { title: string; description: string; rows: GlanceRow[]; items: GlanceItem[]; inMenu: string | null }
export function glanceFor(snap: SettingsSnapshot, key: EntryKey): Glance;
export function onOff(v: unknown): string | null;     // true→'On', false→'Off', else null
export function minutes(sec: unknown): string | null;  // 0→'Never', 900→'15 min', 3600→'1 h', 5400→'1 h 30 min'
```

- **Rows per entry**, from spec §3's table. Each row exists only when its value is readable. The fields are:
  - **Display:** `display.description`, then "Resolution" `1920 × 1080`, "Refresh rate" `60 Hz`, "HDR", then "Scale":
    `Auto · 128%` from `settings.bDisplayIsUsingAutoScale` and `flCurrentDisplayScaleFactor`.
  - **Power:** "Sleep on battery" from `system_idle_suspend_battery_sec`, "Sleep plugged in" from
    `system_idle_suspend_ac_sec`, "Screen saver plugged in" from `system_idle_screensaver_ac_sec`.
  - **In-game:** "Overlay" from `enable_overlay`, "Performance overlay" from `overlay_fps_counter_detail_level`
    (0 Off, 1 Frame rate, 2 Simple, 3 Detailed, 4 Full; the builder confirms the labels in sp.js), and "Screenshot
    notification".
  - **Recording:** "Mode" from `gamerecording_background_mode` (0 Off, 1 Background, 2 Manual; confirmed in sp.js),
    "Keep" from `gamerecording_background_max_keep` as given, "Max frame rate" `60 fps`.
  - **Compatibility:**
    - "Steam Play" from `bCompatEnabledForOtherTitles`;
    - "Default tool" from `strCompatTool`, shown as given ("proton_11" → `Proton 11` by replacing `_` with a space
      and capitalising);
    - "Shader pre-caching".
  - **Downloads:** "Region" = the `strRegionName` whose `nRegionID` equals `download_region`, "Download while playing",
    "Limit while streaming".
  - **Cloud:** "Steam Cloud".
  - **Friends:** "Friends online" `1 of 8`, "Do Not Disturb", "Sign into friends".
  - **Family:** "Family" name, "Members" count.
  - **Notifications:** "All toasts" (`disable_all_toasts`, inverted), "In game" (`disable_toasts_in_game`,
    inverted), "New items" = `inventory_items` when > 0.
  - **Account:** "Account" name, "Wallet" balance when non-empty.
  - **Customization:** "Startup movie" (`'0'` → `Default`, else "Custom"), "Store content on Home".
  - **Accessibility:** "High contrast", "Reduce motion", "Screen reader", "Mono audio".
  - **System:** "Client" from `strCurrentBetaName`, "Time zone".
  - **Interface:** "Language", "24-hour clock".
  - **Keyboard, Remote Play, Security:** the description only.
- **Items:**
  - Bluetooth: devices with state `Connected · 12%` / `Connected` / `Not connected`, and `ok` = connected.
  - Controllers: `Wireless · 64%` / `Wired`.
- **`inMenu`** per spec §3's column, prefixed with "Already in the menu: ".
- **Descriptions:**
  - Display "Your screen and how Steam draws on it"
  - Sound "Where sound goes and comes from"
  - Bluetooth "Paired devices"
  - Controllers "Connected controllers"
  - Keyboard "Layout and keyboard options"
  - Power "Sleep and the screen saver"
  - In-game "The overlay while a game runs"
  - Game recording "Recording while you play"
  - Compatibility "Steam Play and Proton"
  - Downloads "Where and when games download"
  - Cloud "Saves in Steam Cloud"
  - Remote Play "Play on and from other devices"
  - Friends and chat "Friends and how they reach you"
  - Family "Your Steam family"
  - Notifications "What pops up, and when"
  - Account "Your Steam account"
  - Customization "Startup movie and Home"
  - Accessibility "Contrast, motion and reading"
  - System "Updates, client and time"
  - Interface "Language and clock"
  - Security "Lock screen and sign-in"

- [ ] **Step 1: Write the failing tests** with the PS5 snapshot from the spec's Constraints:
  - Display rows equal `[['Display','LG Electronics LG TV SSCR2'],['Resolution','1920 × 1080'],['Refresh rate','60 Hz'],['HDR','On'],['Scale','Auto · 128%']]`.
  - Power: `minutes(900)`→`'15 min'`, `minutes(3600)`→`'1 h'`, `minutes(0)`→`'Never'`, `minutes(5400)`→`'1 h 30 min'`, `minutes('x')`→`null`.
  - Downloads region: `download_region:66` with a region list containing `{nRegionID:66,strRegionName:'Europe - France'}` gives `'Europe - France'`; an unknown id leaves the row out.
  - Compatibility "Default tool" `'proton_11'` → `'Proton 11'`.
  - Friends "Friends online" `'1 of 8'`.
  - Bluetooth items for `[{name:'DualSense Wireless Controller',connected:true,kind:'gamepad',percent:12},{name:'Headphones',connected:false,kind:'audio'}]` give `['Connected · 12%', 'Not connected']`.
  - `glanceFor({}, key)` for every key: has a title and description, `rows` is `[]`, and it doesn't throw (Review Focus 1).
  - A field with the wrong type (`cloud_enabled:'yes'`) leaves the row out.
  - Account with an empty `balance` has no Wallet row.
- [ ] **Step 2:** Run `npx vitest run tests/settings/settingsGlance.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run again. Expected: PASS.

### Task 3: Steam readers

**Files:** create `src/settings/steamSettings.ts`; test `tests/settings/steamSettings.test.ts`.

**Interfaces.** Consumes `SettingsSnapshot`. Produces:
```ts
export interface SettingsReaders {
  readNow(): SettingsSnapshot;                      // sync fields; never throws
  readLive(): Promise<Pick<SettingsSnapshot, 'display'|'audio'|'bluetooth'|'controllers'>>; // each part null on failure or after 3000 ms
}
export function createSettingsReaders(globals: Record<string, unknown>, backend: { pairedDevices(): Promise<unknown> }, timeoutMs?: number): SettingsReaders;
export function sharedSettingsReaders(): SettingsReaders;
```

- **`readNow`** reads:
  - `settingsStore.m_ClientSettings`, `.m_Settings`, `.m_FriendSettings`;
  - `settingsStore.m_strTimeZoneID.m_currentValue`;
  - `App.m_CurrentUser`: `strAccountName`, `strAccountBalance`, `strFamilyGroupName`, `rgFamilyGroupMembers.length`,
    `NotificationCounts`;
  - `friendStore.allFriends`: online = `m_persona.m_ePersonaState > 0`, read as `persona` or `m_persona`;
  - the language from Game Glance's existing `getSteamLanguage()` cache, when resolved;
  - `ControllerStore.m_controllerList` (`strName`, `bWireless`, `eControllerType`, `nControllerIndex`).
- **`readLive`** reads:
  - display from `SystemDisplayManagerStore.GetState()`: the primary enabled display, its current mode,
    `is_hdr_output_active`, `is_vrr_output_active`;
  - audio from `SteamClient.System.Audio.GetDevices()`: the active output's and input's `sName`, and the output's
    `flOutputVolume` × 100;
  - bluetooth from `backend.pairedDevices()` (Task 4);
  - controller batteries from the existing status store's controller list, matched by name.
- Each live part has its own 3000 ms limit.

- [ ] **Step 1: Write the failing tests** with fake globals:
  - The PS5 values map into the snapshot: `friends` `{online:1,total:8}` and `user.familyMembers` 3.
  - `readNow()` with `{}` → `{}` and no throw.
  - A getter that throws on `settingsStore` → that part is absent.
  - `GetState` rejects → `display: null`; `GetDevices` never resolves → `audio: null` after the limit (fake timers,
    Review Focus 2).
- [ ] **Step 2:** Run `npx vitest run tests/settings/steamSettings.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run again. Expected: PASS.

### Task 4: Backend — paired Bluetooth devices

**Files:** modify `py_modules/gameglance/bluetooth.py` and `main.py`; test `tests/py/test_bluetooth.py`.

**Interfaces — Produces:**
- `parse_paired(managed) -> list[dict]` returns `[{"name", "connected", "kind", "percent"?}]` for every
  `org.bluez.Device1` with `Paired` true.
  - `kind` comes from `Icon`: `input-gaming*` → `"gamepad"`, `audio-*` → `"audio"`, else `"other"`.
  - The order is connected first, then by name.
- `read_paired(run=..., environ=None, log=None) -> list` uses the same `COMMAND` and failure handling as
  `read_controllers`.
- `Plugin.get_bluetooth_devices(self) -> list` runs in `asyncio.to_thread` and returns `[]` on any exception.
- The frontend calls it via `callable<[], unknown>('get_bluetooth_devices')`.

- [ ] **Step 1: Write the failing tests:**
  - A sample with a connected DualSense (battery 12) and a paired, disconnected headset gives two entries in that
    order, with the right kinds.
  - An unpaired device is left out.
  - busctl exits non-zero → `[]` (Review Focus 5).
- [ ] **Step 2:** Run `python3 -m pytest tests/py/test_bluetooth.py -q`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run again. Expected: PASS.

### Task 5: View, styles, memory and gate

**Files:**
- create `src/settings/settingsStyles.ts`, `src/settings/settingsState.ts` and `src/settings/SettingsPage.tsx`;
- test `tests/settings/settingsPageView.test.ts`, `tests/settings/settingsStyles.test.ts` and
  `tests/settings/settingsState.test.ts`.

**Interfaces.** Consumes Tasks 1–3. Produces:
```ts
// settingsState.ts
export const settingsMemory: { get(): { focus: EntryKey }; remember(p: { focus: EntryKey }): void };
export function settingsGateChoice(input: { enabled: boolean; path: string | null }, previous?: 'ours'|'native'): 'ours'|'native'; // ours only for /settings or /settings/
// SettingsPage.tsx
export interface SettingsViewProps { focus: EntryKey; glance: Glance; onFocus(k: EntryKey): void; onMove(k: EntryKey): void; onOpen(k: EntryKey): void; onBack(): void }
export function SettingsPageView(p: SettingsViewProps): JSX.Element;
export function SettingsPage(): JSX.Element;               // live: readNow on mount, readLive after, re-read on focus return
export function SettingsGate({ native }: { native: ReactNode }): ReactNode;
```

- **The list:**
  - The open group renders its heading and entry buttons, with class `gg-settings-entry` and
    `data-gg-focus="settings:<key>"`.
  - Closed groups render a heading and a `gg-settings-preview` line, and are not focusable.
  - The list is one `Focusable` column. `onButtonDown` on the root handles 5/6 (L1/R1) through `jumpGroup`; on the
    first or last entry of an open group, 9/10 (Up/Down) go through `moveFocus`.
  - Entry icons from `react-icons/lu`: LuMonitor, LuVolume2, LuBluetooth, LuGamepad2, LuKeyboard, LuPower,
    LuGamepad, LuMonitorPlay, LuLayers, LuDownload, LuCloud, LuTv, LuMessageCircle, LuUsers, LuBell, LuUser,
    LuPalette, LuPersonStanding, LuInfo, LuSettings, LuLock. The builder swaps any icon missing from the installed
    version.
- **The panel:**
  - a title, the description, rows as label/value pairs, items as glass rows (green state when `ok`), the `inMenu`
    line, and More (`gg-settings-more`, `data-gg-focus="settings:more"`);
  - A on an entry → `onOpen(key)`; Right from an entry → focus More; A on More → `onOpen(focus)`.
- **The live page:**
  - `onOpen` calls `settingsMemory.remember({focus})`, then `Navigation.Navigate(steamRoute(key, firstController))`.
  - `onBack` from the list calls `Navigation.NavigateBack()`.
  - The open group slides with the kit's `--gg-base` timing.
- **The gate:**
  - the `settingsPage` setting (Task 6) and the route;
  - the previous choice holds outside `/settings` (no flash);
  - an error boundary falls back to Steam's element.
- **Styles:** the list at (96, 146), width 514; the panel at (650, 146) to (1824, 960); focus as Global Constraints.

- [ ] **Step 1: Write the failing tests:**
  - **View:**
    - with focus `bluetooth`, only Device's entries are focusable;
    - the other four previews read as `closedPreview`;
    - A on `settings:bluetooth` calls `onOpen('bluetooth')`;
    - root `onButtonDown` button 6 calls `onMove('ingame')`;
    - with focus `power`, button 10 calls `onMove('ingame')`;
    - with focus `display`, button 9 does nothing;
    - the panel shows "More in Steam's settings" and the `inMenu` line.
  - **State:**
    - `settingsGateChoice({enabled:true,path:'/settings'})`→`'ours'`; `'/settings/'`→`'ours'`;
      `'/settings/display'`→`'native'`;
    - `enabled:false`→`'native'`; `path:'/library/home'` with previous `'ours'`→`'ours'`;
    - `remember` survives a remount (Review Focus 4).
  - **Styles:** every selector starts with `.gg-settings`, and the focused entry and More are light with `#10141a`.
- [ ] **Step 2:** Run `npx vitest run tests/settings`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npx vitest run tests/settings && npx tsc --noEmit`. Expected: PASS.

### Task 6: Setting, route patch and wiring

**Files:**
- create `src/patches/settingsPage.tsx`;
- modify `src/data/settings.ts`: `settingsPage: boolean`, default `true`, and `setSettingsPage`;
- modify `src/menu/components/GameGlancePages.tsx`: ToggleRow `gg:general:settingsPage`, "Settings page" — "Game
  Glance's Settings in place of Steam's. Steam's pages stay one button away." after `gg:general:mediaPage`;
- modify `src/components/SettingsPanel.tsx`: the same toggle in the "Pages" section;
- modify `src/index.tsx`;
- test `tests/patches/settingsPage.test.ts`, `tests/data/settings.test.ts`, `tests/menu/gameGlancePages.test.ts` and
  `tests/menu/pluginLifecycle.test.ts`.

**Interfaces — Produces:** `SETTINGS_ROUTE = '/settings'` and `patchSettingsPage(): () => void`, as `patchMediaPage`.

- [ ] **Step 1: Write the failing tests:**
  - copy `tests/patches/mediaPage.test.ts`'s cases for `/settings` and `SettingsGate`;
  - the settings defaults gain `settingsPage: true`, plus the persist test;
  - the General page's ids gain `gg:general:settingsPage` after `gg:general:mediaPage`;
  - the lifecycle test mocks `../../src/patches/settingsPage`.
- [ ] **Step 2:** Run those tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build && python3 -m pytest tests/py -q`. Expected: all
  pass, and `dist/index.js` is written.

### Task 7: Device check on the PS5

- [ ] **Step 1: Deploy.**
  - Copy `dist/index.js`, `py_modules/gameglance/bluetooth.py` and `main.py`.
  - A Decky restart is needed for the backend: ask Michael to restart from Decky's settings, or reboot. Never enter
    sudo.
- [ ] **Step 2: Read-only checks**, while Michael has Steam's Settings open (switch off, or More):
  - which entries Steam's own list shows (DOM text of its list);
  - Steam's route for Controllers;
  - the labels for the overlay level and recording mode.
  - Fix any mismatch test-first.
- [ ] **Step 3: Michael checks:**
  - open Settings from Steam's menu;
  - D-pad through the groups, and L1/R1;
  - compare each panel with Steam's page via More, then B back to the same entry;
  - the switch off shows Steam's.
- [ ] **Step 4:** Make fixes test-first, write the summary, and commit on Michael's word.
