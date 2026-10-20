# Floating menu — first device gate

Status: **first host/lifecycle gate passed on the Ally**. User controller and in-game checks plus the programmatic native-focus, handoff, cleanup, and restoration checks below permit Task 5. Final release acceptance remains Task 10.

## Local checkpoint · 2026-10-19

- Branch: `codex/floating-menu`; isolated local worktree. No Git remote operations or publication.
- Default-off menu preferences, shared Decky settings, master-setting startup guard, retry after failed preference loading, and independent unload cleanup are implemented.
- Menu startup waits for both master settings and menu preferences. Spotlight Home is independent.
- TypeScript passes. `pnpm test`: 126 files, 1,438 tests pass.
- `scripts/package.sh` passes; `unzip -t out/game-glance.zip` reports no errors.
- Final local ZIP SHA-256: `23efacf75c75f34d4fe533d30486617934b36f9122900aad59ef00f93279ad4d`.
- This is a development checkpoint, not a release or completed functional menu.

## Ally evidence

User explicitly authorized the device copy: “Send it to the Ally.” Only the frontend was temporarily replaced; Python/backend files were not changed. No game was running during this check.

Verified through live Steam/Decky state and DOM inspection, not physical controller testing:

1. Preview loads through Decky's normal plugin reload. Its own enable toggle renders and persists.
2. Native menu methods remain unpatched with the preview disabled.
3. Enabling installs the owned Home/Quick Access interception.
4. Invoking the actual Home handler still displays Steam's native menu; the custom content does not render.
5. Read-only inspection of the mounted component chain identifies Steam's browser component as React tag 15 (SimpleMemoComponent). React retains the previously resolved inner function. Changing the exported memo's `type` does not update the mounted renderer. Export discovery therefore does not prove an active render connection.
6. Added render acknowledgement: presentation waits for the custom native render's layout commit, with a one-second timeout. Missing acknowledgement rejects presentation so the coordinator removes owned hooks and replays the native opening request.
7. Retested guarded build with interception confirmed active before the Home request: after 1.4 seconds, the native menu was open (`GetOpenSideMenu() === 1`) and the Home handler was restored. This confirms native failure recovery, not custom rendering/navigation.

The remaining host investigation must find an integration that reaches an already-mounted native renderer without modifying React fibers or hiding native roots. Do not mark a renderer export patch as sufficient again. The generic host contract and shell remain reusable.

## Restoration after the first failed attempt

- Preview toggle explicitly switched off; UI readback `aria-checked="false"`.
- Original frontend restored from `/tmp/gg-floating-task4-original-index.js` on the Ally and reloaded through Decky.
- Original/installed frontend SHA-256: `9b35dbaba98bfd6a17d7b6c313ce2662a7da0276b3cb0e24cdeccfa235a48503`.
- Final check: original Home and Quick Access handlers; plugin loaded; menus closed.
- Preview ZIP and original frontend backup remain in the Ally's `/tmp` for traceability. No permanent test input hooks remain.

## Required acceptance run after host repair

Record each result as physical-device verified, programmatically verified, failed, or not tested. Unit tests do not establish these results.

- [ ] Home screen: Home opens Navigate; Quick Access opens Quick settings.
- [ ] Running game: Home opens In game; running-game entry is outside the four pinned sections.
- [ ] Same button closes; opposite button changes entry without unintended closing or double dispatch.
- [ ] A selects; B unwinds nested panels then closes; LB/RB traverse only the visible bar.
- [ ] Touch and mouse coexist with controller focus; scale and soft highlights feel correct.
- [ ] Held buttons do not repeat actions; keyboard/modal input has exclusive focus; system chords remain native.
- [ ] Native Steam, Decky, and controller configurator handoffs work, including return/reopen and configurator route restoration.
- [ ] Closing restores Steam/game input; no controls leak to the game while custom UI is active.
- [ ] Disabling either master or menu switch and Decky reload clean up owned resources, including during native handoff.
- [x] Failed presentation restores native opening and removes owned interception (programmatic Home check only).
- [ ] Re-enable after failure and repeat both entry paths.
- [ ] Unload/restore original frontend and confirm no custom hooks remain.


## Host repair checkpoint · 2026-10-19

The earlier export-mutation failure is resolved. A reversible live probe confirmed Steam calls the shared portal API on native menu renders even when React has cached its memo component. The host now owns a narrowly filtered portal hook: only a recognized `MainNavMenuContainer` function targeting its own `MainMenu` popup is wrapped. Unrelated portals pass through unchanged. Cleanup uses the existing ownership-aware descriptor restoration.

Steam retains the portal target, owner-window providers, native navigation component, activation/deactivation callbacks, and native keyboard/modal routing. The native surface is activated after presentation begins so its first render can occur; presentation still requires layout acknowledgement and falls back on failure. The viewport rule is temporary and targets the uniquely discovered native Main Menu placeholder in its owning Steam window. It does not hide native roots or modify React fibers. Stylesheet discovery uses the module contract, not individual export discovery.

