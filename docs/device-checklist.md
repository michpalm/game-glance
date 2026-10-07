# Device checklist

Run this after a Steam client update, a Bazzite update, or a plugin reinstall. It takes about ten minutes.
Most items need only the handheld; the TV items need it docked.

If something looks wrong, first turn **Quick Access → Game Glance → Game Glance page** off and on.
Off must give Steam's stock page. If stock is fine and the redesign is broken, the plugin needs a fix; if the
redesign is simply missing (stock page with the switch on), Steam renamed something the theme depends on. The
theme turns its layout off by design rather than breaking the page.

## Last full check

- **Date:** 2026-10-02
- **Steam client:** 1788652215 (built Sep 1 2026)
- **Bazzite:** 44.20260929.0, kernel 7.2.7-ogc1.1
- **Decky Loader:** v3.2.9 (HLTB for Deck not installed; it is replaced by this plugin)
- **Plugin:** commit `0cae3b1` plus later commits (see `git log`)

## Open checks before 3.0.0

Still to verify on a device before the `release/2.1.0` pull request (the 3.0.0 release) goes to `main`:

- [ ] **Unifideck game page** (row 74): a Unifideck game's page, not installed and installed, with and without
  Spotlight Home.
- [ ] **Updater install** (row 77): install the "updater test" build (the same code, but it reports version 1.9.9),
  open Quick Access → Game Glance → Updates: "2.0.0 is available"; Update must show Decky's prompt and install the live
  v2.0.0 release (its zip is named `game-glance-v2.0.0.zip`, which the updater now accepts). Then reinstall the latest
  test build.
- [ ] **Clean look, handheld** (row 79): docked passed.
- [ ] **Status bar** (row 80): the bar stays in one place and the dot sits exactly where Steam's profile picture appears
  (`statusPlacement` in `src/home/statusItems.ts`: Steam's top bar always draws the avatar's centre 36 css px from the
  right edge and 20 down, so nothing is measured; probed live on the Ally at 828x466, 1280x800, 1500x844 and 1920x1080).
  Check it never moves, and that moving up into Steam's top bar the picture takes the dot's place.
- [x] **New to library** (row 78), **Fast L1/R1** (row 43): passed.
- [x] **Controller button on Home** (row 71): skipped for this release.

## Checklist

Result per item: PASS, FAIL (with a note), or "not checked yet".

### Game page (handheld)

| # | Check | Expected | 2026-10-02 |
|---|---|---|---|
| 1 | Open a Steam game you are partway through (The Witcher 3) | Full-screen art with logo; Play row and cards at the bottom; tabs (Activity, Your stuff…) only after pressing down | PASS |
| 2 | Play row | Green pill Play button with a white triangle; round controller, settings and cloud buttons, all 10 px apart; cloud last | PASS (measured 10/10/10) |
| 3 | Cloud icon colour | Green when synced; yellow while syncing; red on a sync problem; grey offline | Green PASS; others not checked yet |
| 4 | A game with a "Play from" arrow (NORCO) | Arrow is a small triangle inside the right end of the pill, centred | PASS |
| 5 | Info card | Played time, Achievements (Steam games), description in your Steam language | PASS |
| 6 | HowLongToBeat card | Main / + Extras / 100% times; next unreached tier in green; bar; "33.1 h left in main story" | PASS (caption text changed after the check: re-check) |
| 7 | An unplayed game | "Not played yet" under the times | not checked yet |
| 8 | A game past its last HowLongToBeat time | Full bar, "Past … time" | not checked yet |
| 9 | Store pill | Store icon and name: Steam, GOG (Heroic), Battle.net (Unifideck)… | PASS |
| 10 | A Heroic game (Chained Echoes) | Pill "GOG", description from Heroic, no cloud gap | PASS |
| 11 | Press Play | Steam's launch screen appears; game starts. (Steam moves focus to its launch screen, so Cancel is not reachable: same as stock Steam.) | PASS |

### Controller

| # | Check | Expected | 2026-10-02 |
|---|---|---|---|
| 12 | Left / right on the Play row | Play → (Play from) → controller → settings and back | PASS |
| 13 | Down from the Play row, then up | Down goes to the tabs on the next screen; up returns to Play at the top | PASS |

### TV (docked, 1080p)

