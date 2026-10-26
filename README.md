# Game Glance

A [Decky Loader](https://decky.xyz) plugin for Steam's Game Mode. It turns each game's page into a full-screen view
with everything about the game at a glance, and can replace Steam's Home with **Spotlight Home**: your games, one at a
time, over their own art.

https://github.com/user-attachments/assets/a2864c1d-3ac3-4fcd-a4c2-fa4e457b00e9

https://github.com/user-attachments/assets/a074223d-caf1-40b5-a495-8b70e2473ee9


https://github.com/user-attachments/assets/00f502ad-51dd-49a8-80a1-b986f4b49a0e


## Features

- **Game page.** Full-screen art, how long the game takes to beat ([HowLongToBeat](https://howlongtobeat.com)), your play
  time and achievements, and where the game comes from. An optional **Clean look** shows less. Choose **Fill** or **Fit**
  for the hero artwork on Home and the game page.
- **Spotlight Home.** An optional new Home screen (off by default): one game at a time over its art, a row of your
  recent games or a collection, and optional Friends, News and Recommended tabs one press down.
- **Touch.** On a handheld's touchscreen, tap a game to select it and again to open it, swipe the games row and the tabs'
  rows, swipe up for the tabs, and tap the game page's cards. A mouse clicks and drags the same way, scrolls the rows
  with the wheel and lights whatever you can click under the cursor.
- **Screensaver.** Steam's Game Slideshow, drawn with your games and their art, with logo and stats.
- **Non-Steam games.** Games added by [Heroic](https://heroicgameslauncher.com) or
  [Unifideck](https://github.com/mubaraknumann/unifideck) get their store, times and description too.
- **Works offline.** Times and descriptions are kept on the device.

Every feature and setting is described in [docs/features.md](docs/features.md).

## Install

Game Glance is not in the Decky plugin store. Install it from a release:

1. In Game Mode, open Decky → Settings → General and turn on **Developer mode**.
2. Download `game-glance.zip` from the [latest release](../../releases/latest).
3. Decky → Settings → Developer → **Install plugin from ZIP** (or **Install plugin from URL** with the release asset's
   link).

Updates install from Game Mode: Game Glance checks for a new release once a day, and Quick Access → Game Glance →
Updates shows **Update to …**, which hands it to Decky to confirm, install and reload Game Glance.

If you use **HLTB for Deck**, you can uninstall it; Game Glance shows the same times on the game page.

## Settings

Find them in Quick Access (…) → Game Glance. The full list, with defaults, is in
[docs/features.md](docs/features.md#settings).

## Compatibility

Tested on a ROG Xbox Ally running Bazzite, handheld and docked to a 1080p TV; the layout follows the screen size. It
should work on a Steam Deck and other SteamOS-like devices, but that has not been tested.

Steam updates can rename the parts of the page Game Glance styles. When that happens, it turns its layout off and you
get Steam's normal page with the cards on it, rather than a broken page.
[docs/device-checklist.md](docs/device-checklist.md) lists what to check after an update.

Known limit: Steam keeps no "last played" game for friends, so Game Glance remembers the last game it saw each friend
play and shows it once they are away or offline.

## Privacy

Game Glance talks to two sites for game data: howlongtobeat.com (times) and store.steampowered.com (descriptions). It
sends game names and Steam app IDs, nothing about you.

- **Show wishlist deals** (off by default) sends your Steam ID to Steam's web API (api.steampowered.com) to read your
  public wishlist, then asks the store for the prices of its games.
- **Updates:** once a day, and when you press Check for updates, Game Glance asks api.github.com for the latest
  release's version and download link. It sends nothing about you.
- **Steam client:** Spotlight Home's news, friends, status bar and art come from the Steam client, as on Steam's own
  Home, and the family owner's name comes from your friends list. Images not yet stored on the device load from Steam's
  image servers.
- **Screensaver:** it looks nothing up. Its times and achievement counts are only what Game Glance already saved on the
  device.

Everything Game Glance stores stays on the device, in Decky's settings folder.

## If something goes wrong

If Spotlight Home hits an error, it shows Steam's own Home instead and writes the error to a log file:

`~/homebrew/logs/Game Glance/game-glance.log`

Attach that file to an issue report. Review it first and remove anything personal. It keeps the newest entries and stays
small.

## Development

```bash
pnpm install
pnpm test                         # frontend tests
python3 -m venv .venv && .venv/bin/pip install pytest && .venv/bin/pytest tests/py
pnpm check:hltb                   # live check against howlongtobeat.com
scripts/package.sh                # builds out/game-glance.zip
```

A release is a GitHub release tagged `vX.Y.Z` (the version in `package.json`) with `out/game-glance.zip` attached as
`game-glance.zip`; the built-in updater compares that tag with the installed version. Release notes are in
[docs/release-notes](docs/release-notes).

`scripts/serve.sh` serves the zip on your network for **Install plugin from URL**. The `scripts/cef-*.mjs` helpers
drive Steam's UI through remote CEF debugging; see the device checklist for the setup.

## Contributing and support

- **Bugs and ideas:** [open an issue](https://github.com/michpalm/game-glance/issues/new/choose). Planned work and
  what's in progress are on the [project board](https://github.com/users/michpalm/projects/2).
- **Testing:** if you want to help test changes on your device, [volunteer as a tester](https://github.com/michpalm/game-glance/issues/new?template=tester-interest.yml).
  Testing is optional. See the [community testing guide](docs/community-testing.md).
- **Support:** Game Glance is free, and support is optional. It does not buy priority support or influence over the
  roadmap; it helps keep the project going when I have time.

[![Support Game Glance on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/michpalm)

## About this project

This is a personal project, maintained on a best-effort basis. Steam and HowLongToBeat change without notice, so expect
occasional breakage; issues are welcome.

The code was written with [Claude](https://claude.ai) (Anthropic's AI), directed, reviewed and tested on device by the
author.

## Credits

- HowLongToBeat lookup code from [HLTB for Deck](https://github.com/morwy/hltb-for-deck) (MIT), including the fix from
  its pull request #68 by beallio. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
- Times from [HowLongToBeat](https://howlongtobeat.com). Store icons from Simple Icons and Font Awesome via
  [react-icons](https://react-icons.github.io/react-icons/).
- Not affiliated with Valve, HowLongToBeat, ASUS or any store shown.

## License

[MIT](LICENSE)
