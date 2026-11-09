# QAM visual-language preview

26 October 2026. Local branch `codex/social-chat`, including the existing floating menu and embedded Social work.

## Source and scope

Applied the decided values in `game-glance-visual-language/docs/superpowers/specs/2026-10-20-visual-language-design.md` (20 October spec, 25 October review) to the custom menu. This is the menu preview for the planned 4.0.0 work; it does not complete the wider Home/game-page/screensaver migration or release integration.

- Shared `src/styles/tokens.ts`: glass, edges, typography, radii, focus/current/on/unavailable states, motion, per-document stylesheet ownership and accent helpers.
- Artwork accent follows the displayed Home artwork on Home, or the running game in its overlay, with the VDL teal fallback. Home only publishes its displayed accent; its layout is unchanged.
- Glass surfaces, 16 px body / 20 px heading type, 16 px panel corners, bare setting rows, white focus ring with accent glow, and underlined navigation.
- Numeric controls retain native sliders. Short named performance choices use segmented controls, preserving native enum order and values.
- Social uses the same tokens and control states. Existing semantic presence colors remain intact.
- The approved 60vw × 84vh outer canvas, native Decky settings panel and compositor blur mechanism remain intact. CSS backdrop blur uses the 16-unit VDL value.

## Verification

- `pnpm test`: 143 files, 1,593 tests passed for the approved glass-only preview (obsolete blur tests replaced with single-window presentation coverage).
- `pnpm exec tsc --noEmit`, `pnpm run build`, and `git diff --check`: passed.
- Independent read-only review found no important issue in the token lifecycle, segments or selected/focused-state styling.
- Ally at 1920 × 1080: Quick settings body/heading/radius measured 16/20/16 CSS design units. White focus ring, 1.04 focus scale, accent toggle/slider fill, visible tracks, and 3-unit underlines confirmed.
- Quick settings and tab bar have no scroll overflow. All controls fit after adjusting spacing on the VDL 4-point scale.
- Scaling renders two segmented groups (five and three options). Chosen options retain the artwork accent fill and white text when focused. No setting choice was activated during inspection.
- User-authorized real-device Quick settings image: `/Users/micpaal/.codex/visualizations/2026/10/25/01a174ca-7ab2-7ec3-a6a1-3c0d37b9f207/qam-vdl-quick-settings.png`. Social was absent and the Home feed was closed before capture. No conversations or messages were inspected or sent.

These checks establish the Home-context Quick settings layout and Scaling control rendering. Running-game rendering, full controller traversal, alternate aspect ratios and in-conversation Social acceptance remain separate device checks.

## Ally preview

Continued the user's authorized frontend-only Ally preview. Backup before the VDL update: `/home/deck/gg-vdl-backup-20261026-075839/` (private settings backup). Restore its `index.js` into the plugin's `dist/` and reload through Decky to roll back.

Glass-only frontend installed on the Ally before the 3.6 integration, SHA-256: `ff9300acf44f0dcd1f7eecfccd28cdac1d6c52a9f889a7fbdea5a286a4122033`. The current local build and merged baseline are recorded in [the integration report](menu-3.6-integration.md); that combined build has not been installed on the device.

Saved settings and menu preferences fingerprint remained `41f45a9655c8c863088c98335a3da19fed8f0f3e7609bbe1677a09f5d54815d3`. Backend and package metadata remain 3.6.0. Changes are local and the device has a test frontend; no push, PR, release or publication occurred.

## Social and menu-transition follow-up

User-reported issues: visible friend-list scrollbar, clipped left focus ring, friend header shifting when Back appears, delayed opening blur and a full-screen close flash.

- Friend list and history keep overflow scrolling with hidden standard/WebKit scrollbars. List padding increased from 4 to 8 design units so the 1.04 focus scale plus external white outline fits inside the scroll clip.
- Back always reserves the same space in the friend header. In preview it is invisible, inert, disabled and hidden from accessibility navigation; entering chat only reveals it.
- The scoped native parent now uses full opacity and no opacity transition while hosting the custom menu. Previously the frosting inherited Steam's 300 ms parent fade, which isolated the backdrop until the fade completed.
- Closing temporarily hides the departing native backdrop until its native Visible class is gone and the hidden state has painted. Previously restoring the native 70%-black/8 px blur scrim during the native close hold caused the full-screen flash.
- An explicit closing state distinguishes close from native handoff, including handoff after the custom node was cleared. Direct native main-menu opens release custom ownership. Reopen, native handoff and unload cancel a pending close guard; no viewport lease is needed to clear it.

Ally verification used CSS geometry and lifecycle measurements without collecting identities or messages or opening real conversations. Both scrollbar mechanisms report none, scrolling changes scrollTop, and the focused first friend's left/right/top outline fits within the list clip. Temporarily revealing the reserved Back control leaves the header, avatar and name rectangles exactly unchanged.

Before the transition fix, the first sampled frosting frame inherited parent opacity 0 and the closing capture contained 27 frames of visible native dark scrim. On the final build, 34 sampled opening frames all have opacity 1; 42 sampled closing frames contain zero visible dark-scrim frames. Rapid native reopen during guard creation was also exercised, and the native menu regained visible presentation with the guard and custom viewport removed. These are Home-context measurements; no claim is made about untested running-game compositor timing.

