# Settings home — design

Status: approved and built (2026-11-19; PS5 check notes in §4). Mock-ups: `~/Documents/Claude/Bazzite/page-mockups/settings-S2b.png`
(the panel), `settings-S2c-1.png` and `settings-S2c-2.png` (collapsing groups, chosen). Built on the page kit
(`src/pageKit`), as the Library and Media pages.

## Why

Opening Steam's Settings drops you out of the console feel the rest of Game Glance gives. Michael wants a Settings
page in Game Glance's style:
- it shows, at a glance, how things are set;
- it jumps straight into Steam's exact page for anything you want to change;
- it doesn't repeat what the Game Glance menu already does.

It's the third page on the kit. It is kept small on purpose: a glance and a jump, not a rebuild of Steam's settings.

## Goals

- Game Glance's Settings replaces Steam's bare `/settings` page wherever Steam opens it (Steam's menu, Navigate).
  Every `/settings/<page>` stays Steam's own.
- **Left: a grouped list** (Device, Games, People, You, System). Only the group you are in is open; the closed groups
  show their entries in grey on one line. L1/R1 jump a whole group.
- **Right: a live panel** for the highlighted entry:
  - a heading and a one-line description;
  - the current values Steam lets us read, and nothing it doesn't;
  - "Already in the menu: …" where the Game Glance menu covers part of it;
  - **More in Steam's settings ›**, which opens that entry's own Steam page.
- B on a Steam settings page comes back to ours on the same entry.

## Non-goals

- Changing settings on our page. Every change happens on Steam's page. This was Michael's choice, "glance and jump",
  over full controls (rebuilding Steam's pages) and over a bare index.
- Steam settings pages not listed here (Developer, Internal, Store, Library, Music, Voice, Broadcast and the others):
  Steam's own page still reaches them, through its own list.
- The Game Glance settings: they stay in the Game Glance menu.

## Anti-goals

- No invented or guessed values. A value that can't be read is left out, and the panel still offers the jump.
- Never blocks Steam's Settings: a failure shows Steam's page. A "Settings page" switch turns ours off.
- No Steam call that changes anything. Reads only, and only of stores and fields whose source we have read.

## Constraints (read from steamui/sp.js and the PS5, 2026-11-19)

- **Routes:** Steam's main menu opens `Settings.Root()` = `/settings`. Each page has its own route under
  `/settings/` (`display`, `audio`, `bluetooth`, `controller/:type/:index`, `keyboard`, `power`, `ingame`,
  `gamerecording`, `compatibility`, `downloads`, `cloud`, `remoteplay`, `friends`, `family`, `notifications`,
  `account`, `customization`, `accessibility`, `system`, `interface`, `security`, …).
  - Steam moves between its settings pages by replacing the history entry, so B from any of them returns to the page
    that opened them.
  - One `routerHook.addPatch('/settings', …)` wraps Steam's element in a gate, as the Library's and Media's.
- **Reading the values:**
  - **`settingsStore.m_ClientSettings`:** about 270 plain fields, e.g. `cloud_enabled`, `download_region`,
    `gamerecording_background_mode`, `enable_overlay`, `overlay_fps_counter_detail_level`, `accessibility_*`,
    `startup_movie_id`, `system_idle_suspend_*`, `gamescope_hdr_enabled`, `controller_*`.
  - **`settingsStore.m_Settings`:** `strDisplayName`, `flCurrentDisplayScaleFactor`, `bDisplayIsUsingAutoScale`,
    `strCompatTool`, `bCompatEnabled`, `strCurrentBetaName`, `vecValidDownloadRegions`.
  - **`settingsStore.m_FriendSettings`:** `bDoNotDisturbMode`, `b24HourClock`, `bSignIntoFriends`.
  - **`settingsStore.m_strTimeZoneID.m_currentValue`:** the time zone.
- **Live device state:**
  - **Display:** `SystemDisplayManagerStore.GetState()` (source read: it only fetches) gives width × height,
    refresh, HDR and VRR.
  - **Sound:** `SteamClient.System.Audio.GetDevices()`, already used by the menu.
  - **Controllers:** `ControllerStore.m_controllerList` gives name and wireless. Battery comes from Game Glance's
    backend (BlueZ), already used by the status bar.
  - **Bluetooth:** paired devices come from the backend's BlueZ read. Today it keeps only connected gamepads; it would
    also return paired devices: name, connected, kind, battery when known.
  - **Account:** `App.m_CurrentUser` gives `strAccountName`, `strAccountBalance`, `strFamilyGroupName`,
    `rgFamilyGroupMembers` and `NotificationCounts`.
  - **Friends:** `friendStore.allFriends` gives the online count and total.
- **PS5 values today, for the mock-ups and tests:**
  - LG TV SSCR2 at 1920 × 1080, 60 Hz, HDR on, VRR on, scale auto (128%);
  - HDMI audio at 50%;
  - controller "Bity", wireless;
  - Proton 11, cloud on, download region 66 of 186, game recording off;
  - overlay on, FPS counter level 1;
  - sleep after 15 min on battery and 60 min plugged in;
  - family of 3, 8 friends with 1 online;
  - time zone Europe/Paris, "Steam Deck Stable" client.

## Approaches

**Panel depth** (Michael, 2026-11-19):
- glance and jump — **chosen**;
- full controls — dropped: a rebuild that breaks whenever Steam changes a page;
- index only — dropped: nothing live.

**List** (Michael, 2026-11-19): collapsing groups (S2c), chosen over S2b's full scrolling list. L1/R1 jump a group.

**Takeover** (Michael, 2026-11-19):
- the bare `/settings` route with a gate — **chosen**;
- a separate Game Glance page — dropped: two Settings entries, and Steam's menu would skip ours;
- panels injected into Steam's page — dropped: fragile.

## Design

### 1. Route and gate (`src/patches/settingsPage.tsx`, `src/settings/settingsGate.ts`)

- **When ours shows:** the "Settings page" switch is on (default on, beside the Library and Media page switches), the
  path is exactly `/settings`, and the user hasn't chosen Steam's for this visit.
- **Paths Steam keeps:** any `/settings/<page>` path renders Steam's element.
- **Leaving the route:** while Steam leaves the route, the gate keeps its last choice, so there's no flash.
- **No "Steam's settings for this visit" option:** "More in Steam's settings" is the way in. The setting turns ours off
  entirely.

### 2. The list (mock-ups S2c)

- **Groups and entries, in this order:**
  - **Device:** Display, Sound, Bluetooth, Controllers, Keyboard, Power and sleep.
  - **Games:** In-game, Game recording, Compatibility, Downloads, Cloud, Remote Play.
  - **People:** Friends and chat, Family, Notifications.
  - **You:** Account, Customization, Accessibility.
  - **System:** System, Interface, Security.
- **Open group:** shows its heading, then its entries (icon and name). Only one group is open.
- **Closed groups:** a heading plus the entries' names in grey on one line, joined by " · ", cut with "…" when too
  long.
- **Moving:**
  - Down past a group's last entry opens the next group on its first entry; Up past the first entry opens the
    previous group on its last entry. The list doesn't wrap at the ends.
  - L1/R1 open the previous or next group on its first entry. They wrap, as the page kit's tabs do.
  - The group you leave folds shut with a short slide (the kit's base timing).
- **Coming back:** the page reopens on the entry it was left on, including after B from Steam's page.
- **Hidden entries:** an entry is shown only when Steam has that page on this device. On the PS5, Steam's own list
  decides from its `visible` flags. The builder reads which pages Steam shows (from its list's DOM or its route
  table). When this can't be known, the entry stays.

### 3. The panel (mock-up S2b's right side)

- **Layout:**
  - a glass panel at (650, 146) to (1824, 960);
  - the entry's icon and name (36 units), with a one-line description under it;
  - then the glance: label and value rows, or a small list such as paired devices;
  - then the "Already in the menu" line where it applies;
  - **More in Steam's settings ›** at the bottom.
- **Buttons:**
  - A on a list entry, or on More, opens Steam's page for that entry.
  - Pressing Right from a list entry moves to More.
  - B goes back: from the panel to the list, and from the list out.
- **Glance per entry.** Only fields read on the PS5 are listed; anything else the builder must first find readable
  (source read), or leave out.

| Entry | Glance | "Already in the menu" | Steam page |
|---|---|---|---|
| Display | display name; resolution and refresh; HDR on/off; scale (auto, %) | Brightness, Auto scale | `/settings/display` |
| Sound | output device and its volume; input device | Volume, output and input pickers | `/settings/audio` |
| Bluetooth | paired devices: name, Connected / Not connected, battery | Bluetooth on and off | `/settings/bluetooth` |
| Controllers | connected controllers: name, wireless, battery | — | `/settings/controller/…` (Steam's own route for the first one), else the bare Controllers entry Steam's list opens |
| Keyboard | (description only, unless the builder finds a readable layout) | — | `/settings/keyboard` |
| Power and sleep | sleep after (battery, plugged in); screen off after; battery % shown | Sleep, restart, shut down | `/settings/power` |
| In-game | overlay on/off; performance overlay level; screenshot notification | Performance overlay level | `/settings/ingame` |
| Game recording | mode (off / background / manual); keep for; max FPS | — | `/settings/gamerecording` |
| Compatibility | Steam Play on/off; default tool (e.g. Proton 11); shader pre-caching | — | `/settings/compatibility` |
| Downloads | region (name); limit on/off; download while playing | Game Glance's Downloads page | `/settings/downloads` |
| Cloud | Steam Cloud on/off | — | `/settings/cloud` |
| Remote Play | (description, plus any field the builder finds readable) | — | `/settings/remoteplay` |
| Friends and chat | friends online of total; Do Not Disturb on/off; sign into friends | Status (menu) | `/settings/friends` |
| Family | family name; members | — | `/settings/family` |
| Notifications | toasts on/off; in game on/off; new items count | Notifications page (menu) | `/settings/notifications` |
| Account | account name; wallet balance when set | — | `/settings/account` |
| Customization | startup movie (name or "Default"); store content on Home | — | `/settings/customization` |
| Accessibility | high contrast, reduce motion, screen reader, mono audio: each on/off; text size | — | `/settings/accessibility` |
| System | client channel ("Steam Deck Stable"); time zone | — | `/settings/system` |
| Interface | language; 24-hour clock | — | `/settings/interface` |
| Security | (description, unless lock-screen state is readable) | — | `/settings/security` |

- **Value formats:**
  - on/off as "On" / "Off";
  - times as "15 min" or "1 h", "Never" for 0;
  - region by its name from Steam's list;
  - the wallet as Steam's own formatted string.

### 4. Look

- The kit's frame, title "Settings"; the backdrop is the last played game's hero blurred by the kit (Michael, PS5 check:
  plain black didn't match the other pages' frosted look), the kit's shade alone when nothing has been played.
- **Focus:** the focused entry is light with dark text, as the Media viewer's rows after the PS5 check. A focused
  dark-glass button gets dark text from Steam and reads dark on dark.
- No button badges on rows. The footer shows L1/R1 "Group", A "Open", B "Back".

## Calls I made (for Michael to check)

1. A "Settings page" switch, default on, beside the Library and Media page switches.
2. No per-visit "Steam's settings" option: More is the way into Steam's pages, and the switch turns ours off.
3. Up and Down don't wrap at the ends of the list; L1/R1 do wrap.
4. The Bluetooth panel needs the backend to list paired devices, not only connected gamepads. That's a small backend
   change, so it needs a Decky restart on each device.
5. Controllers' "More" opens Steam's page for the first controller when one is connected.
6. Entries Steam doesn't show on a device are hidden when that can be known.

## Left to the builder

- Read in sp.js which pages Steam's list shows on this device, and how it opens Controllers without a controller.
- Find readable fields for Keyboard layout, Remote Play, Security and the OS/Steam version, or leave them out.
- Download region names from `m_Settings.vecValidDownloadRegions`.
- The component and file split inside `src/settings/`.

## Testing

- **Unit:**
  - the groups and the move table: down/up across groups, L1/R1 wrap, coming back to the same entry;
  - the gate's decision table (`/settings` is ours; `/settings/display` is Steam's; switch off; leaving keeps the
    choice);
  - each glance builder from fake store values, including missing fields (left out, never invented);
  - the value formats;
  - the backend's paired-device parsing from a BlueZ `GetManagedObjects` sample.
- **Device (PS5):**
  - open Settings from Steam's menu;
  - move through the groups with the D-pad and L1/R1;
  - check each panel against Steam's page;
  - More, then B back to the same entry;
  - the switch off shows Steam's.
