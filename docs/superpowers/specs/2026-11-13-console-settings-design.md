# Console-like settings — design

Date: 2026-11-13. Status: draft for Michael's review. Nothing built.
Mock-ups (real Ally frames, outside the repo): `~/Documents/Claude/Bazzite/settings-mockups/round-2/`
(`1-quick-settings`, `2-wifi`, `3-bluetooth`, `4-navigate`, `5-storage`). Michael picked variant 1 for Quick settings.

## Intent

Steam's Settings is 25 categories in one list, ordered by what the software is made of. On a handheld with a controller
that is overwhelming, and Michael uses almost none of it. The 4.0 pre-release dresses those pages in the Game Glance look
(`src/nativeSettings/`); it feels slow when moving between rows, and it still reads as a skin on Steam.

Game Glance is built as a console-like experience: it shows the few things that matter and leaves the rest to Steam.
Settings should work the same way. **The handful of things a player really does get Game Glance's own, fast screens, in
the place the player expects them. Everything else stays in Steam's Settings, untouched.**

What Michael does in Settings (his own account, 2026-11-13):

| How often | What | Where it is handled |
|---|---|---|
| Most | Switch sound output / input (headset) | Quick settings (built) |
| Fairly often | Manage installed games: mostly uninstall, sometimes move between drives | **Storage (new)** |
| Now and then | Join a new Wi-Fi network when moving around | **Wi-Fi page (new)** |
| Now and then | Pair a keyboard or more controllers | **Bluetooth page (new)** |
| Now and then | HDR, resolution | Performance (HDR built; **resolution to add**) |
| Almost never | The other ~20 categories | Steam's Settings |

## Goals

- Each of the tasks above is done in Game Glance's own UI, drawn from Steam's values, as Quick settings and Performance
  are today.
- **One home per setting.** A setting lives where a player expects it and nowhere else (HDR stays in Performance,
  brightness in Quick settings). Nothing is duplicated across tabs.
- Works with a controller on a handheld screen, on Home and over a game (the menu parts).
- Moving focus is as fast as in the rest of the Game Glance menu.

## Non-goals

- Covering all of Steam's settings, or a Game Glance "Settings" page that lists categories.
- A settings search.
- Changing Quick settings' sliders, device pickers or its other four switches; changing Performance beyond one row.

## Anti-goals

- A second place to change something Game Glance already has a control for.
- Any layer that watches or re-styles Steam's Settings pages.
- A player being unable to reach a Steam setting: Steam's full Settings must stay one step away.

## The map

| Task | Lives in | Reached by |
|---|---|---|
| Wi-Fi on/off, pick a network | Game Glance menu → Quick settings → **Wi-Fi** page | The Wi-Fi row in Quick settings |
| Bluetooth on/off, devices, pairing | Game Glance menu → Quick settings → **Bluetooth** page | The Bluetooth row in Quick settings |
| Uninstall / move games, see free space | **Storage**, a full screen | A Storage tile in the menu's Navigate tab |
| Resolution | Performance tab, Display section | — |
| Everything else | Steam's Settings, in Steam's own look | The Settings tile in Navigate (as today) |

## Part 1 — Quick settings rows and the Wi-Fi page

**Quick settings** (`QuickSettingsPanel`): the Wi-Fi and Bluetooth switches become rows you step into. Each shows an
icon, its name, one line of state and a chevron; A opens its page. State line: Wi-Fi shows the connected network's name,
"Not connected" or "Off"; Bluetooth shows "N connected", "On" or "Off". Airplane mode, Night mode, Automatically scale UI
and Do not disturb stay switches, in the same grid. The panel keeps its height. Turning Wi-Fi off becomes two presses;
Airplane mode remains the one-press way to cut radios (Michael's choice, variant 1).

**Stepping in** follows the menu's existing page pattern (the plugin settings pages: a crumb heading
`Quick settings › Wi-Fi`, B goes back to the row it came from, L1/R1 still change tab).

