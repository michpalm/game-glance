# Home feed tabs on and off (#56, Home part) — design

2026-10-23. Status: implemented and checked on the Ally (2026-10-23, docs/device-checklist.md). Branch `feature/3.6-hero-scale-whatsnew` (after 3.5.0).

## Problem

Issue #56 asks to hide the "what's new" and update items. Home's feed always shows three tabs (What's new, Friends, Recommended), so a player who does not care about one of them cannot remove it, and one who wants none of them cannot remove the feed.

The game page's news and updates are game-specific content, not Home's cross-game What's new: they get their own switch under Game page, designed after an Ally probe of Steam's section (see "Later: the game page part").

## Decisions (with Michael, 2026-10-23)

- Decided under the visual language's identity section ("Identity: the focus is games", `design/visual-language`): options choose what you see, one switch per kind of content, the line drawn at styling.
- One switch per feed tab: **What's new**, **Friends**, **Recommended**; all on by default.
- All three off: the feed is gone from Home. Down does nothing, no hint or sheet toggle shows, a swipe up does nothing.
- In Quick Access a row shows only while the row it depends on is on (as Clean look under Game Glance page and the screensaver's options already do). This applies to the new switches and to Spotlight Home's existing Home-only rows; rows that also act on the restyled game page (reachable with Spotlight Home off through Clean look, `home/mode.ts`) stay visible.
- Profile picture in the status bar sits under Status bar; Show wishlist deals sits under Recommended (the deals are Recommended's second row).

## Setting

- `Settings.feedTabs: { news: boolean; friends: boolean; recommended: boolean }`, default all `true`; a missing or malformed stored value reads as the default per field; `settings.setFeedTab(tab, on)`. The 3.5 settings preservation keeps the field across version switches.
- Copy (descriptions under the toggles):
  - **What's new** — "News and events from your games, and recently updated games."
  - **Friends** — "What your friends are playing, and what is trending among them."
  - **Recommended** — "Games from your library to play next."
  - Show wishlist deals keeps its text.

## Quick Access layout (Game Glance → Spotlight Home)

Indented rows show only while the row above them is on.

```
Spotlight Home
  Games row
    Sort by (a collection only, as today)
  Games row style
  What's new
  Friends
  Recommended
    Show wishlist deals
Status bar
  Profile picture in the status bar
Game logo
Hero art
```

Games row and its Sort by also choose the Game Glance screensaver's games, so they also show while the screensaver is on (found in review, 2026-10-23).

Moved: Games row and Games row style come directly under Spotlight Home (before, they followed Game logo); Hero art follows Game logo. Values are unchanged.

## Feed behaviour

- The tab strip lists only the tabs that are on, in the order above. Labels, empty lines and cards are unchanged.
- L1/R1 move between the shown tabs (clamped at the ends, as today: `focusZones.tabForButton` with the shown count).
- The feed opens on the first shown tab. Home's memory (`homeMemory`, `HomeMemory.tab`) stores the tab's id instead of its index, so a restore after a switch changes lands on the same tab; a remembered tab that is now off, or an old index, falls back to the first shown tab and drops the remembered card.
- Turning a tab off while Home is open (Quick Access over Home) removes it at once; if it was selected, the first shown tab takes its place and focus, if it was in the feed, moves to that tab.
- With no tab on: `FeedSheet` is not rendered; the mouse's sheet toggle (`.gh-sheet-toggle`) is not rendered; `raiseSheet` and the swipe up do nothing; Down from the game cards has nothing below it, so focus stays.

## Data

A tab that is off loads nothing:

| Tab off | Not read |
|---|---|
| What's new | Steam's What's new list (`readWhatsNew`), recently updated games (`useRecentlyUpdated`) |
| Friends | live friends (`useLiveFriends`) and their last games, Steam's trending list (`useSteamTrending`) and the derived trending |
| Recommended | recommendations and wishlist deals (`useRecommended`'s `enabled`): no Steam ID is sent to the store |

The hooks already take `enabled`; today they are passed `true`.

## Not changed

The game cards row, the action row, the status bar, the screensaver, the game page.

## Testing

- Unit: settings default, read (missing, partial, malformed), write; the shown-tab list for all eight combinations; L1/R1 over a reduced list; memory restore by id, by an old index, and to a tab now off; the data hooks get `enabled: false` per tab off; the settings panel's row visibility for Spotlight Home off, Status bar off, Recommended off.
- Ally: each tab off alone, two off, all three off (Down, swipe up and the mouse toggle do nothing; no gap under the cards); turning the selected tab off with the feed raised; wishlist deals with Recommended off sends no store request (network log).

## Later: the game page part

A separate switch under Game page (for example "News and updates") for the game page's own news and updates section. Designed after an Ally probe of how Steam builds that section in the restyled page, in both looks, and how to hide it without a gap.

## Not in scope

Reordering tabs, choosing the default tab, per-tab card counts, #14 (HLTB toggle; same kind of content switch, separate issue).
