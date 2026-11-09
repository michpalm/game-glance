# Game Glance settings in the menu's Plugins section

Written 2026-11-03. Status: built on feature/plugins-settings (Tasks 1–8 by a Haiku session, de169dc..9e1b79a; fixes 3bb167f, 9006f3b) and checked on the ROG Xbox Ally 2026-11-04: Michael, "looks right".

Mockups: canvas https://claude.ai/artifact/Fqep53QY5eNze2SB3EKvZg (drawn over a real Steam Deck Home frame; boards "Plugins list", "A · Drill-in", and the row "Every category, drill-in layout").

## Why

Our menu's Plugins section is an empty page with one "Open in Steam" button that hands off to Decky's tab. Game Glance's own settings live only in Decky's panel: one long scroll of 30 controls in 8 sections, grown over time (the status bar and "On every page" sit inside Home; the menu's options are labelled "local preview").

Michael's goal: see the installed plugins inside our menu, adjust everything of Game Glance there, and give the settings a clear structure first.

## Decisions (Michael, 2026-11-03)

| Question | Decision |
|---|---|
| Plugins page | A list of every installed plugin. Game Glance opens inside our menu; any other plugin hands off to Decky's own panel for that plugin. |
| Grouping | By place: Home, Game page, Status bar & footer, Menu, Screensaver, General. |
| Moving between categories | Drill-in (layout A): a grid of six category cards, each opening its own page; B goes back. |
| Category pages | As drawn on the canvas ("looks right"). |

## Behaviour

### Plugins page

- Heading "Plugins" and the existing "Open in Steam" action (Decky's tab, as today).
- One row per plugin: Decky's icon (the plugin's own `icon` element), name, version, and on the right "Settings ›" for Game Glance or "Opens in Steam ↗" for others.
- The list is read from `DeckyPluginLoader` when the page opens:
  - plugins in `plugins` (loaded ones only), ordered by `deckyState._pluginOrder` (first occurrence; the list can hold duplicates and plugins that are not loaded), then any loaded plugin missing from the order, in load order;
  - names in `deckyState._hiddenPlugins` are left out, as Decky's own list does.
- Missing or malformed loader state (no loader, no array): the page shows only the heading, the "Open in Steam" action and the line "Plugins could not be listed." Nothing throws.
- **Another plugin:** `deckyState.setActivePlugin(name)`, then the existing native hand-off to the Decky tab (`{ kind: 'qam', tab: 'decky' }`). Decky opens straight on that plugin's panel. If `setActivePlugin` is missing, the hand-off still opens Decky's list.
- **Game Glance:** pushes the Game Glance view inside our menu.

### Game Glance view (drill-in)

- Heading: crumb "Plugins › Game Glance" and the version on the right.
- Two-column grid of six cards, each with an icon, its name and a one-line summary of the current values (pure function of the settings):

| Card | Summary |
|---|---|
| Home | Spotlight Home off → "Off". On → "On · <row name> · <row style>" |
| Game page | "Full look" or "Clean look" |
| Status bar & footer | Spotlight Home off → "Needs Spotlight Home". Else "Status bar on/off", plus " · Every page" when on every page |
| Menu | "Game Glance menu on · <Compact/Radial> keyboard" |
| Screensaver | "On" or "Off"; "Needs a newer Steam" when unavailable |
| General | "Look, data and updates" |

- A on a card pushes its page. B on a page returns to the grid, with focus on that card; B on the grid returns to the Plugins list, with focus on Game Glance.
- Page heading: crumb "Game Glance › <category>". The panel scrolls when the page is taller than it.

### Category pages

Rows reuse the menu's existing controls: `ToggleField` in a `gg-menu-setting` row (as Quick settings), `SettingSegments` for two or three choices, `MenuAction` for buttons and pickers. Every change writes through the existing `settings` and `menuPreferences` stores, so Decky's panel and our menu always show the same values. Labels and descriptions are today's copy unless listed here.

**Home**
- Spotlight Home (toggle). Off: the page shows only this row, as today.
- Games row: Games (picker row "Recent games ›" or the collection name; A opens a list view of Recent games plus the collections, A picks and returns), Sort by (segments of the sort options, only for a collection row), Style (Steam | Spotlight | Minimal), Gray out uninstalled games.
- Feed: What's new, Friends, Recommended, Show wishlist deals (only while Recommended is on).

**Game page**
- Look: Full | Clean (segments; today's Clean look toggle). Description: "Full: description and HowLongToBeat cards. Clean: one row at the bottom over the full art."
- HowLongToBeat match card for the current game (`useCurrentGame`): name, the match line (today's copy), "Change match", and "Open on HowLongToBeat" when matched.
  - "Change match" closes our menu and opens Game Glance's Decky panel (`setActivePlugin('Game Glance')` + the Decky tab), where the link field is. Typing in our menu is out of scope.
  - "Remove override" shows in the card while an override is set.
  - No current game: the card says "Open a game page first."

**Status bar & footer**
- Spotlight Home off: the line "Turn on Spotlight Home to use the status bar and footer." and no rows.
- Status bar. Profile picture (only while the status bar is on).
- Controls: Expanded Home controls, On every page (only while the status bar is on; On every page disabled until Expanded Home controls is on, as today).

**Menu**
- Game Glance menu (toggle). Description: "Replaces the Home and quick access menus. Off closes this menu and returns Steam's own." Turning it off closes our menu.
- Social: Keyboard (Compact | Radial).
- "Open Steam menu" is not shown here (More already has it).

**Screensaver**
- Header action "Preview" (closes our menu, then today's `previewScreensaver`), shown while the screensaver is on.
- Game Glance screensaver (toggle). While on: "Show over the art" with Logo, Status bar, Stats in a two-column grid, and one line explaining them.
- Steam without a screensaver: today's "Needs a newer Steam client…" line only.

**General**
- Game Glance (toggle). Description: "Off turns Game Glance off everywhere: game page, Home, menu and screensaver." Turning it off closes our menu.
- Look on Home and the game page: Game logo, Hero art (Fill | Fit, description follows the choice), Page shading (Bottom | None, description follows the choice).
- Data: Pre-load new games automatically; buttons "Pre-load installed games" (shows progress and becomes "Stop (n / total)" while running, as today) and "Clear cached data" (toast as today).
- Updates: line "Game Glance <version>" with today's status line; "Update to <version>" when available (closes our menu, then Decky's confirm); "Check for updates"; "Choose version" (closes our menu and opens Game Glance's Decky panel, where the version list is).

### One structure for both panels

- A pure module describes the six categories: ids, labels, icons, summary, and which rows show for given settings (it absorbs today's `settingsRows.ts` rules).
- Our menu renders it with menu controls. Decky's panel (`SettingsPanel`) is regrouped into the same six sections in the same order with the same labels, keeping its Steam controls (VDL Q19: the settings panel keeps Steam's look). No setting is added, removed or renamed in storage.

### Focus and navigation

- View ids on the menu stack: `game-glance`, then `gg:<category>` (and `gg:home:row` for the Games row picker). `back` pops them; the shell's back already returns to More for an unpinned section.
- Focus keys `gg:<category>:<row>` so the menu's focus memory restores the last row when returning to a page or card.
- L1/R1 still switch the menu's tabs and clear the stack, as for every section.

### Safety

- Reads of `DeckyPluginLoader` are property reads; the only call into Decky is `deckyState.setActivePlugin(name)`, a plain state setter (verified on the Ally 2026-11-03: it finds the plugin by name and notifies listeners).
- No Steam functions are called beyond today's native hand-off.
- A failure to save a setting shows the menu's existing inline error and leaves the control on the stored value.

## Testing

- Vitest, test-first:
  - plugin list: order, duplicates, unloaded names, unlisted plugins, hidden plugins, missing loader;
  - opening another plugin sets the active plugin then hands off; a missing setter still hands off;
  - categories: rows shown for each dependency (Spotlight off, collection row, Recommended off, status bar off, expanded controls off, screensaver off/unavailable);
  - summaries for each card;
  - stack: grid → page → back restores the card focus; page → picker → pick returns;
  - toggles write through the stores; turning off Game Glance or the menu closes our menu;
  - Decky panel renders the six sections in order.
- Ally, by eye (Michael), menu open on Home and in-game: Plugins list, opening another plugin, every category page, changing a value in our menu and seeing it in Decky's panel and back.

## Out of scope

- Typing in our menu (HowLongToBeat link, version list): handed to Decky's panel.
- Drawing other plugins' panels inside our menu.
- New settings.

## Ships in

4.0.0, on `feature/plugins-settings` from `release/4.0`. Nothing pushed until Michael says.

## Device check (ROG Xbox Ally, 2026-11-04)

- Full plugin installed (backend included) and the Ally restarted; previous build backed up at `~/gg-backup-ally-20261103-2352`.
- Michael: overall good. Found that the top and bottom of long pages were cut, and the heading hid at the top.
  - Cause (measured): Steam's controller scroll stops when the focused row touches the panel edge, so the panel's 24px padding and the heading above the first row stayed out of view (General's last button 1px from the edge, scrollTop 287 of 311).
  - Fix 9006f3b: `scroll-padding-block:24px` on the panel and `scroll-margin-top:64px` on each view's first row (Social's friend list does the same); category cards 112px tall so the six fit without scrolling. Tested live with an injected rule first, then installed (index.js b9759a29).
- Michael after the fix: "looks right".

