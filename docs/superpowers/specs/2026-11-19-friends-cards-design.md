# Friends cards, game first — design

Status: written 2026-11-19 for Michael's approval. Mock-ups: `~/Documents/Claude/Bazzite/friends-mockups/A1.png`,
`A2.png`, `A3.png` (painted on a real PS5 frame of Home's Friends tab). **Picked: A3.**

## Why

The Friends tab's cards (Home, raised sheet, row 1) are 230 × 260 and mostly empty: one picture (the cover of the game
a friend plays or last played, else their avatar blurred), the name and one line. Michael wants the card used better,
with more to read at a glance for a friend in game, online, or offline. The tab answers "can I play with someone right
now?" first, then "what have my friends been up to?".

## Goals

- A friend **in game** stands out and says what they are doing, for how long, on what, and whether you can join.
- A friend **online, not playing** and a friend **offline** each say something useful: when they were last on, what
  they last played, what they achieved.
- Something from each friend's **activity** (an achievement unlocked in their last session) when Steam provides it.
- Every line hides when Steam has nothing for it; no "Unknown", no empty boxes.

## Non-goals

- No new data from outside the Steam client (no web API key, no scraping): playtime totals, games in common and
  achievement percentages stay out.
- No change to the second row (Trending among friends), the tab bar, or what A does on a card (join / game page /
  store, as today).
- No friend profile page or mini-profile (level, badge, background): possible later, not this change.

## Anti-goals

- Not a busier card: at most five text lines on a single card; the art never carries text over a face or logo.
- Never a guess presented as fact: a time or device we are not sure of is left out, not approximated silently.
- Not slower Home: nothing here may block Home's first paint or make each tick re-read more than today.

## Approaches considered

- **A, game first** (picked): the game leads. Three versions were mocked up:
  - A1, art band: wide game art across the top, avatar on its edge, details on glass below. Same card for everyone.
  - A2, full art: the tall cover fills the card, details on a glass panel. Most colourful, but friends with no known
    game are mostly empty again.
  - **A3 (picked): A1's card for everyone, and a double-width card with the hero art for each friend in game.**
    Michael: "who can I play with right now" first. Cost: one fewer card fits per friend in game.
- B, person first (big avatar, profile background, level): not picked; the game becomes a small line.
- C, smaller cards, more of them: not picked; loses the art.

## The design (A3)

### Order and sizes
- Row order stays as today: in game, online, away, offline (offline by last seen online, newest first).
- **In game:** a double card, width = two single cards plus the gap between them (2 × 230 + gap), same height (260).
- **Everyone else:** the single card, 230 × 260, A1 layout.
- The number of cards shown stays the limit it is today (10); a double card counts as one friend.

### Double card (in game)
- Background: the game's hero art (artwork.heroUrls), darkened from the left so the text reads, fading at the bottom.
- Top left: avatar 72, green ring. Top right: **JOIN** pill when joinable (today's join url), else **IN GAME**.
- Lines, from the name down:
  1. Name (bold, larger).
  2. "Playing {game}" in the in-game green.
  3. The game's **status line** (Steam's rich presence display string, e.g. "Hole 7 · Pirate Cove") — when the game
     sends one.
  4. **"{n} min · {device}"**: time in game and device — each part only when known (see Data).
  5. Bottom: trophy + **latest achievement** "{name} · {how long ago}" — when known.