**Wi-Fi page**, top to bottom:
1. The Wi-Fi switch.
2. *Connected*: the current network with a check mark and signal strength. A on it offers Disconnect and Forget.
3. *Other networks*: name, a lock when it needs a password, signal bars; strongest first, known networks before unknown.
   A connects. The list scans while the page is open and stops when it closes.
4. A network that needs a password opens the Game Glance keyboard (the one chat uses, `MenuKeyboard`) with a masked
   field and a show/hide toggle. Wrong password or failure: the row shows Steam's reason and stays selectable.
5. With Wi-Fi off, only the switch shows, with one line saying networks appear when it is on.

6. A network one password cannot join (enterprise sign-in with a user name, and anything else Steam reports as needing
   more) is listed, dimmed, and A on it opens Steam's Internet page. A network with a sign-in web page is joined like an
   open one; Steam's own sign-in prompt follows as it does today. *(Claude's call.)*

**Checked 2026-11-13 (read-only, on the Ally):** Steam's own network store (`window.SystemNetworkStore`, which Quick
settings' Wi-Fi switch already reads) lists access points and has `Connect({ deviceId, deviceWapId, credentials })`, so a
password typed in our own field reaches Steam directly. No backend work is needed. Its access-point objects also carry a
saved password in clear text; Game Glance never reads it. The first real join is still to be tried on the device.

