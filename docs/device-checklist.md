# Device checklist

Run this after a Steam client update, a Bazzite update, or a plugin reinstall. It takes about ten minutes.
Most items need only the handheld; the TV items need it docked.

If something looks wrong, first turn **Quick Access → Game Glance → Redesigned game page** off and on.
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
| 21 | "Redesigned game page" off / on | Stock page / redesign | PASS |

### Offline (airplane mode)

| # | Check | Expected | 2026-10-02 |
|---|---|---|---|
| 22 | A game that was pre-loaded | Times and description still shown | not checked yet |
| 23 | A game never opened or pre-loaded | Page renders; "HowLongToBeat unavailable"; no description | not checked yet |

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
