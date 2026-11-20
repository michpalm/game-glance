# Player count pill — design

Date: 2026-11-12. Status: written, awaiting Michael's review.
Mockups: `player-count-options.png` (in Michael's Bazzite folder; option A chosen), painted on the real Witcher 3 game page.

## Goal

Show how many people are playing a game right now as one of Game Glance's pills, on Home and on the game page, for
every user. When the PlayCount plugin is installed, Game Glance's pill takes the place of PlayCount's white badge and
opens PlayCount's own chart. The number is warmed up on Home, so it is there as the page opens, and refreshed on the page.

## Decisions (Michael, 2026-11-12)

| Question | Answer |
|---|---|
| Who sees it | Everyone. PlayCount is not required. |
| Toggle | "Player count" in Game page settings, beside the store and family pill toggles. On by default. |
| Toggle off | Game Glance shows no player pill. PlayCount (if installed) looks exactly as it does today. |
| Toggle on, PlayCount installed | PlayCount's badge is hidden on the game page; our pill opens its chart. |
| Look | Option A: the family pill's glass, a live green dot, the full number: "20,663 playing". |
| Placement | In the pill row, leftmost (right to left: store, family, players). Moves above the pills when the row would pass the right-hand stat card's left edge. |
| Home | Shown for the focused game, same fit rule, display only. |
| Data | Game Glance fetches the count itself from Steam (approach 1), not from PlayCount. |

## Data

**Source.** `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=<id>` through Decky's
`fetchNoCors`, as ProtonDB is fetched. No key. The answer is `{ response: { result: 1, player_count: n } }`; any other
shape, a non-200 status, or `result !== 1` reads as "no count".

**Which games.** Steam apps only. A non-Steam shortcut has no count (Steam has none; PlayCount shows none either).
No pill for it.

**Module.** `src/data/playerCount.ts`, built like `createProtonLookup` (`src/data/protondb.ts`): injectable `fetcher`,
`cache`, `now`, `timeoutMs`; one request in flight per app id; a failed request never replaces a known count and is never
cached. Exposes `lookup(appId)` (cached answer at once, refreshed behind when due), `cachedOnly(appId)` (Home's first
paint, never online) and `prefetch(appId)` (the preloads).

**Freshness.**
- Cache entry: `{ count, fetchedAt }` in the existing data cache, kept a day (an old number still shows at once).
- Due for refresh: on Home, when older than 5 minutes; on the game page, when older than 1 minute.
- Home warm-up: when the focused game settles (the moment ProtonDB is asked), its count is fetched if due. The other games
  in Home's row join the existing background preload (`useWarmup` / `prefetchGame`), one request each, at its pace.
- Game page: shows the cached count at once (the open transition carries Home's pill across), fetches if older than a
  minute, then every 5 minutes while the page stays open (PlayCount's own interval). A new number swaps the text in place.
- No answer: the last count stays. No count ever: no pill; the row is as today.

**Hook.** `usePlayerCount(appId | null, { maxAgeMs, pollMs? })` returns `number | null`, used by Home (`maxAgeMs` 5 min)
and the game page (`maxAgeMs` 1 min, `pollMs` 5 min).

## Look and layout

**Pill.** Same holder as the store and family pills (`SourcePill`'s unglazed, `preserve-3d` holder; see the 2026-11-12
family pill frost fix), so it is frosted in either position. Classes: `gg-players` (page), `gh-players` (Home),
`gh-x-players` (open transition copy). Content: a green dot (`#5fd38d`, soft glow, 0.55 em) and
`${count.toLocaleString(locale)} playing`. Same height, type, radius, edge and glass as the family pill (`sourcePillLook`).

**Order.** Right to left: store pill, family pill, player pill, 10 px apart (the family pill's gap). With the store pill
off, the family pill takes its place (existing `bare` rule) and the player pill follows it; with both off, the player
pill sits at the store pill's place.

**Fit rule.** Let `limit` be the left edge of the right-hand stat card below the row (the page's and Home's right card
column). If there is no right-hand card, `limit` is where that column would start (from the page layout constants). The
player pill stays in the row while its left edge is at or right of `limit`; otherwise it moves **above** the pills:
right-aligned with the store pill's right edge (or the holder's, when the store pill is off), 10 px above it (mockup B).
- Measured in script, not CSS (the number's width varies): one `ResizeObserver` on the holder's pills and the card,
  setting `data-players="row" | "above"` on the holder. Recomputed when the count text changes, a pill appears or goes,
  or the layout resizes.
- Home and the page compute it the same way, so the open transition's copy (`.gh-x-players`) starts and lands in the
  same place, and is measured with the store and family pills (`pillOpen.ts`).

## Behaviour

| | PlayCount installed | No PlayCount |
|---|---|---|
| Home | Display only | Display only |
| Game page | D-pad stop in the Play row (like the family pill); A or a tap opens PlayCount's chart | Display only, no D-pad stop |

**Opening PlayCount's chart.** PlayCount's badge (`.playerBadge > button`) stays in the page but hidden
(`visibility: hidden; pointer-events: none`), as Unifideck's store switch is (`GameSourcePill`). Our pill's press
dispatches a click on that button; PlayCount then opens its own `PlayerStatsModal`. If the badge isn't there (PlayCount
not loaded yet, or its layout changed), the pill is display only for that page.

**Detecting PlayCount.** The badge's presence on the page (`.playerBadge`) is what matters, not the plugin list: no badge,
nothing to hide or press. The hide rule is CSS scoped to the game page while our pill shows, so turning the toggle off
puts PlayCount's badge back at once.

**Launch.** The launch overlay already hides other plugins' page badges by where they sit (`launchTargets`); the
player pill is ours and is hidden with the store and family pills there.

## Settings

`playerCountPill: boolean` in `src/data/settings.ts` (default `true`), with `setPlayerCountPill`, beside `storePill` and
`familyPill`; shown in the Game page settings with the other pill toggles: label "Player count", description
"How many people are playing now, from Steam."

## Testing

- `tests/data/playerCount.test.ts`: parses the answer (good, `result` 42, missing count, non-200, thrown fetch); cached
  answer returned at once; refresh only when due (5 min / 1 min); a failure keeps the known count; one request per app in
  flight; shortcuts never asked.
- Fit rule as a pure function `playersPlacement({ pillLeft, limit })` with tests for in-row, above, no card, store off.
- `SourcePill` structure: the player pill is a sibling of the face, inside the unglazed holder.
- CSS: the player pill takes the family pill's look; `[data-players="above"]` places it above, right-aligned; PlayCount's
  badge hidden only while the pill shows.
- On the Ally: Witcher 3 (pill goes above), a game with a short title row and no family pill (stays in the row), a
  shortcut (no pill), PlayCount's chart from our pill, toggle off (PlayCount's badge back), Home → page with the number
  carried across, and a refresh while the page is open.

## Out of scope

- Game Glance's own chart or history (PlayCount's chart is used when installed).
- Player counts on the store page or in the library grid (PlayCount's own features stay as they are).
- Showing a count for shortcuts or non-Steam stores.
