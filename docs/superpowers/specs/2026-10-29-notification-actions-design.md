# Notification actions design

Written 2026-10-29 from Michael's Ally feedback on the in-game menu's Notifications page. Status: built and Ally-checked 2026-10-29 (a252d4f..cd7870c; Michael: bell clears, caught-up state centred, "It looks good"). Friend rows and account-link rows not yet seen on the device (none in the tray). Mockup (private): https://claude.ai/artifact/S742sAFR8iVJts1SMZNV7e (version 2: single Mark all read, just-marked state, all caught up).

## Why

The page is meant to replace Steam's notification menu, but every row opens the same notification in Steam's own menu ("Open in Steam"), the heading's Steam button does the same, read notifications pile up, and scrolling back up never reaches the heading.

## Behaviour

### Heading
- The Steam button is replaced by **Mark all read** (double-check icon). It marks every account notification read through Steam's notification store (`MarkAllItemsRead()`), marks them viewed (`MarkAllItemsViewed()`, so the bell badge clears), and marks every local notification (downloads, plugins) read in our own store.
- With nothing unread it dims (still focusable, does nothing). With no rows at all it is not shown.
- No Clear button. Nothing is ever hidden in Steam itself.

### Which rows show
- On entering the page, the rows already read at that moment are left out. Rows read while the page is open (opened, or Mark all read) stay until the next visit; only their unread dot goes.
- Local notifications (download complete, eType 1; plugin, eType 31) have no account read state: their ids are remembered as read in the menu preferences (backend kv), capped to the most recent 200 ids. A local notification counts as unread when Steam marks it new (`bNewIndicator`) and its id is not remembered.
- Friend notifications (online, in game, invite, chat message) have no account read state either and are remembered locally the same way.
- Empty page: "You're all caught up", a line "Read notifications are still in Steam." and a **See all in Steam** button (the old handoff to Steam's notifications). The heading button is hidden.

### What a row does
Opening a row marks it read (account: the store's `MarkItemRead(id)`; local: remembered), then:

| Kind | Action | Right label |
|---|---|---|
| Download complete (eType 1) | The game's page in Steam, as Steam's own list does (`Navigation.App(appid)`) | View game |
| Plugin (eType 31) with `data.onClick` | Call the plugin's own `onClick` (as Steam does); close the menu first | Open |
| Plugin without `onClick` | Only mark read | (none) |
| Wishlist sale | Store page, or the wishlist when several games are on sale (unchanged) | View in store |
| Friend notifications (online, in game, invite, chat message) | Our own Social chat with that friend (switch to Social, enter that friend's chat). A game invite with a `response_steamurl` opens that URL in Steam, as Steam does. | Open chat (invite: Join game) |
| Account notification whose type is in Steam's link table (module 64884's type table, read via its exported lookup found by source text) | Open the table's `link(body)` URL in Steam's browser | Open |
| Anything else | Steam's notifications page (today's behaviour) | Open in Steam |

### Scrolling
- When focus lands on the heading button or the first row, the panel scrolls to the very top after Steam's own focus scroll (two animation frames, as the Social friend list does). Other rows are kept a 28 px inset clear of the panel edges (24 px padding plus the 4 px focus outline).

## Rules
- Steam functions are found by source text, never by minified names, and only those named here are called. Probes stay read-only.
- A failing action falls back to Steam's notifications page; a failing read-mark never blocks the action.
