# Native Settings corrections — Steam Deck, 2026-11-05

Installed source candidate: `059f70a` on the Steam Deck. Michael requested the Settings title, elimination of category-change flicker, broader control styling and right-aligned dropdowns, then explicitly moved all testing/installation to the Steam Deck while using the Ally. **No Ally changes were made in this correction pass.** No push, PR or release.

## Changes and reproduced causes

- Added a fixed “Settings” heading above the native category scrollport. The first and last native categories remain reachable and visible. The heading is owned, noninteractive markup; native categories are retained.
- Steam mounts outgoing and incoming pages beneath a shared animation wrapper. The previous single-page/single-child discovery removed the whole theme during that valid state. Discovery now verifies each page branch, retains the shell through empty transitions, and styles overlapping pages before paint. Unknown branches still fail closed. The shared wrapper and rapid multi-page branch cases have regression tests.
- Many native labelled rows occur outside Audio's `DialogSettingsSection` template. Their native label/Panel structure now identifies surfaces throughout Settings, with compact geometry only for eligible single-action rows. Complex rows keep independent focus targets. Tabs, inputs and radio cards receive scoped component styling; selected radio highlighting has a browser regression.
- Dropdown current values and options align right. Some Steam dropdowns omit the ARIA target from the DOM. Ownership can instead be proved by the exact native menu instance linked to the exact input. This guarded boundary reads identity only, without inspecting options or calling setting handlers. Changed native internals retain native popup styling rather than styling unrelated portals.
- Native ownership references can become available after DOM/focus callbacks. A fresh debugging review identified that event-only acquisition gap; a regression reproduces reference assignment without a subsequent DOM mutation. Bounded animation-frame rechecks (up to 30 frames/500ms) acquire only verifiable expanded pickers, stopping on acquisition, collapse, route replacement or disposal. This does not introduce continuous polling.

Each reproduced failure was observed failing before its correction. Initial native probes exposed the extra shared wrapper and asynchronous ownership timing; those intermediate builds were superseded. One all-category batch ran while Steam's screensaver was active and was rejected as acceptance evidence. The final batch ran awake; no screensaver preferences were changed. Normal input dismissed the screensaver after clearing forced mode alone proved insufficient.

## Final local checks

- `pnpm test`: **261 files / 2,843 tests passed**.
- `pnpm typecheck`, `pnpm build`, `git diff --check`: passed.
- Browser checker: **21 cases**, no page errors, at 828×466, 1280×800 and 1600×900. Includes heading clearance, right-aligned selected values/options, radio selection distinction, footer ownership-only movement, native-sized controls, scrolling, long descriptions and popup close cleanup.
- New native Settings suite: **44 tests**, covering empty/overlapping/shared transition hosts, rows outside Audio, complex independent actions, exact native menu identity, late reference registration and unrelated portal exclusion.

## Installed Steam Deck evidence

The actual handheld display was 1280×800 pixels, approximately 854×534 CSS pixels. UI scale and stored plugin/native settings were preserved.

- All **25** current categories retained their native category list and styling.
- **1,044 sampled frames** across all category transitions contained **zero unthemed frames**. This is frame-sampled native evidence, not a guarantee about every future Steam revision or physical input pattern.
- All **222 detected native labelled row surfaces** received the theme. All category panels remained bounded above the footer.
- Native dispatcher focus reached the first and last categories; both were visible, including clearance beneath the new heading.
- Last eligible native controls on System, Display, Storage, Notifications, Downloads, Game Recording and Audio stayed focus-visible inside the safe area, with unchanged control value snapshots.
- Audio, Display, Downloads and System dropdowns each opened, received scoped styling, showed right-aligned values/options, cancelled with B, returned focus and retained their original values.
- Leaving Settings removed owned styles, title, surfaces, row markers and decorations. Re-entry restored presentation. Final state: plugin loaded, Audio Settings, side menus closed, no running games, scratch audit globals removed.

The Deck had no attributable Home/game artwork context during this pass, so it used the designed neutral backdrop. No artwork source was manufactured, and no persistent preference was enabled to force one. Artwork-backed frost on the Ally remains the earlier separately documented evidence. Physical-controller/touch comfort and performance still require hands-on acceptance; native dispatcher checks do not substitute for it.

Local artifacts in this chat's `settings-handheld/deck-corrections` directory: `native-transitions.json`, `native-categories.json`, `native-navigation.json`, `native-controls.json`, `native-pickers.json`, `native-finish.json`, `installed-build.json`, `original-backup.json`, `deck-audio-final.png`, and browser fixture captures/checks. These store category names, structural counts, geometry and booleans rather than private setting/account/network/Friends contents.

## Installation and rollback

- Steam Deck installed frontend SHA-256, independently checked after reload: `1f01738db0770beb0c63ee5ba457e89949094a0824cc0bc20d99ccc8ac564c54`.
- Original Deck frontend backup: `/home/deck/gg-backup-native-settings-20261105-_zi441z8/index.js`, verified SHA-256 `3b381b64dd015abe2c765ad6f964ea6f5a65729e2bef3d190f97fe0dd97882d6`; `original.sha256` is alongside it.
- Immediate preceding frontend backup: `/home/deck/gg-backup-native-settings-20261105-mimwybqs/index.js`.
- Backend `main.py` already matched the current source SHA-256 `5fcc43aa89641098c6e19cef32bbada1dd0565db8ea87da1e38a9362226c1112`; no backend replacement was needed. Only the frontend was staged and atomically replaced, with side menus/keyboard closed and guarded Decky reloads.
- Rollback if native content becomes inaccessible or cleanup breaks navigation: close menus/keyboard, restore the original Deck backup to `/home/deck/homebrew/plugins/game-glance/dist/index.js`, verify the original hash, and reload through Decky. Preserve backend and stored settings.

At completion of this Deck-only pass, the Ally remained on its previously authorized `dcd1d18` build because Michael was using it. The subsequent separately authorized installation is recorded below.

## Subsequent authorized Ally installation — 2026-11-05

Michael explicitly requested “Can you install this version on the Ally?” Rebuilt documentation HEAD `2eac5ac` (unchanged tested source candidate `059f70a`); the bundle matched the tested Deck SHA-256 `1f01738db0770beb0c63ee5ba457e89949094a0824cc0bc20d99ccc8ac564c54`. Guarded frontend-only replacement and Decky reload occurred with side menu/keyboard closed and no running games. No backend or saved settings changes.

Rollback frontend: `/home/deck/gg-backup-native-settings-20261105-4iwls8es/index.js`, independently verified SHA-256 `5465f5297d1e1249dde5ab80b5bf5ef259b1a3a49ddc5ce303b84279fe52ee91`. The installed frontend hash was independently checked after reload and matched the candidate.

Installed Ally checks at 1500×844 CSS pixels retained all 25 styled categories and footer clearance. First/last sidebar focus was reachable and visible beneath the heading. Audio, Display, Downloads and System dropdowns had themed/right-aligned values/options, cancelled with B, returned focus and preserved value snapshots. Keyboard, Controller, Display and Audio switches contained zero unthemed frames across 286 samples. Route exit removed owned Settings styles/markers/title; re-entry restored styling and actual artwork-backed frost. Final state: Audio Settings, plugin loaded, no side menu or running games, temporary previews absent and scratch audit globals removed. This is native programmatic validation, not physical comfort acceptance.

Evidence: this chat's `settings-handheld/ally-corrections/{installed-build,pickers,transitions,categories,navigation,finish}.json`. The Steam Deck was not modified by this follow-up.
