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
| 31 | L1 / R1 on the action row | R1 selects the next game, L1 the previous: hero, title, chips and Play change and the row slides to follow. R1 past the last game lands on the Library card (an Open Library pill, hero stays on the last game); R1 again wraps to game 1; L1 from game 1 goes to the Library card, then the last game. Works from Play and from the small buttons (from a small button onto the Library card, focus moves to the Open Library pill). Holding a bumper keeps stepping at a steady rate, without focus jumping, and stops at the Library card (R1) or game 1 (L1) | not checked yet |
| 32 | Loop preview and the card row | Games after the Library card fade out toward the right edge. Tapping or clicking any card (game, Library card, preview) does nothing. While the card row has focus only the selected card (or the Library card) is highlighted (accent glow, bar and a bright edge); with focus elsewhere it looks as before | not checked yet |
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
| 43 | Switch speed and smoothness | Tap and hold L1/R1: the hero crossfades in about a quarter second, the cards slide and widen without stutter, the accent colour follows at once; rapid presses never pile up fades (the art always shows the latest game within about 0.3 s). The feed sheet still rises at its old pace. If anything stutters, note which part (hero, cards, colours) | not checked yet |
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
| 69 | News art fitted whole | What's new: a news card with the event's own image shows the whole image (nothing cut at the sides, top or bottom) at the top of the card, over a blurred copy of it; the title and line sit under the image. On the featured (wide) card the image is centred with the blur at its sides. A news card without event art shows the game's art as before. Scrolling the news row stays smooth | not checked yet |
| 70 | Play transition, from Home and from the game page | Press Play (Game Glance page on, with and without Spotlight Home): while Steam's launch screen is up, only the game's art shows under it, dimmed; no title, logo, Play row, cards or tabs bleed through its text. Cancel or a failed launch brings the page back. With the Game Glance page off, Steam's page is unchanged | not checked yet |
| 71 | Controller button on Home | Press the controller circle several times, including right after Home opens and after switching games with L1/R1: Steam's controller configurator opens each time and Game Mode never crashes (one crash was reported on Reddit, not reproduced) | not checked yet |
| 72 | Game card navigation | Home opens with focus on the first game card (highlighted). Left/Right (d-pad and left stick) select the previous / next game: hero, title, chips and buttons follow, focus stays on the cards; past the last game the Library card, then back to the first; held, it stops at the ends. Up goes to Play, Down to the tabs (nothing with the bottom section hidden). L1/R1 from the cards or the action row select the previous / next game and put focus on Play; held, they keep going. View/Menu on the cards open the selected game's menu. A on a card opens its page | not checked yet |
| 73 | Hide the bottom section | Quick Access → Game Glance → What's new, Friends, Recommended off: Home shows the selected game, its buttons and the recents row, with no tab strip or cards, and the whole stack sits lower so the recents row ends where the tab strip did (about 18 logical px above Steam's button legend, no empty band under it), handheld and docked; Down from the action row does nothing; Show wishlist deals is hidden in Quick Access. Turning it off while focus is in the tabs or feed brings focus back to Play. Open a game page and press B: focus returns to the action row (never a hidden tab). Back on: the tabs return and fill in (friends within a few seconds) | not checked yet |
| 74 | Unifideck game page | With Unifideck installed, open a Unifideck game that is not installed, then one that is (Game Glance page on, with and without Spotlight Home). Unifideck's Play row (Install or Play, its size and last played, its round buttons) sits on the art where Steam's Play row is, with our cards under it; Install/Play is the accent pill and keeps the pill look when focused; the round buttons match ours. Unifideck's info panel starts the next screen (press down). Cancel/Stop during a download keep Unifideck's look. A Steam game's page and a non-Unifideck shortcut are unchanged | not checked yet |
| 75 | Recents count | The recents row holds the same games as Steam's own Home recent games (up to 20, not 10): step through them with the card row or R1 and compare with Steam's Home (Spotlight Home off) | not checked yet |
| 76 | Hero art past the first games | Right after a reboot (so Steam has loaded few game details), step with R1 or the card row through all recents, without opening any game page: every Steam game shows its real full-screen hero art, never a blurred, zoomed-in capsule (Reddit: wrong after the first 4). Games with no hero art at all (some shortcuts) still get the blurred-capsule fallback | not checked yet |
| 77 | Built-in updater | Quick Access → Game Glance → Updates shows "Version x.y.z · up to date" (or "checking…" briefly). With a newer release published (or package.json's version lowered on a test build): "… is available" and an Update to … button; pressing it shows Decky's own install prompt, Install replaces Game Glance with the new version and reloads it, settings and cached data kept. Offline: "could not check" and Check again; nothing breaks | not checked yet |

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