Regression tests were observed failing before the header, close-guard and native-handoff fixes, then passing. Independent review caught the close-to-native-handoff race; its fix was re-reviewed with no remaining important findings. Final full suite, types, build and whitespace checks passed. The previous VDL preview frontend is backed up at `/home/deck/gg-qam-fixes-backup-20261026-095111/index.js`; the installed bundle and saved-settings fingerprint were checked again after deployment.

## Transition recording iteration — visual acceptance still open

The user reported continuing opening blur artifacts and closing flicker. The prior opacity/geometry checks did **not** establish visually seamless presentation. User-authorized 60 fps Showreel recordings of Quick settings confirmed a blur-only pre-roll, changing blur geometry, and a chopped cached popup frame on close. No Social content was recorded.

The initial native popup and its owner placeholder disagreed on aspect ratio: the opening blur bar was about 12 owner CSS px high before jumping to its settled 41 px height roughly 140 ms later. Restoring the native placeholder size during close also resized the external BrowserView before its cached custom frame had disappeared.

Changes in this iteration:

- Keep both presentation halves hidden until owner/popup scales agree and their root geometry is stable across two source frames.
- Keep the popup dimensions leased through custom close, releasing them on custom reopen, native handoff or unload. Keep the closing native provider blank rather than rendering Steam menu content into the departing popup.
- Fence popup reveal behind the first owner blur paint. Conceal both layers and let their hidden state paint before expensive React/native close teardown. Cancel pending work on handoff/dispose and resume concealed frosting on a new presentation.
- Regression tests cover wrong initial aspect ratio, canceled startup, blank closing content, retained dimensions, close teardown ordering, native handoff cancellation, first blur paint, and reopening during conceal. Red/green verification observed; full suite 1,600 tests, types, build and whitespace checks passed.

The comparison clips show that oversized early blur and the chopped closing frame are removed, but a brief cross-renderer menu/blur mismatch remains. **Do not report the transition as seamless or fully fixed.** Visual acceptance remains open. A larger presentation rebuild retaining the VDL blur, or a design change to stronger glass without separate background blur, is needed.

Recordings under the chat artifact directory: `qam-transition-before.mp4`, `qam-transition-after.mp4`, and `qam-transition-final.mp4`. `qam-strong-glass-prototype.mp4` / `.png` demonstrate the reversible alternative using the existing strong-glass token. The prototype's recording background changed to the configured screensaver artwork while idle. Temporary prototype styles were removed; the regular VDL preview is restored. No preference was changed. A native BrowserView visibility experiment was rejected and no React-fiber lookup or native visibility override was shipped.

Backup before this iteration: `/home/deck/gg-qam-geometry-backup-20261026-101929/index.js`. A design direction question is pending; do not silently adopt the no-blur prototype as the approved design.

## Approved stronger-glass test — 26 October 2026

After viewing the no-blur prototype, the user said “let's go ahead and try that.” This authorizes the menu-specific design exception and the continuing Ally preview; the earlier direction question is resolved.

- The custom menu uses the existing strong-glass value `rgba(12,16,22,.55)` in place of its normal glass token. The override is scoped to `.gg-menu`; other released surfaces keep their styling.
- Removed the owner-document blur panes and the custom menu's Gamescope blur hold/hook. The menu's glass, text and controls now render together in its own popup. Native Steam menus retain their own presentation when handed control.
- Replaced frosting with `prepareMenuPresentation`: it waits only for correct/stable native popup geometry, with no second-renderer blur or paint wait. Conceal/resume, close paint fencing, native handoff, retained popup dimensions and blank closing content remain covered.
- New presentation tests cover viewport agreement, wrong initial aspect ratio, conceal-to-reopen cancellation, disposal and absence of owner blur surfaces. Tests were observed red before implementation and green afterward. The final full suite has 1,593 tests in 143 files; typecheck, build and whitespace checks pass. Independent review found no important issue.
- Installed frontend-only on the Ally and reloaded through Decky. Backup of the previous blurred preview: `/home/deck/gg-qam-glass-backup-20261026-105949/index.js`. Backend/package metadata remain 3.6.0. Local and installed bundle hashes match; saved settings/menu-preferences fingerprint remains `41f45a9655c8c863088c98335a3da19fed8f0f3e7609bbe1677a09f5d54815d3`.
- Ally computed styles confirm the .55 glass background, `backdrop-filter:none`, zero external blur panes, no temporary prototype styling and no Quick settings overflow. The actual installed frame is `qam-glass-installed.png` in the chat artifact directory; Social was absent and the Home feed was closed before capture.

The fresh 60 fps comparison recording could not start: Showreel/GPU Screen Recorder timed out waiting for PipeWire negotiation, including one retry, then returned idle. No recording was left active. The screenshot and layout checks establish the installed appearance; they do not establish final opening/closing smoothness or running-game rendering. The preview is ready for the user's transition acceptance test. No public push, PR or release was performed.

## Denser glass — 26 October 2026