| # | Check | Expected | 2026-10-02 |
|---|---|---|---|
| 14 | Game page on the TV | Same design about 1.5× larger, Play row and cards at the bottom; Steam lays out the TV at 1500×844 | PASS |
| 15 | Controller on the TV | As 12 and 13 | PASS |

### Quick Access → Game Glance

| # | Check | Expected | 2026-10-02 |
|---|---|---|---|
| 16 | With a game page open | Game name and "Automatic: HowLongToBeat #…"; the name matches the page you came from | PASS (once showed the previous game, not reproduced since; note when and how if seen) |
| 17 | Wrong or missing match | Paste the game's HowLongToBeat link → "Use this game" fixes it; "Remove override" goes back to automatic; pasting the game's own Steam ID is refused | PASS |
| 18 | "Pre-load game info for installed games" | Button shows "Stop (n / total)"; ends with "Game data for N games found." | not checked yet |
| 19 | "Pre-load new games automatically" | On by default; a newly installed game shows its times offline after 30 minutes | not checked yet |
| 20 | "Clear cached data" | Toast; the next page open fetches again | not checked yet |
| 21 | "Game Glance page" off / on (called "Redesigned game page" before 2.0) | Stock page / redesign | PASS |

### Offline (airplane mode)

| # | Check | Expected | 2026-10-02 |
|---|---|---|---|
| 22 | A game that was pre-loaded | Times and description still shown | not checked yet |
| 23 | A game never opened or pre-loaded | Page renders; "HowLongToBeat unavailable"; no description | not checked yet |

## Spotlight Home (2.0.0)

Everything in this section is "not checked yet": it has not had a full device pass.

**If Spotlight Home looks wrong:** turn **Quick Access → Game Glance → Spotlight Home** off. Steam's stock Home
must come back at once. If stock is fine, the plugin needs a fix; note what you saw and the steps.

Result per item: PASS, FAIL (with a note), or "not checked yet". Handheld unless a row says docked.

### Toggles

| # | Check | Expected | Result |
|---|---|---|---|
| 24 | Game Glance page on, Spotlight Home off | Exactly the 1.1.1 game page and Steam's stock Home | not checked yet |
| 25 | Both on | Spotlight Home, and the game page restyled to match the design handoff: accent eyebrow, 64 px title, Play pill 340x60 and 60 px circles with the row's top at screen height minus 386, cards at height minus 290, the HLTB MAIN value always in the accent, no chevron at the bottom, and the store pill (icon and name) kept at the right of the Play row | not checked yet |
| 26 | Game Glance page off, Spotlight Home off | Steam's stock game page and stock Home | not checked yet |
| 27 | Game Glance page off, Spotlight Home on | Spotlight Home, with Steam's stock game page | not checked yet |

### Home: focus and navigation

| # | Check | Expected | Result |
|---|---|---|---|
| 28 | Open Home | Focus is on the first game's Play pill; the first recent card is the selected (wide) one | not checked yet |
| 29 | D-pad order | Actions (Play and buttons), tabs, feed, in that order with Up and Down; the recents row is skipped (it never takes focus). Up from the tabs lands on Play. Left and Right on the action row move between Play and the small buttons only; Left from Play stays put and never changes the game | not checked yet |
| 30 | Selected card | The wide card shows the whole landscape art, including custom art (SteamGridDB); nothing cut off | not checked yet |
| 31 | L1 / R1 on the action row | Focus moves to the Play pill from any button (controller, gear, info, cloud). R1 selects the next game, L1 the previous: hero, title, chips and Play change and the row slides to follow. R1 past the last game lands on the Library card (an Open Library pill, hero stays on the last game); R1 again wraps to game 1; L1 from game 1 goes to the Library card, then the last game. Works from Play and from the small buttons (from a small button onto the Library card, focus moves to the Open Library pill). Holding a bumper keeps stepping at a steady rate, without focus jumping, and stops at the Library card (R1) or game 1 (L1) | PASS (Ally, 2026-10-06) |
| 32 | Loop preview and the card row | Games after the Library card fade out toward the right edge. Tapping or clicking any card (game, Library card, preview) does nothing. While the card row has focus only the selected card (or the Library card) is highlighted: a thin white ring just outside it and an accent glow even on all four sides, nothing along its bottom edge; with focus elsewhere it looks as before | PASS (Ally, 2026-10-06) |
| 33 | B button | From the feed: back to the tabs; from the tabs: back to the game cards; from the action row: back to the game cards; from the game cards: stock behaviour | not checked yet |
| 34 | L1 / R1 in the tabs and feed | Switch tabs, from the tabs and from inside the feed (the selected game does not change) | not checked yet |

