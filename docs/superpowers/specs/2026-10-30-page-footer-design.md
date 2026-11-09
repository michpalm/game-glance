# Game page footer design

Written 2026-10-30. Status: built (10f5c83, ae361fc, 447eb0d) and Ally-checked 2026-10-30: Michael confirmed open and back are seamless.

## Why

With Expanded Home controls on, Home restyles Steam's footer (`#Footer`) into Game Glance pills with neutral glass keycaps. The game page still shows Steam's plain footer, and the footer drops back to Steam's look at the start of the open transition, because Home suspends all its controls while a game opens (`useHomeControls` → `homeRuntimeSuspended({opening…})` → the footer lease's `suspend(true)` releases the markers).

## Behaviour

- **Game page lease.** Our game page component (`GameHero`) acquires the same footer lease Home uses (`acquireHomeFooter` in `src/home/homeControlsDom.ts`, generalised as needed for a page root) and renders the footer part of `homeControlsCss` (the `[data-gh-footer…]` rules only; header/status/Search rules stay Home-only). Footer only: no header, status bar, Search or focus on the page.
- **Same opt-in as Home.** Active only when Home's footer would be: Game Glance enabled, Spotlight Home on, Home status bar on, Expanded Home controls on (the `optedIn` conditions in `useHomeControls`, without Home's `mounted`). Off → Steam's footer on both screens, as today.
- **Seamless open.** The footer is exempt from Home's opening suspension: while `data-gh-opening` is set, Home keeps its footer lease (header, Search and status focus still suspend as today). The page acquires its lease while Home still holds its own; the shared, owner-counted markers keep the footer marked throughout, and both screens render the same footer CSS so it never changes style.
- **Back to Home.** Home re-acquires on return; the page releases on unmount. Owner counting covers any overlap; if there is none, the gap must be no longer than one frame (state how in the report).
- **Safety.** Unchanged contract: only marker attributes and CSS; malformed or absent structures leave Steam's footer untouched; no Steam functions; glyphs, labels and handlers retained. Verified read-only on the Ally 2026-10-30: the game page `#Footer` has the same structure as Home's (Menu group, one flex-grow spacer, Select and Back groups, each glyph + label; full width at the viewport bottom).
- Other suspensions of the footer (side menu open, launching, not foreground, disconnected) stay as today on Home; the page lease follows the same rules except opening.
