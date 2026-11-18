# Personal Calendar in Spotlight Home's Recommended tab — short design (2026-11-18)

## Why

Steam's Home shows "Your Personal Calendar": new and upcoming games picked for you, day by day. Michael wants it in
Spotlight Home's Recommended tab. On a console with few installed games, "Play next" is often empty (on the PS5 it
is empty today: every installed game is already in the game row), and the calendar always has something to show.

## What (option A, mock-up `calendar-mockups/1-option-A-two-per-day.png`)

- A new setting picks what **row 1 of the Recommended tab** shows: **Play next** (today's behaviour, the default)
  or **Personal calendar**. The Wishlist sale row 2 is unchanged.
- The calendar row is **day by day**: one frosted column per day, headed `MON 16/11`; today is headed
  `TODAY · 18/11` in the accent colour. Each column holds that day's **two best-ranked games** (Steam's `nRank`,
  lowest first), store header art, stacked.
- Only days with games get a column, from **7 days back to 14 days ahead**. The row opens **scrolled to today**
  (or the next day with games), and focus lands on today's first game, so past days sit to the left.
- **A** on a game opens its store page (as the deal cards do).
- The row keeps row 1's height (270). Cards are landscape at the library header shape (460:215).

## Data

- `GET https://store.steampowered.com/personalcalendardata?tag=0&days_backward=7&days_forward=14` with the
  Steam session's cookies (checked on the PS5: personalised, works without opening Steam's own tab). It returns app
  IDs, release dates, ranks and flags only.
- Names and art: the store's `appdetails?filters=basic` per shown game (`name`, `header_image`; newer games no
  longer have art at the old fixed address). At most two per day, so about 30 lookups, cached per app.
- Cached in the plugin's key-value store: the calendar for **6 hours**, each game's name and art for **7 days**. A
  cached calendar shows at once; a fresh one replaces it when it arrives.
- If the calendar can't load or is empty, row 1 shows **Play next** instead, so the row is never blank.

## Approaches considered

1. **Our own request + our own cards** (picked): same card shell, focus, accent and size rules as the rest of the
   feed; works whether or not Steam's Home was ever opened.
2. Read Steam's own react-query cache of the calendar: no request of our own, but it only exists after Steam's
   Recommended tab has loaded, which Spotlight Home replaces.
3. Embed Steam's calendar component: Steam's look, not ours, and fragile across Steam updates.

## Builder's calls (Michael can overrule)

- Owned games are left out (a calendar of things to discover).
- The focused game shows its name at the bottom of its card (as the deal cards do); unfocused cards are art only.
- The setting sits next to "Wishlist deals" in both the Quick Access panel and the menu's Game Glance page, as
  "Recommended row: Play next / Personal calendar".
- Each card carries the game's name for screen readers.

## Non-goals

Steam's calendar filters (hide early access, wishlist display), the "tag" categories, a calendar on other tabs.

## Shipping

Built with tests, sent to the PS5, not committed until Michael asks.
