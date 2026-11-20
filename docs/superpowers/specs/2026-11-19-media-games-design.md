# Media game collections — design

**Status:** Draft for Michael's review
**Design mock-ups:** `media-games-index-grid.png` and `media-signalis-folder.png` (real PS5 frame and local screenshots)

## Why

The current Media page presents every local screenshot and recording together. From a running game, the in-game menu's Screenshots action hands off to Steam's recording overlay. Michael wants one place to browse all captures, organize them by game, and open a game's collection directly while playing it.

## Goals

- Keep the existing Media views: **All**, **Screenshots**, and **Recordings**. Add **Games** as a fourth top-level view.
- In **Games**, show one art-backed card per game that has local screenshots or recordings. Use the visual treatment of the Game Glance Navigate card grid. Show the game's Steam-provided name and separate screenshot and recording counts. Sort cards by the date of their newest local item, newest first.
- Opening a card shows the existing Media gallery filtered to that game. Keep the same day grouping, item tiles, viewer, full-screen view, controls, and Steam actions. The header reads **Media — [game name]**.
- In the game-scoped gallery, **All**, **Screenshots**, and **Recordings** show only that game's items and counts.
- Change the in-game menu's **Screenshots** action to open that same game-scoped Media gallery directly. It must not open a second, game-specific Media implementation or Steam's recording overlay.
- Use the same stable Steam game identity for screenshots and recordings. A recording must appear in the correct game collection; if Steam's identifiers cannot be reconciled, do not silently assign it to another game.
- Keep the root Media page, including its existing unfiltered entry points from Steam and Navigate, unchanged apart from the new Games view.

## Navigation and state

- The Games view is an index inside the existing `/media` route. Selecting a card opens `/media/grid?game=<encoded-game-id>` and renders the existing gallery component with that game scope.
- The in-game menu supplies the running game's Steam GameID in the same `game` query parameter. Both entry points render the same gallery and item actions.
- B from a collection opened in Games returns to the Games index. B from the in-game entry follows Steam history back to the originating in-game context. Preserve focus on the previously selected card or menu item when returning.
- Opening a screenshot, full-screen navigation, upload, delete, and clip playback keep their existing behavior. A clip still opens Steam's player.

## Games view

- Use a responsive grid of wide cards, styled like Navigate's tiles and using the newest local screenshot as each card's artwork when one exists. When a game has recordings but no screenshot, use the recording's game artwork if Steam provides it; otherwise show the standard page surface with the name and counts.
- Each card shows a game name plus counts such as “2 screenshots · 1 recording.” The Games tab count is the number of distinct game collections.
- Include only games with local media. Uploaded-only cloud screenshots remain outside this page, matching the current Media design.
- If Steam provides no name, show **Unknown game** and keep that collection distinct by its Steam identity. Never guess a title or merge unnamed games. Known Steam fallback names remain eligible.
- If a new screenshot is captured while Media is open, update the relevant game collection and counts. A newly captured game appears in the Games grid.
- If there are no local captures, show an empty state that explains Games will list titles after a screenshot or recording is saved.

## Identity and data

- Screenshots already carry `nAppID` and `strGameID`; recordings carry `game_id`. Use Steam's canonical GameID string as the collection key, not a display name, so duplicate or missing names do not merge collections. Normalize screenshot `strGameID` and recording `game_id` to the same key only as supported by Steam's source.
- Resolve the display name through Steam's app and shortcut stores, following the existing Media lookup. Preserve unknown-name handling above.
- Build collection counts and newest-item timestamps from the same local screenshot and recording list used by Media. Do not add manual tags or write metadata back to Steam.

## Non-goals

- Controller redesign and Community/Guides treatment.
- Manual tags, captions, folders on disk, sharing, or organization of uploaded-only media.
- Changes to screenshot upload/delete confirmation or Steam's recording player.

## Constraints

- Keep the existing Media route takeover and Steam fallback behavior. A failure to resolve the game scope or media list must fall back safely without breaking Steam's Media page.
- Read Steam source before calling any new API. The recording cache is lazy-loaded; follow Steam's loading sequence before grouping clips.
- No device reload while any Game Glance page or menu is open. Device checks must cover both entry paths and the back/focus behavior.

## Verification plan

- Unit coverage: grouping screenshots and recordings under one game identity; distinct unknown-name groups; per-game tab counts; ordering by newest item; empty collections; scoped viewer/filmstrip navigation; and screenshot notifications updating the correct collection.
- Route coverage: Games card to scoped gallery; in-game Screenshots action to the same scoped gallery; B returning to the appropriate source; root Media continuing to show all items.
- PS5 check: browse Games, open Signalis, verify its title and items, B back to Games; open Signalis Media from the in-game menu and verify it shows the same collection and returns to the in-game context. Check screenshots and recordings where available.