### Single card (online, away, offline; A1)
- Top band (≈150 of 260): the game's wide art (the last played game's header art). Offline: greyscale, dimmed.
  No known game: the avatar, blurred and dimmed (as today's backdrop), so the band is never empty.
- Avatar 64 on the band's bottom edge, with today's ring (green online, blue away, none offline — avatar greyed).
- Lines under the band:
  1. Name.
  2. Status, coloured: "Online" (green), "Away" (blue), "Last online 3 days ago" (grey).
  3. "Last played {game} · {when}" / "Played {game}" — when known.
  4. "{session length} session" — offline, when known.
  5. Bottom: trophy + latest achievement, or "{n} achievements · last session" when there were several.

### Data (what is known, and how sure)
| Item | Source | Sure? |
|---|---|---|
| Name, avatar, state, game, join | today's `readFriends` | yes |
| Last online | `persona.m_rtLastSeenOnline` | yes |
| Last played game | `m_nAppIDLastSeenPlaying` + Game Glance's cache | yes when known (as today) |
| Last played **when** | `friend.m_dtLastSeenPlaying` | **spike**: confirm it is a time and when it is set |
| Game status line | the friend's rich presence (`steam_display`, localised) | **spike**: find Steam's own read path (how its friends list shows it) |
| Time in game / session length | Game Glance's own record: the time it saw the friend start / stop playing (the plugin runs while Steam runs, not only while Home is open) | shown only when Game Glance saw the start since Steam started; otherwise left out |
| Device | `persona.m_eGamingDeviceType` (seen: 0, 1, 544 on the PS5) | **spike**: map the values from Steam's own code; show only mapped ones |
| Latest achievement / achievements last session | Steam's activity feed service (`UserNews.GetUserNews`, as Achievement Sets calls a service) | **spike**: confirm it returns friends' achievement unlocks, with game, name, time |

**Spike first.** The build starts with a read-only investigation of the four "spike" rows, done by reading Steam's own
code (sp.js) first, and calling a service only the way Steam itself calls it (CEF probes stay read-only otherwise —
an unknown call crashed Steam before). Any row the spike cannot confirm is dropped from the card, and the design still
holds without it.

### Behaviour
- Focus, A, the confirm before joining, and the second row work as today.
- Activity (achievements) is fetched at most once per friend per few minutes, in the background, cached in memory;
  the card shows without it and gains the line when it arrives. It never delays Home.
- A friend going in game turns their card double in place; focus stays on that friend.

## Constraints

- Sizes in Game Glance units (`u()`), as the rest of Home. Card heights stay 260 so the sheet's rows keep their layout.
- Text through `tr()` (i18n) as the existing lines are.
- Reload rules: never with a Game Glance page or menu open.

## Left to the builder

- Exact type sizes, gradient stops, line spacing within the card, and truncation (one line each, ellipsis).
- How the double card is placed in the row's focus grid (it is one focusable card).
- Whether the session-time record lives with the last-games cache or alongside it.

## Spike findings (2026-11-19, PS5, read-only)

- **Status line — confirmed.** `persona.GetCurrentGameRichPresence()`, the method Steam's own friends list uses
  (localised `steam_display`; '' when the game sends none). Read inside try/catch like `GetCurrentGameName()`.
- **Last played when — confirmed.** `friend.m_dtLastSeenPlaying` is a JS `Date` Steam sets in `SetLastSeenPlaying`
  when it sees the friend stop playing (memory only, since Steam started; undefined otherwise).
- **Device — dropped.** `persona.m_eGamingDeviceType` is a bare number; Steam's code has no labels for it and never
  shows a friend's device. The card shows no device.
- **Achievements — confirmed, per game.** Steam's game-page Activity store `window.appActivityStore`:
  `m_mapAppActivity.get(appId).m_mapActivityByDay` → each day's `m_mapAchievementsByUser` (keyed by the friend's
  **account id**, `friend.m_unAccountID`) → an event `{ rtEventTime, m_rgAchievements: [{ strName, strDescription,
  strImage, flAchieved, rtUnlocked, bAchieved }] }` (seen: samiafro, Golf With Your Friends, 4 unlocks).
  Steam fills it with `appActivityStore.FetchLatestActivity(appId)` — called by Steam itself with just the app id
  (game page 500 ms after opening and on a timer, app exit, screenshots); it skips apps already requested.
  So a card's achievement line is **the friend's unlocks in the game on the card** (playing now / last played).