### Home: feed

| # | Check | Expected | Result |
|---|---|---|---|
| 35 | Friends tab header | Small icon and the number of friends online. Faded grey with 0; online green (not the game's accent colour) with anyone online, away or in game. It changes within about 2 s when a friend comes online or goes offline while Home is open | not checked yet |
| 36 | Friend cards | In game: "Playing {game}" with the game's art and a green ring. Online: green ring and status. Away: blue ring (the same blue as Steam's friends menu), and "Last played {game}" with that game's art if the game is known (for example, they were seen playing earlier), else "Away". Offline: no ring, dimmed picture, "Last played {game}" with art if known, else "Last online ...". Changes (a friend starting a game, going away) show within about 2 s Pictures are small squares with slightly rounded corners (as in Steam), framed by the presence colour. | not checked yet |
| 37 | What's new card | Opens that news update | not checked yet |
| 38 | Wishlist deal card (only with Show wishlist deals on) | Opens the game's store page. With the setting off, no deal cards and no network request for the wishlist | not checked yet |
| 39 | Play next cards | Installed games not started or short; not the games already in the first recents | not checked yet |
| 40 | Wishlist set to private | The wishlist shelf hides; Play next still shows; no error | not checked yet |

### Home: look and motion

| # | Check | Expected | Result |
|---|---|---|---|
| 41 | Open to details: the info button, A on a game card and a feed card | The game page opens with the expand transition from the selected card (or the pressed feed card); B returns to Home, focus back where it was. A on the Library card opens the Library. Touching or clicking a recents card does nothing | not checked yet |
| 42 | The info button pressed twice quickly | Opens once; no overlay left behind | not checked yet |
| 43 | Switch speed and smoothness | Tap and hold L1/R1: the hero crossfades in about a quarter second, the cards slide and widen without stutter, the accent colour follows at once; rapid presses never pile up fades (the art always shows the latest game within about 0.3 s). The feed sheet still rises at its old pace. Compared with build 75a3f40, holding L1/R1 through many games should feel smoother: only the selected card and its neighbours draw a blurred base, the HLTB chip updates once the selection rests (about a quarter second), and the accent colour (Play pill, bars) starts changing on the step itself for every game (colours are looked up ahead of time), never a beat after stopping. If anything stutters, note which part (hero, cards, colours) | PASS (Ally, 2026-10-06) |
| 44 | Card size, docked vs handheld | Recents cards are 1.6x docked and 1.6x handheld (the most the layout above the cards allows: 28 logical px under the action row); no slide when Home opens. "Docked" is decided by the same TV check as the game page: Home's measured size at least 1.7x the Ally's handheld layout (828x466), so only a 1080p-class TV counts. A Steam Deck's 1280x800 handheld screen (1.55x) is not docked and gets card scale 1.5 (see 52) | not checked yet |
| 45 | Title lengths and the Library card | Step through games with short and long (2-line) titles and onto the Library card with R1: only the title changes height (it grows upward); the eyebrow (now between the title and the chips), the chips and the Play row stay exactly in place. A very long title stops at two lines with an ellipsis | not checked yet |
| 46 | Home with no games | Empty state with an Open Library button that has focus; A opens the Library; no error | not checked yet |
| 47 | Guard fallback | If Home shows Steam's stock screen with Spotlight Home on (for example after a Steam update): toggle Spotlight Home off and on. If it is still stock, report it, with the Steam client version | not checked yet |

### Home: actions, art, other screens

