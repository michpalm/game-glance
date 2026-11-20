# Library page and page kit — design

Status: draft for Michael's review (2026-11-19). Mock-up: `~/Documents/Claude/Bazzite/page-mockups/library-L11.png`.

## Why

Steam's Big Picture Library is a browser: many tabs and filters, and every game opens the same way. Game Glance's
identity is "focus is games": what you see about a game at a glance. Michael wants the Library to keep that feeling:
see a lot of your games, and see what matters about the highlighted one without opening it. It is console-first:
few presses, tabs on L1/R1, and A always opens the game page (the place to play from).

The Library is also the first of three new pages (then Settings home S2b, Media M1 → M3b → M4). Downloads and Storage
already share one look, but by copying a stylesheet (`downloadsStyles.ts` is `storageStyles.ts` under a new prefix).
So the Library is built together with a **page kit**: the shared parts, written once, that the next pages reuse.

## Goals

- Game Glance's Library replaces Steam's tabbed Library everywhere it opens (Steam's menu, Home, Navigate).
- Layout L11: the highlighted game's hero across the top with "Library" in its corner and its facts grouped; tabs
  between the hero and the covers; two dense rows of covers visible (26 at 1920 wide), scrolling down for more.
- The highlighted game's facts, all real, grouped:
  - **Progress:** achievements (13 of 78, bar); story (played vs HowLongToBeat's main story, "43 of 57 h", bar).
  - **Facts:** played, last played, on disk, ProtonDB.
  - **Collections:** the game's user collections as small pills.
- A on a cover opens the game page. No Play button anywhere on the page.
- A page kit (styles + thin components) that Library uses and Settings home / Media will reuse.

## Non-goals

- Moving Storage and Downloads onto the kit. That is a separate later step, after the kit is checked on the device.
- Steam's Library extras: filters, search, managing collections, the Soundtracks tab. They stay one button away in
  Steam's own Library (see Fallbacks).
- Showing player counts, descriptions or deals on the Library. Only the facts listed above.

## Anti-goals

- Never an invented or placeholder figure: a fact Game Glance doesn't know is left out, not guessed.
- The tabs never cross the hero art.
- The page never blocks or breaks Steam's game page, Home or Downloads routes.
- No wordy single strip of text (L6's problem): facts stay in their groups.

## Constraints

- Steam's routes (read from `steamui/sp.js` on the PS5, 2026-11-19). Big Picture's top-level switch, in order:
  `/library/downloads` (ours already), `/library/home` (Home), `/library/app/:appid` (game page),
  `/library` (non-exact: the tabbed Library, also `/library/tab/:id`, `/library/collections`,
  `/library/collection/:id`). Patching `/library` with `routerHook.addPatch` therefore takes the tabbed Library only.
- Same takeover shape as `src/patches/downloadsPage.tsx`: wrap Steam's route child in a gate, never throw.
- Steam's `DialogButton` rules are long class chains; our button rules need matching weight (see Kit).
- Units are 1920-wide mock-up pixels via `unit()` / `--gg-d`, as Storage and Downloads.
- Probes stay read-only; device reloads only with no Game Glance page or menu open.
- Works on the PS5 (TV), Ally and Deck; the size factor (TV .88 / handheld .94) applies as on the other pages.

## Approaches

**Kit.** (1) Shared styles + thin components — **chosen**: one stylesheet for the parts every page shares, small React
components on top, each page keeps only its own layout. (2) Components only — keeps the CSS copying that is the actual
problem. (3) No kit, extract after the first page — how Downloads became a copy of Storage.

**Placement.** (A) Replace Steam's Library via the `/library` route patch — **chosen** by Michael: one Library,
console-first. (B) A separate Game Glance page — lower risk, but two Libraries and Steam's buttons still go to Steam's.

## Design

### 1. Page kit (`src/pageKit/`)

- `pageKitStyles.ts`: `tokenCss('.gg-pk')` plus the shared rules, scoped under `.gg-pk`:
  - frame: full-screen root, backdrop image + shade, page padding, title (46 units, top-left at 96/66);
  - glass tile and list row (idle edge/tint from `IDLE_TILE`, strong glass and `focusRing('menu')` on focus);
  - eyebrow, bar (track + fill, accent / ok colours), pill (neutral glass, active = white with dark text);
  - tabs row with L1/R1 bumper glyphs;
  - button weight: rules written once as `.gg-pk button.gg-pk-<part>.DialogButton`, so any page using a kit part
    wins over Steam without its own long selectors.
- Components: `PageFrame` (root, backdrop, shade, title, B = back, footer action descriptions), `Tabs` (L1/R1 cycling,
  active tab, counts), `Bar`, `Pill`, `Eyebrow`, `Fact` (label over value). Pages compose these and add their own
  layout classes.
- Injected once (like the other page styles). Storage and Downloads keep their own styles for now.

### 2. Route takeover (`src/patches/libraryPage.tsx`)

- `routerHook.addPatch('/library', …)` wraps Steam's child in `LibraryGate({ native })`.
- The gate shows Game Glance's Library when all hold:
  - the "Library page" setting is on (new, default on, in Game Glance's settings next to Home's);
  - the library data is readable (`collectionStore` present with the all-games collection);
  - the path is `/library`, `/library/tab/<a tab we show>`, `/library/collections` or `/library/collection/:id`
    (the last two open our Collections tab, or that collection's tab);
  - the user hasn't chosen "Steam's library" in this visit (see Controls).
- Steam's tab ids (from `sp.js`): `AllGames` → All games, `Installed` → Installed, `Favorites` → the Favorites
  collection's tab, `Collections` → Collections, `DesktopApps` → Non-Steam (when shortcuts exist). `/library` alone →
  the remembered tab, else Recently played.
- Anything else gets Steam's element unchanged: `/library/tab/Soundtracks` (Game Glance's Soundtracks tile uses it),
  `GreatOnDeck`, `RemotePlay`, `Xbox`, `PS4`, `PS5`, `VR` and any id Steam adds later.

### 3. Layout (L11, units at 1920 × 1080)

- **Hero:** the highlighted game's hero full-bleed, top 560 units, fading into the page backdrop at its bottom edge;
  a left-side shade that fades with it (no hard edges, as fixed in the mock-up). The art comes from the existing hero
  resolver (custom art first), the logo from the existing logo resolver; a dark logo gets the same lift Home uses.
  No hero art → the header art, then the cover, blurred, as the backdrop (as Home falls back).
- **Title** "Library" top-left (96, 66), over the hero.
- **Logo** at (96, 150), max 420 × 130. No logo → the game's name as a heading.
- **Facts row** at y 318: Progress (two bars, 330 wide) at x 96; Facts (2 × 2, 210 apart) at x 476; collection pills
  at y 470.
- **Tabs** at y 552, x 96; **covers** from y 610: 120 × 180, 14 apart, 13 per row; the grid scrolls vertically, the
  hero and tabs stay put.
- Footer actions (Steam's footer): A Game page, X Sort, Y Options, B Back.
- Text is English, inline, as on Storage and Downloads (`src/i18n` holds only Steam's own strings).

### 4. Tabs

In order: **Recently played** (games with a last-played time, newest first), **All games · N**, **Installed · N**,
then the user's non-empty collections in Steam's order (skipping Steam's "Uncategorized" and "Locally Installed
Games", which duplicate other tabs), **Non-Steam · N** when shortcuts exist, and **Collections** last (one tile per
collection with its count; A opens it as a tab). L1/R1 move one tab, stopping at the ends (as Steam's tabbed pages and Home's feed tabs, `tabForButton`); D-pad up from the first cover row
focuses the tabs. Counts come from Steam's collections, as in the mock-up.

### 5. Controls

- **A** on a cover → `/library/app/:appid` (Steam's game page, i.e. Game Glance's game page).
- **X Sort** cycles: Last played, Name, Playtime, Size on disk. Remembered per tab for the session.
- **Y Options** opens a small menu: Sort (same choices), **Steam's library** (shows Steam's element in the gate until
  the page is left), Back.
- **B** goes back as Steam's Library does.
- **Coming back** from a game page returns to the same tab, sort, scroll position and highlighted cover (kept in
  module state for the session, since the page unmounts while the game page is open).
- "Steam's library" lasts while you stay in the Library or a game page opened from it (`/library`, `/library/tab/…`,
  `/library/collection(s)…`, `/library/app/…`); going anywhere else (Home included) resets it.
- Moving the highlight updates hero and facts after it settles (150 ms) with a short cross-fade, so holding the D-pad
  doesn't flicker art.

### 6. Data

- Lists and counts: `collectionStore.allGamesCollection`, `localGamesCollection`, `userCollections` (read-only).
- Per game from `appStore.GetAppOverviewByAppID`: name, playtime (`minutes_playtime_forever`), last played
  (`rt_last_time_played`), size on disk (`size_on_disk`, installed only), Deck category (not shown now).
- From Game Glance's existing caches/lookups: achievements (`ach:` / details memo), HowLongToBeat main story (`hltb`),
  ProtonDB tier (`protonGames`).
- **Warming:** when a tab opens, warm the highlighted game first, then the visible covers and the next row, with the
  existing `warmup.ts` helpers, their TTLs and Home's delay rule. Nothing new is fetched that Home doesn't already fetch.
- **Unknowns:** no achievements → no achievements line; no HowLongToBeat → no story line (if both are missing the
  Progress group is left out); not installed → "On disk" is left out; no ProtonDB → left out; no user collections →
  no pills. A fact cell is never shown with a dash or placeholder.

### 7. Covers and scale

- Covers from the existing capsule art helpers (custom portrait art first, Steam's `library_capsule_filename`, then
  the header as a last resort). A game with no art shows its name on a neutral tile.
- All games can be 500+: only rows near the viewport mount (simple row windowing); images load lazily.

### 8. Fallbacks

- Any error rendering the page → the gate's error boundary shows Steam's Library for that visit and logs it.
- If Steam renames `/library` or changes the route shape, the patch leaves the route as Steam built it (as Downloads).

## Left to the builder

- Exact component props, file split inside `src/pageKit/` and `src/library/`, and class names.
- How the windowing is done (no new dependency).
- The cross-fade timing within the existing motion tokens.

## Calls I made (for Michael to check)

1. A "Library page" on/off setting, default on (Downloads has none; a full Library takeover seemed to need one).
2. Hidden tabs: Steam's "Uncategorized" and "Locally Installed Games"; a Non-Steam tab only when shortcuts exist.
3. Sort choices: Last played, Name, Playtime, Size on disk.
4. `/library/tab/Soundtracks` and unknown tabs keep Steam's page.
5. The highlight settles 150 ms before the hero changes.
6. Steam Deck status and players-now are not shown (not in L11's groups).

## Testing

- Unit: tab list building (order, hidden collections, counts), sorting, fact formatting and the unknown rules, the
  gate's decision table, story bar ratio, kit CSS inventory (every kit part scoped under `.gg-pk`).
- Device (PS5 first, then Ally/Deck): open from Steam's menu, Home and Navigate; L1/R1; A → game page and B back to
  the same cover; Y → Steam's library; Soundtracks tile still Steam's; scrolling All games (530); a game without HLTB.