Out of scope here: hidden networks, proxy, static IP, wired settings (Steam's Internet page keeps them).

## Part 2 — Storage

A full screen in the Game Glance page style (title top-left, Home's art blurred and dimmed behind, the status pill and
footer hints as on other pages), opened from a new **Storage** tile in Navigate. Navigate has eight tiles in two full
rows today; the Storage tile starts a **third row** (Michael, 2026-11-16, round-4 mock-ups; five across was declined).

- **Left: the drives** (internal, SD card, any other Steam library folder). Each card: name, free space large, "used of
  total · N games", a usage bar. Up/down picks a drive; the list on the right follows.
- **Right: the games on the picked drive**, biggest first. Each row: art, name, "Played yesterday / last week / … /
  Not played yet", size. Non-Steam and Unifideck games are listed only if Steam itself reports them for that folder.
- **Buttons act on the focused game; nothing opens** (Michael's pick C, 2026-11-16, mock-ups in
  `settings-mockups/round-4-storage/`): **Y Uninstall**, **X Move to <other drive>** (a small drive picker if there
  are more than two), **A Open game page**, B back. The footer shows these hints while a game row has focus. Chosen
  over actions opening in the row (on Wi-Fi, buttons mounted into a list could not be reached on the device) and over
  a page per game; it adds no focusable buttons to the list. Clearing space is: down, Y, confirm, down, Y.
- **Uninstall** uses Steam's own confirmation dialog; the row disappears and the drive's numbers update when Steam
  reports the change.
- **Move** shows progress on the row and on both drive cards, can be cancelled, and is refused up front with a reason
  when the target has too little space. One move at a time; other rows stay usable. On the moving game **X cancels
  the move** (footer "X Cancel move"; no Y there). *(Claude's call: X starts and stops a move.)*
- Empty drive: one line, "No games on this drive".
- **Over a game** the Storage tile behaves like Steam's destinations in Navigate (Downloads, Library): it leaves the game
  view for the page. The running game's row reads "Running now · Close the game first" and its footer offers only
  A Open game page (no X or Y). *(Claude's call.)*

Out of scope: adding/removing library folders, formatting, repairing, default-drive choice, shader caches and other
non-game data (Steam's Storage page keeps them).

## Part 3 — Bluetooth page (feasibility check first)

As the Wi-Fi page: the Bluetooth switch; *Your devices* (icon by kind, name, "Connected · battery%" or "Not connected";
A connects/disconnects, with Forget as a second action); *Nearby* (scans while open; A pairs). A pairing that needs a
code shows it. With Bluetooth off, only the switch shows.

**Open:** on the Ally, `SteamClient.System` exposes no Bluetooth interface, only the on/off client setting Quick
settings already uses. Before this part is planned, a read-only check with Steam's own Bluetooth page open must find how
Steam lists and pairs devices. If Steam has no usable route, the fallback is Game Glance's Python backend talking to
BlueZ. Until then the Bluetooth row in Quick settings stays the switch it is today (only Wi-Fi changes in Part 1).

## Part 4 — Resolution in Performance (check first)

One row in the Performance tab's Display section, next to Refresh rate, using the tab's existing picker style. **Open:**
no resolution setter was found next to brightness (`SteamClient.System.Display`); `System.DisplayManager` and Steam's
Display page need the same read-only check. If Steam only offers it for external displays, the row shows only when docked.

## Retiring the Settings skin

`src/nativeSettings/` (the presentation over Steam's Settings pages) is removed with Part 1, in its own plan task, so Steam's Settings
shows as Steam draws it. The "Restyle Steam Settings and menus" option then governs only the context menus and is renamed
to match. The context-menu restyle (`src/contextMenus/`) is unaffected.

## Approaches considered

1. **Game Glance's own screens for the few real tasks, Steam's Settings untouched for the rest** — chosen. Fast (no
   watching of Steam's pages), reads as Game Glance, small surface. Cost: each task needs a tested way to read and write
   Steam's state.
2. **Keep dressing Steam's pages, made cheaper.** Covers everything at once, but stays a skin, stays coupled to Steam's
   page structure, and does nothing about 25 categories. Rejected by Michael: the structure is the problem.
3. **A Game Glance Settings page or tab that regroups Steam's categories** (overview cards, in-menu Settings tab,
   search-first; mock-ups round 1). Nicer shell, but it duplicates settings the menu already has and still has to carry
   categories nobody opens. Rejected in favour of "one home per setting".

How it is built (Michael's decision): our own pages from the start, not jumps into Steam's pages.

## Constraints

- Steam interfaces seen on the Ally (names only, not yet exercised): `SteamClient.System.Network`
  (`StartScanningForNetworks`, `StopScanningForNetworks`, `RegisterForDeviceChanges`, `SetWifiEnabled`,
  `Device.Connect`, `Device.Disconnect`, `Device.WirelessNetwork.Forget`); `SteamClient.InstallFolder`
  (`GetInstallFolders`, `RegisterForInstallFolderChanges`, `MoveInstallFolderForApp`, `RegisterForMoveContentProgress`,
  `CancelMove`); `SteamClient.Installs.OpenUninstallWizard`. Each must be confirmed on the Ally **and** the Steam Deck
  before it is relied on; a missing interface hides that row or tile, it never breaks the menu.
- Probing Steam is read-only until Michael agrees to a specific write on the device (joining a network, moving or
  uninstalling a game are real changes; test with ones he names).
- Base: the working tree's Quick settings (the Connectivity / Other headings already removed, six toggles in one grid,
  `tests/menu/quickSettingsPanel.test.ts`) is the starting layout for Part 1.
- Menu pages reuse the menu's row, picker, crumb and keyboard components and its focus/scroll rules; nothing new watches
  Steam's DOM.
- Network names and device names are personal: never logged, never sent anywhere.
- Handheld and docked; the menu parts also over a game.

## Order

1. Part 1 (Wi-Fi), then retire the skin.
2. Part 2 (Storage).
3. Part 3 (Bluetooth), after its check.
4. Part 4 (Resolution), after its check.

Each part gets its own plan and can ship alone.

**Release** (Michael, 2026-11-13): Part 1 and the removal of the skin go into 4.0 before its release, so the skin never
ships in a full release and its option is renamed in place (no migration of a saved value beyond the pre-release's).
Parts 2 to 4 follow as they are ready, in 4.0 if they make it.

**Devices** *(Claude's call)*: a part is built and checked on the Ally first, and must also be checked on the Steam Deck
before it goes into a release. Where the Deck lacks an interface, that row or tile is hidden there.

## Left to the builder

- The data layer for each part (adapters like `menu/steam/quickSettings.ts`), and its tests.
- How the Storage screen is routed and how it shares page chrome with Game Glance's other pages.
- Where the ninth Navigate tile sits (propose, then check with Michael).
- Exact wording of state lines and errors, in the menu's existing voice.
- Signal-strength thresholds, list refresh pacing, and what "last played" buckets are used.