Verified live on the Ally:

- Custom root appears, with the first content action receiving focus.
- Native viewport expands from 241 × 845 to 1500 × 845 CSS pixels. The floating content bounds were approximately x=195, y=68, width=1111, height=577.
- The user reports: “Seems to work quite well” after the requested controller navigation test. Treat this as general user feedback, not proof of every acceptance item.
- The custom Open in Steam action shows Steam's own contents and restores the 241-pixel viewport. Home reopens the custom menu.
- More → Plugins → Open in Steam enters native Decky (side menu 2, tab 999); the custom viewport rule is removed.
- Disabling the menu switch during native handoff restores the original Home handler, Quick Access handler, and portal descriptor. Re-enabling reacquires them.
- Disabling the existing master switch during native handoff likewise restores all three; the original enabled master value was immediately restored.
- Reload works with the feature enabled. Decky can retain an old active plugin panel after reload. That old menu-settings panel now warns that it must be reopened and disables its stale toggle. Closing/reopening Game Glance shows the active settings with no warning.
- Existing Home reload remounting navigates after 1.5 seconds, so reload checks reopen the settings only after that transition completes.

Current test package matches the device copy: SHA-256 `9845b221e5ee8b0cf9d139745fc5d5f3df9c26bee16bae417bd66ff11d15f14c`. TypeScript and 1,444 tests pass; package integrity passes. Native activation failure additionally has a regression for cleanup rejecting an in-flight presentation without an unhandled rejection.

The preview remains installed and enabled for the pending in-game acceptance check. The original frontend backup remains unchanged at `/tmp/gg-floating-task4-original-index.js`. Restore the original frontend and native menus when the acceptance run ends. No Git remote operations or release publication occurred.


## First gate closure · 2026-10-19

- User confirmation: “Game check works”, in response to opening with both buttons, LB/RB and A/B, closing, and checking game input returns. Running game during the remaining checks: Ori and the Will of the Wisps, app 1057090.
- Corrected the supplementary input guard: the actual modal and keyboard state belongs to `SteamUIStore.WindowStore.GamepadUIMainWindowInstance`, not globals. A regression covers owner modal, global-modal and keyboard state.
- Programmatically opened the full native configurator using the running app's own Navigator entry. Its Home behavior preserved Steam's remembered configurator URL and returned to `/apprunning`; native Back and Quick Access reopening also worked. No layout was edited or saved.
- Opened a temporary native ConfirmModal with a native TextField. Clicking/focusing it showed the actual native keyboard (`IsShowingVirtualKeyboard.Value === true`), and the real native modal manager reported an active modal. Invoking a retained actual menu callback during this state left the shoulder unconsumed. The native modal can close/suspend the menu, so the retained callback also verifies stale handlers yield correctly. This is a programmatic on-device check, not a physical-controller modal test.
- Invoked the actual mounted menu shoulder callback with `is_repeat: true`: the In game section remained unchanged and the repeat was consumed. A fresh event advanced to Navigate. This is a programmatic on-device check; the user's earlier controller test supplies the general physical navigation feedback.
- Removed both disposable focus-probe globals, hid the keyboard, and closed the temporary modal. No text, messages, layouts, or settings were saved by the focus test.
- Restored native menus after the run: preview setting false, original frontend SHA-256 `9b35dbaba98bfd6a17d7b6c313ce2662a7da0276b3cb0e24cdeccfa235a48503`, original Home/Quick/portal descriptors, no viewport rule, no keyboard/modal. Game 1057090 remained running.
- Gate-closing development ZIP SHA-256: `329f698637f4ef68d306e65ac7d79a96fa17928ebd0815fe22fe4c56f40d29d0`; TypeScript and all 1,445 tests passed before copying; ZIP integrity passed.

The checkbox list above remains the reproducible final acceptance procedure. Its earlier unchecked entries do not supersede this categorized first-gate evidence. Task 10 must repeat final acceptance after real panels are wired, including physical keyboard/modal and touch interaction where available.

## Core settings and navigation checkpoint · Task 6

Build: 131 test files / 1,484 tests pass; TypeScript passes. ZIP integrity passes. Latest local ZIP SHA-256: `0382440d60691ac7437ae3d2d4d00e7466636dcabf463d5bfa45dc72fd19f408`. The installed and device-verified core preview is `5f25138051f137b2adebcad7282b9d15509f037b240e43be60c74cb44e44eb55`; the final local build adds an optional-Bluetooth discovery guard. That unsupported-key branch has a regression; the available Ally Bluetooth binding is unchanged.

Live production-adapter readback tests, with each original setting restored:

| Control | Original → test value → restored | Evidence |
|---|---|---|
| Output volume, active HDMI 909 / AllOutput=1 | 89.9963% → 87.9959% → 89.9963% | Actual mounted adapter set, native volume callback, pending=false/error=null; exact original-device restoration confirmed. |
| Microphone, active input 1148 / Input=0 | 100% → 97.9996% → 100% | Separate device/type; same adapter/readback/restoration checks. |
| Night mode | false → true → false | Native message field readback, adapter completion, restoration confirmed. |
| Friends DND | false → true → false | Friends-only binding; current-account identity checked for restoration. No chat/messages opened or sent. |
| Automatic UI scaling | true → false → true | Native display-settings readback; display identity checked before restoration. |

Wi-Fi, Bluetooth and Airplane mode getters/handlers were inspected, and binding/queue behavior tested with injected native contracts. **Their setters were not exercised on the Ally** to preserve the network/controller test path. Their native detail entry remains available. Airplane mode uses the actual subscribable `.Value` field. Before these tests, Wi-Fi/Bluetooth were on and Airplane mode off; none was changed by test code.

Brightness is callback-fed (including the native store's existing callback-fed initial value), but the custom control is omitted on this external display. External-display brightness capability has not been established; use native Quick Settings. Internal-display behavior has adapter tests but still needs a device run in that configuration.

Verified actual menu destinations:

- Library `/library`, Downloads `/library/downloads`, Store `/steamweb`, Settings `/settings`.
- Current-user Profile resolves Steam's current profile URL and enters the native `/externalweb` route. Online/Friends-ready and native parental feature gates are checked; offline/blocked behavior is tested with injected contracts, not by disconnecting the Ally.
- Power opens Steam's native dialog; only its explicit Cancel action was selected. No power operation ran.
- Notifications opens QAM tab 0; with native unviewed=0 and two tray groups, the badge is omitted. The badge source never calls Viewed, read, delete or clear methods. Explicit native viewing retains Steam's normal side effects.
- Help and Soundtrack enter native QAM tabs 6 and 7 via the public named enum; no playback command was issued.
- Navigation completes before closing side menus. The UI was returned to `/apprunning`; game 1057090 remains running.

A real route check caught `Navigator.LibraryTab()` without an ID producing `/library/tab/:id`. The implementation now uses the verified native Library root, with a regression and successful device retest.

Native settings discovery is isolated in `nativeCore.ts`. It owns lazy audio/display callbacks and polls cheap native store fields every 500 ms; active audio-device discovery refreshes every second while this optional menu session is enabled. Each audio send rechecks the actual active direction/device immediately before setting volume and rejects obsolete or expired preflight. Listener lifetime follows outstanding issued writes through acknowledgement/error/timeout after disposal; no close/unload code restores old settings.

The functional core preview remains enabled on the Ally for controller feel testing. The original frontend backup remains unchanged. Performance and richer game/social/plugin panels still use their native fallbacks at this checkpoint. No Git remote operations or publication occurred.

### Task 6 controller feedback correction — 2026-10-19

User requested removal of “Applying…” beneath volume and four-direction navigation between options. Removed the pending-status copy (including its unused style), preserving authoritative values, native slider editing and error feedback. CSS grids now also own native `Focusable flow-children="grid"` boundaries in Quick Settings, Navigate, More and Configure menu; the existing column parent can move between these groups.

Reproduced on previous Ally frontend: focus Wi-Fi, dispatch native right (12), focus stayed Wi-Fi. Confirmed native Steam layout parser supports grid. After frontend reload, native input dispatcher verified right Wi-Fi → Bluetooth, down Bluetooth → Airplane, right Airplane → Night, left Night → Airplane, up Airplane → Bluetooth. No controls activated and no settings changed during these checks. Quick Settings DOM has no Applying text. These are native-dispatch checks; physical controller feel remains user acceptance.

TypeScript and full suite: 1484 tests passed. ZIP integrity passed; local and installed temporary ZIP SHA256 `6d504246c20d5be6a87b190c74b0af9be175ad2e999583816251404f328a15b6`. Only temporary Ally frontend replaced, original backup retained. Preview left open for user testing. No Git remote operations.

### Spatial column entry and toggle focus correction — 2026-10-19

Previous grid-boundary fix permitted four directions but retained each group's last active child. Repeatable native-dispatch regression reproduced wrong-column entry: after Wi-Fi history Night→Up returned Wi-Fi, and after Bluetooth history Airplane→Up returned Bluetooth. Added native `navEntryPreferPosition=MAINTAIN_X` to grid boundaries; all four history/starting-control combinations now pass: Airplane→Wi-Fi and Night→Bluetooth regardless of previous connectivity focus. No settings activated during navigation checks.

Captured the MainMenu browser view before/after and inspected native toggle computed styles. Focus added a thumb border (height ~26px versus ~22px) plus a separate grey pseudo-element halo. The menu now owns a soft rounded row focus treatment, keeps the thumb 22×22 without a border, suppresses the duplicate switch halo and preserves accent-colored checked rails. Native checked state and thumb position remain unchanged. Final screenshot/computed-style check follows below.

TypeScript and all 1484 tests passed; ZIP integrity and matching local/device SHA256 `e1abcbc0bb441b0b8d6d4d36e438749d71371ebd744c6ac7e9eebae04d25c94d`. Temporary frontend only, original backup retained, local Git only.
Final installed preview recheck: all four spatial/history cases pass; focused Bluetooth remains checked with a ~22×22px thumb, 0px border and pseudo halo content `none`. Preview left open for physical controller acceptance.

### Thumb origin correction and editable mockup — 2026-10-20

User's final screenshot still showed the focused Bluetooth thumb above its track; prior computed-size/halo checks were insufficient for visual acceptance. The local rule now explicitly anchors the thumb with position:absolute, top:0, left:0, right/bottom:auto and margin:0, while retaining the native checked-state horizontal transform. This addresses inherited focus offsets rather than only diameter/border. **Device visual acceptance remains pending:** Ally SSH 192.168.1.14 is unreachable this session. This build has not been installed on the Ally and is not claimed visually fixed there.

TypeScript and all 1484 tests passed, package ZIP integrity passed. Local ZIP SHA256 `3958c0220b8efb41554e250a70052fc7ef5ad40203e84fcaebf3e7dcf7884dad`. Last installed Ally preview remains `e1abcbc0bb441b0b8d6d4d36e438749d71371ebd744c6ac7e9eebae04d25c94d`.

Updated the existing interactive mockup at `/Users/micpaal/.codex/visualizations/2026/10/19/01a15441-2ef2-7790-8927-16328698603a/glance-home-menu.html`: current Quick Settings controls, invariant on/off thumb alignment, local arrow navigation and 18 host Tweak bindings grouped as Menu layout, Glass and focus, Game context. Design choices persist in widget model state and restore on subsequent host state events. DOM execution checks passed initial rendering, all bound numeric ranges/repaints, save/restore, tabs, Configure menu, brightness capability and accent context. Browser visual verification unavailable in this session; no rendered-device claim. Existing More/Performance/Social/running-game/plugin mockups retained. No Git remote operations.

### Approved visual design and compact handheld preview — 2026-10-20

Applied the user's saved workbench values (exact snapshot and native mapping in `docs/superpowers/specs/2026-10-20-floating-menu-approved-visuals.json`): 22px padding, 10px gaps, 26px panel radius, 12px control radius, 4px blur, 30% glass opacity, 8% focus fill, 43% outline, 8px glow. Retain live game artwork accent and Steam-blue fallback; do not force mock game/display state or sample cyan accent.

User rejected the initial device size as TV-sized, then requested a further narrower/smaller Ally layout and no visible horizontal scrollbar. Final <=900 CSS-pixel viewport uses zoom .65 and compensated width92.307692vw, producing ~60% visual width. It retains the selected top offset with compensation and a 70vh pre-zoom panel maximum. Menu panel can scroll to offscreen controls; CSS scrollbar-width:none and scoped WebKit scrollbar display:none hide chrome. Horizontal overflow is contained in the owned panel/bar. Native settings and display scale were not changed.

Device investigation found native `button.cXzBZxhPBl7fZs9LODEnc.DialogButton` rules outweighed `.gg-menu .gg-menu-action`, imposing min-width160px, padding10px24px, font16px and native fills. Increased scoped selector specificity using native DialogButton class plus menu/button/action classes. Device computed min-width now0px; final screenshot shows all six tabs (including running Dorfromantik) in one row.

Final screenshot `/private/tmp/gg-final-compact-ally.png` at1920×1080 captured the829×467 CSS viewport: menu visually narrower with compact controls, no visible scrollbar, Bluetooth checked/focused with thumb visually aligned to its rail. This closes the previously unverified thumb-origin visual check; physical scale preference remains user acceptance. A supplementary old navigation script ran after the active panel changed to the running-game view and its Quick Settings targets were absent; those results are invalid for spatial-navigation acceptance. Navigation code itself was not changed. No setting toggles or volume writes issued by these checks.

TypeScript/full1484 tests/ZIP integrity passed. Final local and device ZIP SHA256 `4c30245c2d37e6f52f26d47b8789770ddfca42dd7b83d49117ce92318af1fc75`. Installed only the frontend and reloaded Decky. Original backup remains `/tmp/gg-floating-task4-original-index.js`; pre-design frontend also preserved at `/tmp/gg-menu-before-approved-design-20261020.js`. No Git remote operations.