| # | Check | Expected | Result |
|---|---|---|---|
| 48 | Play pill | The pill shows Steam's own word and icon for the selected game (the same as the game page's Play button): Play for an installed game (A launches it), Install for one that is not installed, Resume while that game is running. A runs Steam's own handler for that action, with no navigation: Install starts Steam's install flow and Resume brings back the running game (nothing relaunches). Only if Steam's action module is not found does Home use its own pill: Play launches, Install and Resume open the game's page | not checked yet |
| 49 | Controller and settings circle buttons | Controller opens Steam's controller configurator for the game. The settings gear opens Steam's game menu for the selected game, at the gear: the same menu as the game page's gear (Add to Favorites, Add to, Manage > Hide / Mark as private / Uninstall..., Developer, Properties..., Cancel). Each item works (try Properties and Add to Favorites); B closes the menu and focus returns to the gear. If Steam's menu is missing, the gear opens Properties; if Steam lacks either call, the game page opens instead | not checked yet |
| 50 | Hero art, a game with custom (SteamGridDB) art (ULTRAKILL, Neva…) | The full-screen background and the portrait capsule use your custom hero and portrait art when you set them; Steam's own art otherwise (a game with only custom landscape art keeps Steam's hero) | not checked yet |
| 51 | Hero art, a non-Steam shortcut with custom art | Custom hero full-screen and custom portrait capsule; without a custom hero, the blurred-capsule fallback | not checked yet |
| 52 | Steam Deck (1280x800) parity | Same layout as the Ally, cards at 1.6x (see 44), nothing cut off; text legible at arm's length | not checked yet |
| 53 | Handheld legibility (Ally) | Card text is about 8.6 CSS px (10.5 in 1.1.1): readable at arm's length; note any text that is too small | not checked yet |
| 54 | Cold boot with Spotlight Home on | Home opens with the hero only while recents load; focus lands on the first game's card once they arrive. With an empty library the Open Library button appears and has focus | not checked yet |
| 55 | Wishlist deals, public wishlist (Show wishlist deals on) | A game that is on sale anywhere on the wishlist (not only the first items) appears in the Recommended tab's second row, biggest discounts first, at most six, with the price; A opens its store page | not checked yet |
| 56 | B from a store page, news page or game page returns to where you were | Select a later game (or the Library card) with R1, then open a wishlist deal on Recommended (store page), a news card, a feed card, and the game page with the info button, each with A; B from each lands on the same selected game, the same tab, card or action button and the same zone (no jump to game 1). A cold start (after a reboot) focuses game 1's card; so does a fresh visit to Home. Opening a game page with A on a card and pressing B lands back on that card | not checked yet |
| 57 | Play pill while a game installs or updates | Start an install or update from Steam: the pill keeps Steam's own word (Pause while downloading, Download or Update when queued or paused) and fills left to right with a lighter fill as the percent grows; no bar below it. A while downloading pauses ALL downloads (Steam's `EnableAllDownloads(false, '0')`, as Steam's own button does), and A on the paused pill resumes (Steam's `ResumeAppUpdate`); the game page is not opened and focus stays on the pill. If the percent stays 0 or the word never changes, the overview's `status_percentage` / `display_status` or the download list are not what the code reads | not checked yet |
| 58 | Store pill on Home | A pill with the store's icon and name ("Steam", "GOG", "Epic"...) sits at the right edge, level with the Play row, looking exactly like the game page's store pill; it changes as L1/R1 change the game, is absent on the Library card, and never takes focus. The chip row has no store badge any more | not checked yet |
| 59 | View/Select and Menu on the action row | With a game selected and focus anywhere on the action row, the View (Select) button opens the same game menu as the gear, at the gear; so does the Menu button. Nothing happens on the Library card, and the buttons do nothing extra in the tabs or feed | not checked yet |
| 60 | Vertical placement, docked and handheld | At rest the tab strip (labels and underline) ends just above Steam's button legend (about 20-25 px), with every gap between title, buttons, cards and tabs as before; nothing is hidden behind the legend or the top bar. Entering the tabs or feed raises the sheet to the same place as before, cards fully visible. Home fills the full width (no 5% smaller layout after opening Home). On the handheld the whole stack sits 13 logical px higher than on the TV so the tab strip ends about 18 logical px above Steam's real legend (about 41 css px tall, measured live); with the sheet raised the second-row cards end about 12 logical px above the legend line, never under it. Raised view: the gap above the recents cards equals the gap between the last feed row and the legend (about 12 logical px, 7 css px on the Ally), by a slightly higher rise (Ally +12). | not checked yet |
| 61 | Cloud button on Home, and the game page's cloud circle | Home: for a Steam game with cloud saves a fifth circle sits after info. It is green when synced, yellow while syncing, red on a problem and grey when Steam is offline; it is the same dark circle as the others and readable over bright art. It is absent for non-Steam games, games without cloud saves and on the Library card. Right from info reaches it; moving to a game without it puts focus on info. On a sync problem A opens Steam's conflict or retry dialog. Game page (both toggles on): the cloud circle has the same dark fill as the controller and settings circles, icon in the same colours | not checked yet |
| 62 | What's new, two rows | Raise the sheet on What's new: news cards on top and, below a "Recently updated" line, short wide cards with the same games as Steam's own "Recently updated on this device" shelf, newest first, each with "Updated Today at 11:22 AM" (or Yesterday / a date) and the size; A opens the game page. Both rows fully visible above the button legend, handheld, docked and on a Deck. With none: no second row, the news cards keep their size Valve runtime tools with no art (Steamworks Common Redistributables) are not listed; a card whose art is missing shows a soft accent gradient, never an empty dark box. | not checked yet |
| 63 | Recommended, two rows | With Show wishlist deals on and games on sale: Play next on top, and below an "On sale from your wishlist" line up to six short wide cards with the discount badge and the price ("$4.99 - was $19.99"), biggest discount first; A opens the store page. Setting off, a private wishlist, or nothing on sale: only Play next, at the same card size (the space below stays empty, the hero shows) | not checked yet |
| 64 | Two-row navigation | Down from the tabs lands on the first row; Down/Up move between the rows, each keeping its own selected card and scroll; Up from the first row returns to the tabs; L1/R1 switch tabs from either row; B goes to the tabs. Open a card in the second row (game page or store), press B: Home returns to that same card in the second row | not checked yet |
| 65 | Trending among friends | Friends tab: a "Trending among friends" line and small wide cards with the same games, in the same order, as Steam's own Home shelf (owned games first unless Steam shows store content on Home): "In library" tag for owned games, "-85%" with the price or "Free to play" for others, up to three friend pictures and "+N", "N friends play". A opens the game page (owned) or the store page. With Steam's list unavailable: the games friends played in the last week instead. With none at all: no line and no row | not checked yet |
| 66 | Friend card placeholder | Friend cards without game art show the friend's own picture, large and blurred, darkened, with a faint green (online) or blue (away) tint; a friend without a picture gets a soft colour gradient; never a black card. Scrolling the friends row stays smooth | not checked yet |
| 67 | Join a friend | When a friend is in a joinable game (Steam's friends list offers Join Game), their card reads "Join". A asks "Join {name} in {game}?" with Cancel selected; Join starts joining exactly as Steam's own Join Game does (for a game you don't have installed, Steam's own flow follows). A friend in a game that cannot be joined: A opens that game's page (or its store page). B or Cancel closes the question | not checked yet |
| 68 | Dark accent text | A game whose art gives a dark accent (Metro 2033 Redux: dark red): the eyebrow ("CONTINUE PLAYING ...") is lighter than the bars and Play pill but the same hue, and clearly legible; a bright accent looks unchanged; the restyled game page's eyebrow and MAIN time match | not checked yet |
| 69 | News art fitted whole | What's new: a news card with the event's own image shows the whole image (nothing cut at the sides, top or bottom) at the top of the card, over a blurred copy of it; the title and line sit under the image. The featured (first, wider) card is exactly as wide as its 16:9 image, which fills it whole with no blur at the sides, and it stays wider than the others. A news card without event art shows the game's art as before. Scrolling the news row stays smooth | PASS (Ally, 2026-10-06) |
| 70 | Play transition, from Home and from the game page | Press Play on Spotlight Home: Steam still opens the game's page for its launch screen, but the page shows only the game's dimmed art from its first frame (no title, logo, Play row, cards or tabs at any moment), then Steam's launch screen over it, then the game. Play on the game page: the text fades away when Steam's launch screen appears. Cancel or a failed launch brings the page back (at the latest after about 8 s). With the Game Glance page off, Steam's page is unchanged | PASS (Ally, 2026-10-06) |
| 71 | Controller button on Home | Press the controller circle several times, including right after Home opens and after switching games with L1/R1: Steam's controller configurator opens each time and Game Mode never crashes (one crash was reported on Reddit, not reproduced) | skipped for 3.0.0 (not reproduced) |
| 72 | Game card navigation | Home opens with focus on the first game card (highlighted). Left/Right (d-pad and left stick) select the previous / next game: hero, title, chips and buttons follow, focus stays on the cards; past the last game the Library card, then back to the first; held (stick or d-pad), it steps at the same pace as a held L1/R1 (a short pause, then about six games a second), never faster than the cards can slide, and stops at the ends. Up goes to Play, Down to the tabs (nothing with the bottom section hidden). L1/R1 from the cards or the action row select the previous / next game and put focus on Play; held, they keep going. View/Menu on the cards open the selected game's menu. A on a card opens its page | PASS (Ally, 2026-10-06) |
| 73 | Hide the bottom section (replaced by Clean Home, row 82) | The old What's new, Friends, Recommended switch, which removed the tabs for good, is gone; Clean Home keeps them reachable | superseded |
| 74 | Unifideck game page | With Unifideck installed, open a Unifideck game that is not installed, then one that is (Game Glance page on, with and without Spotlight Home). Unifideck's Play row (Install or Play, its size and last played, its round buttons) sits on the art where Steam's Play row is, with our cards under it; Install/Play is the accent pill and keeps the pill look when focused; the round buttons match ours. Unifideck's info panel starts the next screen (press down). Cancel/Stop during a download keep Unifideck's look. A Steam game's page and a non-Unifideck shortcut are unchanged | not checked yet |
| 75 | Recents count | The recents row holds the same games as Steam's own Home recent games (up to 20, not 10): step through them with the card row or R1 and compare with Steam's Home (Spotlight Home off) | PASS (Ally, 2026-10-06) |
| 76 | Hero art past the first games | Right after a reboot (so Steam has loaded few game details), step with R1 or the card row through all recents, without opening any game page: every Steam game shows its real full-screen hero art, never a blurred, zoomed-in capsule (Reddit: wrong after the first 4). Games with no hero art at all (some shortcuts) still get the blurred-capsule fallback | PASS (Ally, 2026-10-06) |
| 77 | Built-in updater | Quick Access → Game Glance → Updates shows "Version x.y.z · up to date" (or "checking…" briefly). With a newer release published (or package.json's version lowered on a test build): "… is available" and an Update to … button; pressing it shows Decky's own install prompt, Install replaces Game Glance with the new version and reloads it, settings and cached data kept. Offline: "could not check" and Check again; nothing breaks | Version and "up to date" PASS (Ally, 2026-10-06); install not checked yet: test with the "updater test" build (reports 1.9.9), which offers the live v2.0.0 release |
| 78 | New to library | With a game added to the library but never played (and Steam's own Home showing it as new): Quick Access → New to library off: Home's row is as before, no such game. On: it joins the row at the place of the date it was added (among the played games), with a small NEW badge; selected, the eyebrow reads "New to library · {when}" and the chips show Added to library (no Played / Last played); Play or Install works as for any game. Turning it off again while Home is open removes it | PASS (Ally, 2026-10-06) |
| 79 | Clean look | Quick Access → Game Glance → Clean look on (with Spotlight Home on and off): a game page shows the full art, the eyebrow and title just above one row at the bottom; the row has the accent Play pill, the controller and settings circles and, for a Steam game with cloud saves, the cloud circle at the left, and a glass card at the right with Played, Achievements (with a bar) and HLTB main (with a bar); the store pill sits above the row at the right edge. No description or HowLongToBeat cards. Down still reaches Steam's tabs on the next screen. Play, the circles and the cloud work as before; the launch screen still shows only the art. Off: the page is as before. Check handheld and docked, and a game with a long, two-line title | Docked PASS (Ally, 2026-10-06); handheld not checked yet |
| 80 | Status bar | Spotlight Home on, Quick Access → Status bar on: a glass pill at the top-right, near the right edge and not touching the top edge, shows the connection icon, the battery icon and percent, and the time. The time follows Steam's Settings → System → 24-hour clock (change it: the bar follows within a minute) and turns over on the minute. Plug in the charger: a bolt appears in the battery within a few seconds; unplug: it goes. Under 20% on battery the battery turns red. Turn Wi-Fi off (or airplane mode): the struck-through icon after Steam's connection test; back on: the Wi-Fi icon. Docked with a cable: the wired icon. Right of the pill, a dot for your own status: green online, blue away, grey invisible or offline (change it in Steam's profile menu: the dot follows within about 2 s). The bar stays in one place the whole time (it never jumps after Home opens), with the dot centred where Steam's profile picture shows. Press Up from Play into Steam's own top bar: ours fades out and never overlaps Steam's, and the picture appears where the dot was; Down or B back into Home: it fades back in. Opening Quick Access keeps it. Off: no pill, the strip is empty as before. Check handheld and docked | Docked PASS (ROG Xbox Ally, 1500x844, 2026-10-07): the dot's centre is (1464, 20) css px, exactly Steam's avatar centre; Up into Steam's bar fades ours to 0 and the picture appears where the dot was; Down brings focus back to Play and fades ours in at the same place. Handheld not checked yet |
| 81 | Unifideck play time | With Unifideck installed, open a Unifideck game that has been played (Darkest Dungeon), on our game page (info card Played, the Clean look's stats, the "Last played" eyebrow with Spotlight Home on) and on Spotlight Home (the Played and Last played chips and the eyebrow). They equal Unifideck's own Play row on the same page (Darkest Dungeon: about 1.1 h, last played today), not Steam's "0 h". A Steam game and a non-Unifideck shortcut keep Steam's numbers; Home asks Unifideck only for the selected game. With the Game Glance page on, Unifideck's own three meta items (Installed size or Space required, Played, Last played) are hidden in its Play row, whose button and round buttons stay; our info card (and the Clean look's row) shows the size with Unifideck's own label (read from its hidden row, in its language: "Installed size" / "Tamaño instalado" installed, "Space required" / "Espacio requerido" not installed; our English until read) and Unifideck's value (Darkest Dungeon: 3.2 GB), and no size item when unknown. During a download Unifideck's progress, Cancel and Stop look as before. With our page off its row is untouched | not checked yet |
| 82 | Clean Home | Quick Access → Game Glance → Clean Home on: Home shows only the selected game, its buttons and the recents row, no tab strip, and the stack sits lower so the recents row ends where the tab strip did (handheld and docked). Down from the games or the action row moves focus into the tabs: the sheet rises and the tabs fade in, and the tabs and feed cards are fully visible and work as ever (friends, news, Recommended, Join). Up or B puts it away and the strip is out of sight again. Open a game page and press B: Home returns as before. Off: the tabs show under the games as before. Show wishlist deals is always in Quick Access | not checked yet |
| 83 | Steam's wording | Steam set to Spanish (or another language): Home and the game page use Steam's own words, matching Steam's stock Home: chips Tiempo de juego, Logros, Última sesión; eyebrow and "Hoy / Ayer / hace N días"; tabs Novedades, Amigos, Recomendados; Library card "Ver más en la biblioteca"; the buttons' labels (Ajustes del mando, Administrar); rows "Actualizados recientemente…" and "Popular entre tus amigos"; news pills; friends' Conectado / Ausente / Jugando; join dialog. With Steam in English the same words come from Steam's English ("Play Time", "Last Played"). Rephrased onto Steam's words (docs/localization.md section B): the Library button reads "Biblioteca", the Library card's eyebrow "Mis juegos", the eyebrow "Última sesión · Hoy", the Join dialog shows only "{amigo} · {juego}", empty feed lines "No se han encontrado actualizaciones" / "Sin resultados", the empty Home shows only the Library button, no "Short game" pill. The cloud button says "Steam Cloud: Actualizado" etc. (and "Partidas guardadas en Cloud: …" for a Unifideck game); friends read "Jugando a …" / "Último jugado: …"; the Library card chip is "Juegos". Words with no Steam token stay English | not checked yet |
| 84 | Long titles and chips | A long game name (Ori and the Blind Forest: Definitive Edition) shows whole on Home, up to three lines, growing upward: the eyebrow, chips and buttons do not move and nothing touches the status bar, handheld and docked; a four-line name ends with an ellipsis. The chips are Played, Achievements, HLTB main (no Last played chip: the eyebrow says it) | not checked yet |

## When HowLongToBeat breaks

Symptom: "No match found" for every game. A scheduled task runs `pnpm check:hltb` every Monday and reports
what changed. Fixes go in `src/vendor/hltb-for-deck/hooks/HltbApi.ts`; check upstream (morwy/hltb-for-deck) first.
Cached times keep showing while it is broken.

## Diagnosing on the device

Frontend problems need Steam's debugger, which this setup reaches through SSH:

1. On the device: Decky → Settings → Developer → **Allow Remote CEF Debugging** on, and `sudo systemctl enable --now sshd`.
2. On the Mac: `ssh -N -L 18080:127.0.0.1:8080 <device>`, then `node scripts/cef-eval.mjs '<js>'`,
   `node scripts/cef-shot.mjs out.png`, `node scripts/cef-css.mjs file.css` (try CSS live) or
   `node scripts/cef-viewport.mjs out 1500x844@1.28` (preview another screen size).
3. Backend log on the device: `~/homebrew/logs/game-glance/`.

Afterwards turn both off again: `sudo systemctl disable --now sshd` and Remote CEF Debugging off.