The user reported that the transparent QAM clashed with the screen behind it and requested another assessment of efficient frosting. Main panels and the tab bar now use the existing solid-glass token (`rgba(12,16,22,.75)`) instead of .55. Menu status pills use the same .75 token; their scoped overrides explicitly beat the shared Home stylesheet's important background/blur declarations. Nested controls retain their existing fills.

Typecheck, all 1,909 frontend tests in 171 files, and build passed before installation. After correcting the status cascade, typecheck, 207 menu tests and build passed again. Installed frontend SHA-256: `924e3279894aeedbb441040c91ce82a8dc69e1680b427266767a0b01f3e43aa8`. This preview includes the previously merged 3.6 baseline, including the in-flow HLTB Play-row fix. Saved settings/menu-preferences fingerprint remained `41f45a9655c8c863088c98335a3da19fed8f0f3e7609bbe1677a09f5d54815d3`. Original pre-opacity bundle backup: `/home/deck/gg-qam-opacity-backup-20261026-221236/index.js`.

A temporary popup-local `backdrop-filter:blur(16px)` probe was accepted by CEF, but captures showed only the game even after the user opened Quick settings. That probe is inconclusive about visible frosting and has been removed. No additional blur mechanism was shipped. Gamescope's upstream compositor implements conditional base-layer blur and configurable fade; it remains a candidate for an in-game-only prototype, with actual frame-time and close-transition validation required. Home/Steam UI requires separate verification. Do not claim optimized frost or seamless transitions from these checks. No public push or release was performed.

## Frost feasibility — freeze, recovery and live retest

The user authorized investigation of frosting. Temporary probes tried conditional native blur, full-background native blur, forced GPU composition, and popup-local CSS blur. Native IPC acknowledged both blur modes and X11 properties reflected the requested values. The user initially reported no visible change. A synthetic checkerboard inside the popup confirmed that CEF can blur content within its own document, but this does not establish cross-window frosting or acceptable performance.

The user then discovered that the physical display was stuck on QAM while controller navigation sounds continued. The compositor presentation counter had stopped at 151241; later screenshot requests did not complete. GPU busy values were outside the expected percent range and were excluded. **All physical blur/no-change observations from this session are inconclusive. Repeat after recovery; do not use them to accept or reject native frosting.** The freeze onset and cause are unknown. Do not attribute the freeze to a specific probe without further evidence.

Removed popup probe/control styles, stopped watchdogs, restored native blur mode 0/radius 32/fade 300 and composition force 0, retaining Steam's original suppression flag and zero blur holds. No production frosting code was added. The frontend reload timed out; a Steam launcher restart was initiated to recover the UI before further testing. The installed .75-opacity preview remains the baseline. No public push or release was performed.

Steam launcher restarted successfully, but the compositor remained at 151241 completed presents. A device reboot was requested to clear the graphics session. No further visual frosting conclusions should be drawn until a live presentation baseline is re-established.

The reboot completed through Steam's native restart API (remote logind/sudo reboot required interactive authentication). Fresh uptime was 40 seconds, the compositor counter advanced from 558 to 610, 622 and 908, and the user confirmed normal visible menu close/reopen updates. This establishes the recovery baseline for retesting; no screenshots are used in the first repeat to avoid adding capture as a variable.

### Valid live retest after reboot

Relaunched the same installed Ori game, reopened Quick settings, and repeated native conditional blur through Steam IPC (mode 1, radius property 24, fade 0). The user confirmed visible frosting and working controller navigation, but reported extremely slow navigation. Presentation continued advancing. This supersedes the earlier frozen-screen observations: native in-game frosting **does work** in the current host, but the tested setting is too slow.

A capture-free radius comparison sampled `Total Presents Completed` over five seconds per phase, after one second of settling. Blur mode was checked before and after each sample. Results were: no blur 48.74 presentations/s; radius 8 38.76; radius 16 37.56; radius 24 35.54; radius 8 repeat 38.56; no blur afterward 49.14. These are aggregate display presentation rates for this Ori/menu scene, not GPU execution timings, input-latency measurements or a general gameplay benchmark. Raw results are in the chat artifact `frost-radius-matrix.json`. The untrustworthy GPU-percent counter was not used.

The upstream Vulkan implementation dispatches its horizontal first blur pass across the output dimensions; the conditional second pass chooses blurred background where overlay alpha exceeds its threshold. The fixed compositor work is therefore not eliminated by reducing the radius. The matrix alone does not prove which internal stage dominates on this device. Restored native mode 0/radius 32/fade 300 and composition force 0. No optimized frost implementation has been added to the product. A cached, reduced-resolution background rendered in the same popup is a separate candidate; its capture latency, frozen-background behavior and navigation performance remain unverified.

Recommendation: retain the .75 glass baseline for now. Investigate a cached reduced-resolution backdrop in the popup as the next separate feasibility probe, so the blur can be computed once instead of on every composited game frame. It must establish a fast capture path before adoption; an obvious delayed blur arriving after the menu is not acceptable. Home frosting and input/close behavior still need independent validation. The live in-game comparison does not validate those paths. No persistent compositor setting or product frosting code was changed during this investigation.
