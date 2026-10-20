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

### In-game consistency, native chrome and direct mockup skin — 2026-10-20

User reported different in-game design, status/footer overlap, insufficient lower height, blackening of the body while caption actions remained normal, and explicitly requested applying the mockup's look. Applied its typography (Inter/Segoe/sans13px, heading16px, tabs12px), transparent inactive tabs/selected ring, navigation cards, caption actions, grouped controls, soft focus, and label/value slider layout. Sliders retain native readback/input and now disable Steam's field highlight. Their smaller18px thumbs stay centered in the native24px movement frame (3px inset); measured rail/thumb center difference ~.005CSSpx on device.

One shared canvas now covers60vw×84vh, starting7.6923vh from the top; scale is innerWidth*.65/829. No Home/in-game media-layout switch. **Use transform scaling, not CSS zoom:** zoom reported root right1020/bottom659 beyond829×467 although the visual was scaled. Final transform reports x165.86/y35.94/w497.59/h392.48, right663.45/bottom428.42, wholly inside829×467. Geometry, layout and control size remain proportional as Steam changes CSS viewport/DPR.

Native HeaderStore increment/decrement and FooterStore.HideFooter().unhide() are borrowed only while custom content is active, and released synchronously on close/suspend/dispose. Unit regressions cover preexisting other holds, idempotent release, acquisition-failure cleanup and unsupported stores. Device checked custom holds1/1, close0/0 with viewport lease removed, and native QAM owning its independent footer hold without a custom lease. Other native holds are preserved. Native status/footer rows no longer visibly rendered behind the custom menu; custom control hints remain.

Native MainMenuBrowserView's separate BackgroundGlass darkblur adds70%-black and8px blur. A scoped temporary rule targets only the backdrop containing the borrowed menu placeholder, removes that dark scrim/filter, and restores native styling on handoff/close/unload. No unrelated backdrop/root is hidden. Background module discovery follows named CSS contracts, not bundled numeric IDs.

**Remaining limitation:** the selected4px live backdrop blur is not applied in this device build. Controlled on-device comparisons showed black/missing regions with card-level backdrop-filter and also with a native-parent4px filter. Disabling both and using a stable composited root plus transform scaling produced complete repeated captures. Keep30% rgba(12,16,22,.3) card fill, thin edges and mockup skin; backdrop blur remains unresolved and must not be reported complete. The menu screenshot is its transparent browser layer, not the composited game; sampled PNG card alpha77 confirms30% opacity and outside alpha0. Spectacle one-shot composited capture was unavailable (timeout/no file); no recording started.

Final actual installed screenshot `/private/tmp/gg-installed-mockup-final.png` shows complete Quick Settings, all6tabs in one row, no visible scrollbars, and all controls within the taller panel. Dorfromantik1455840 remained running; no native setting writes/reset were issued by the styling checks. Physical Home/in-game acceptance remains user feedback.

TypeScript, all1488 tests, diff check and ZIP integrity passed. Final local/device ZIP SHA256 `b743dc4a3e90db6e5664681ec5485f751338291f9c2c560b0c97fc4d815b9c87`. Frontend only installed; original/pre-design backups retained; no remote Git operations.


### 2026-10-20: black rendering isolated with full compositor captures

Supersedes the prior inference that missing regions in `Page.captureScreenshot` proved actual device rendering failure. Those captures show an isolated transparent CEF BrowserView and can omit composited regions. For the actual game + Steam UI, gamescope's screenshot mode 3 (`full_composition`) is required; SIGUSR2 captures the base game alone on this device. Verified against Valve's [screenshot protocol](https://github.com/ValveSoftware/gamescope/blob/master/protocol/gamescope-control.xml).

One-frame capture (no recording, no changes to existing capture streams):

```sh
ssh ally 'DISPLAY=:0 xprop -root -f GAMESCOPECTRL_DEBUG_REQUEST_SCREENSHOT 32c -set GAMESCOPECTRL_DEBUG_REQUEST_SCREENSHOT 3'
# Wait for /tmp/gamescope.png to update, then copy it.
scp ally:/tmp/gamescope.png /tmp/ally-menu.png
```

Actual compositor A/B tests reproduced the reported symptom: restoring the native parent BackgroundGlass dark scrim produced solid black bar/body cards while the caption actions stayed transparent. Removing only its dark background cleared the black cards, with native CSS blur retained; removing only blur left the black cards. Card-level CSS blur did not blur the underlying game. Thus black-card diagnosis points to the native parent/child BrowserView compositing interaction, not the menu's requested 30% card fill.

Steam's discovered GamescopeService exposes `SetBlurEnabled`, `SetForceSuppressBlur`, and `ApplyBlurState`. Its implementation reference-counts blur, honors native force suppression, and sets conditional compositor blur with native radius32/fade300ms. A borrowed hold produced real game blur beneath the translucent overlay. Production now acquires exactly one hold per active host and releases on close, native handoff, failure or unload; it neither resets native counters nor changes suppression/radius/persistent settings. CSS backdrop filters remain off. Native radius32 is not a claim of matching the mockup's 4 CSS pixels.

Regression tests RED→GREEN verify balanced ownership with two existing holds, idempotent release, unchanged suppression, and unavailable-service fallback. A further RED→GREEN guard rejects an unknown native backdrop shape before installing custom viewport CSS, returning to the native Steam menu rather than retaining a black scrim. TypeScript, all1491 tests, ZIP integrity and diff checks passed. Final installed local/device ZIP SHA256 `1eda7e891ddca93fb782ac7a5eac5bc77560b0b122759bc8b1ff5889b44c205e`. Frontend backup `/tmp/gg-menu-before-compositor-blur-20261020.js` retained.

On Ally with Dorfromantik1455840 running: three close/open cycles each returned blur holds0→1; native Quick Settings handoff returned0 and removed the owned viewport/scrim style; returning to custom restored1 and the style. Full compositor captures of Quick Settings and Navigate show live blur and translucent cards with no opaque black panels. Original screenshot before the fix diagnostic: `/private/tmp/gg-composite-scrim.png`; final installed capture: `/private/tmp/gg-installed-compositor-final.png`; Navigate: `/private/tmp/gg-installed-compositor-navigate.png`. Physical controller acceptance remains user feedback. No setting controls were changed, game stayed running, and no Git remote operations occurred.


### 2026-10-20: remove irregular blur halo and dismiss outside mouse/touch clicks

User rejected the irregular shadow-shaped blur extending below and around the cards. On-device A/B removed the exterior `0 16px 48px #0003` drop shadow while retaining the inset edge. Actual full-composition screenshot shows blur following the rounded bar/panel rather than the larger drop-shadow silhouette. Steam native blur hold remains1/mode1, force suppression false. The final installed screenshot was taken after removing the temporary diagnostic stylesheet: `/private/tmp/gg-installed-clean-glass-second.png`. A first immediate capture during the compositor refresh showed an unblurred frame; the settled second capture confirms live game blur is retained.

Outside dismissal listens to the shared mouse/touch `click` activation on the borrowed popup document in capture phase, only while the custom shell is mounted. Inside descendants are ignored; outside activations are prevented/stopped before closing, and native modal/keyboard ownership is respected. This does not add a global controller listener or settings writes.

Regression tests RED→GREEN cover inside/outside activation, event consumption, listener removal/idempotent cleanup and native modal ownership. TypeScript/full1493 tests/ZIP integrity pass. Installed local/device SHA256 `8d237883fb8f4da885e58c2f54dc37b1c43b25a27b49d66fdb0528d9a1ea1327`; frontend backup `/tmp/gg-menu-before-outside-dismiss-20261020.js` retained.

Device CEF input injection (not a claim of physical touchscreen testing): real `Input.dispatchMouseEvent` press/release at inside200,132 leaves menu open; outside20,20 closes it, releases blur to0 and removes viewport CSS. `Input.dispatchTouchEvent` start/end at the same inside/outside positions gives the same result. Inside Quick Settings tab click remains functional. Reopened final menu for user feedback, Dorfromantik1455840 still running; no setting controls changed and no Git remote operations.


### 2026-10-20: readable typography, stronger focus, endpoint alignment and clean chrome

User reported hard-to-read labels, weak focused-row contrast, microphone thumb inset at100%, missing notification glass, and unwanted surrounding labels/X. Native style now uses Steam's loaded Motiva Sans500 instead of the unavailable Inter/Segoe fallback, 70% card tint, primary#f4f6f8 and secondary#d5dce3. This supersedes the prior30% native tint after actual bright-game feedback. Panel and canvas scale remain the same; heading/group/secondary spacing was tightened to preserve fit with native font metrics. Quick Settings content height equals panel height, with no overflow. No claim of a full accessibility audit.

The initial22% accent/dark focus fill and70% outline were rejected as too blue and dark. Final focused rows/buttons use a neutral6% white fill and43% accent outline, retaining rounded corners and restrained glow. Native handle travel centers range12px..(width-12px), whereas the overridden full-width track extended beyond them. Narrowing only the track to calc(100% -24px) aligns it with the existing thumb travel. On the installed Ally, Volume0% thumbcenter195.0198 versus trackleft195.0175; Microphone100% thumbcenter634.2972 versus trackright634.2928 CSSpx. No audio values changed to perform this check.

Notifications now has its own70% glass pill/border/inset edge, badge still left of bell. Removed X close action, Game Glance caption, footer controller hints, and old LB/RB badges. At the user's follow-up, restored compact ‹ L1 / R1 › indicators at the bar ends. Tab labels retained; native shoulder/B navigation logic remains. Outside mouse and touch CDP press sequences both close the final menu. Notification click still opens native QAM tab0 with custom blur released; returned to custom menu afterward. Physical controller/visual acceptance remains user feedback.

TypeScript, full1493 tests, ZIP integrity and diff checks passed. Final local/device SHA256 `c43e81d8bebf869830ee5a69f3952d00022d909daa133f31cd7a267c9ae48a7d`. Frontend backups `/tmp/gg-menu-before-contrast-20261020.js` and `/tmp/gg-menu-before-clean-chrome-20261020.js` retained. Final full compositor screenshot `/private/tmp/gg-readable-soft-focus-hints.png` taken from the installed build with all temporary diagnostic styles removed. Dorfromantik1455840 remains running; settings unchanged and no Git remote operations.

Final follow-up verification: neutral focus computed rgba(255,255,255,.06), ‹L1/R1› hints present, all6 tabs fit horizontally and QuickSettings fits vertically. No additional slider/setting writes. Native color/focus controller logic unchanged.


### 2026-10-20: use the mockup focus treatment directly

User preferred the actual mockup highlight to further approximations. Compared `glance-home-menu.html` rules283–284: accent8%/transparent fill, accent43% outline at current saved state,8px glow with10% accent,12px corners,2px setting-row outline offset. Live version's neutral6%white fill was the remaining mismatch. Production now uses the same values as explicit focus tokens. Verified no additional native field background/outline/shadow competed with the owned focus treatment. Notification focus layers the tint over its existing glass so focus cannot remove its frosted base.

TypeScript, full1493 tests and ZIP integrity passed. Final local/device SHA256 `3f9b3872f094b6fe0e350fa6f0c2ccc8f6c1fd3deb92072964699fb251f37051`. Installed Ally reports8%accent fill,43%accent outline,~2px offset,8px glow/10%accent and12px radius. Actual full-composition screenshot `/private/tmp/gg-mockup-focus-final.png` visually checked; original pre-focus frontend retained at `/tmp/gg-menu-before-mock-focus-20261020.js`. Readability tint/font, L1/R1 hints, slider alignment and notification glass retained. Physical visual acceptance remains user feedback; no setting writes or remote Git operations.

2026-10-20 focus contrast follow-up: User requested pushing highlight contrast further. Changed only focus fill8→14% and outline43→55%; mockup12pxrounding/2pxrowoffset/8pxsoftglow retained, no dark fill. TypeScript/full1493/ZIP integrity/diff pass. Installed/localSHA72d1c0f83d4c854559bb725efb0ceb42cdd5979341a34bef77b2673e0f5f198c. Actual Ally computed14%/55% verified and compositor screenshot /private/tmp/gg-focus14-final.png inspected. No setting writes or remote Git operations; physical acceptance pending.


### 2026-10-20: match Game Glance Home glass material

User explicitly requested the Home look. Extracted existing Home action-button values into `src/styles/homeGlass.ts`: rgba(12,16,22,.4) surface,18% white border, white text,700 action font weight,12px Home CSS blur reference. Home CSS consumes the shared values without changing its generated action-button appearance. Floating menu panels/bar/notification use the same40% surface and18% edge; navigation/actions use the shared material and white700 text. Native direct settings stay unboxed and readable.

Replaced the prior heavy70% menu tint with Home40% glass over an owned28% dark full-viewport backdrop inside the custom popup. Native parent scrim remains cleared. The existing balanced gamescope blur hold now frosts the scene across that backdrop rather than only the card silhouette, visually separating the menu from the bright game. This intentionally changes background treatment to follow Home's layered glass look. Home12px CSS blur and Steam native radius32 remain different units; no claim of pixel-identical kernels or cross-window CSS filtering.

Temporary comparison CSS removed before final captures. Actual installed full-composition screenshots `/private/tmp/gg-home-glass-quick-final.png` and `/private/tmp/gg-home-glass-navigate-final.png` show complete readable UI and frosted background, no black panels. Computed40%glass/18%border/28%backdrop verified and QuickSettings content fits. Outside mouse click closes custom menu and releases blur to0; reopened for user review. No settings changed, Dorfromantik1455840 still running.

TypeScript, full1493 tests, ZIP integrity and diff checks passed. Local/deviceSHA256 `fa04246b31d55a380fdee0d88f4cd39367d5ee3d7b286770f0c6c0a35252b2da`; original frontend retained `/tmp/gg-menu-before-home-glass-20261020.js`. Physical visual acceptance remains user feedback; local Git only.


### 2026-10-20: annotated screenshot feedback

Applied user annotations: mirrored full-height L1/R1 bar endcaps with inward dividers; darker selected tab even when focused; ellipsis-only More with accessible name retained; icons beside every quick control;56px equal-height toggle rows with vertically centred label/switch; removed Friends & Chat helper copy. Native direct-toggle behavior, checked state, thumb anchors, errors and controller navigation retained.

Accent reuse now reads Home's existing persisted cache, not only its session memo. `resolveMenuAccent` reads the current artwork-version key and hydrates the shared memo, never resamples/writes persistent artwork data, and rejects a cache result when artwork changes during the read. A newer Home memo result wins. MenuShell drops async results after close/game changes; unavailable color still uses Steam blue. Seven regression cases RED→GREEN cover warm reuse/no storage read, reload hydration/version key, malformed/null/missing data, artwork race, fresher Home result and cache errors.

Actual Ally after plugin reload with Ori1057090: menu accent#3d33cd matches Home's persisted current artwork-version1792218248 entry. Older cached versions contain#554fc1 and were not selected. All6 toggle rows measured36.396CSSpx after the existing transform (56logicalpx), with text/switch centres matching row centre within.00003CSSpx. Each has one icon and no helper text. Active tab computedrgba(7,10,15,.45); More visual text empty/accessibility label More. More click opens its Configure menu view; all tabs and panel content fit. Final full compositor capture `/private/tmp/gg-annotations-final.png` visually checked. No setting writes; user volume61% and microphone100% left as found.

TypeScript, full1500 tests, ZIP integrity and diff checks passed. Local/deviceSHA256 `9fb9511cffd304600e4eab4058fb6d55b2d2bf8a1b3e6d13ba1b40e7a25ed11a`. Frontend backup `/tmp/gg-menu-before-annotations-20261020.js` retained. Physical feedback remains user acceptance; no Git remote operations.


### 2026-10-20: Frost only the menu surfaces

Supersedes the full-viewport28% dimming layer above: removed it so the surrounding screen remains sharp and recognizable. Steam content is frosted by three pointer-transparent owner-document panes (bar, panel, Notifications), each20CSSpx blur with measured rounded bounds. Resize/mutation observers follow popup geometry. Native parent scrim stays clear; balanced Steam native blur still handles actual game surfaces. Native32 and CSS20 use different units.

Actual gamescope mode3 screenshots inspected: `/private/tmp/gg-menu-only-production-library.png` shows sharp Library covers around the frosted menu; `/private/tmp/gg-menu-only-production-game.png` shows the game sharp outside the menu with blurred content inside. Temporary probes removed. Installed production has one owned layer/three panes; close leaves zero layers and blurcount0; native Quick Access handoff leaves zero custom layers. Returned to the running-game route; the active app changed during the session (1392820 in the captured game check,1057090 at final readback). Final menu closed cleanly with zero owned frosting layers. No settings changed.

Three regressions cover scoped geometry/no whole-screen filter, movement/cleanup, and transactional cleanup on initialization failure. TypeScript, all1503 tests across133 files, ZIP integrity and diff checks passed. Local/device ZIP SHA256 `6d3daf0a91521107135635201846cb913ef7058c2ae6838250105a41c3e5eea2`; frontend backup `/tmp/gg-menu-before-menu-only-frost-20261020.js`. Visual acceptance remains user feedback. Local Git only.


### 2026-10-20: Text and icon legibility

User accepted menu-only frosting and reported weak text/icon readability. On the bright Ori1057090 scene, the existing13px medium500 labels and muted2-unit SVG strokes were too slight at the0.65 menu scale. Labels/headings/values now use loaded MotivaSans700 and white, with a subtle0 1px 2px #0009 text shadow; inactive tabs/setting/grid icons white. Setting icons17→18px, SVG currentColor stroke2→2.4; no icon rasterization or blur filters introduced. Menu scale/frosting remain unchanged.

Installed full-compositor before/after captures `/private/tmp/gg-legibility-before.png` and `/private/tmp/gg-legibility-after.png` inspected against the same bright scene: clearer lettering/strokes, all controls visible. TypeScript/full1503 tests across133 files/ZIP integrity/diff checks passed. Local/device SHA256 `06a9477a38e4cc49669394342230a70568db2e3e240f210111c8e41038eaf05c`; backup `/tmp/gg-menu-before-legibility-20261020.js`. Left installed for physical user feedback. No settings changed, local Git only.


### 2026-10-20: Navigate focus visibility

Actual Ally screenshot and computed styles reproduced focused Library with the same resting40%glass background as its neighbors. The grid resting selector outweighed the generic focus fill, leaving a thin55% dark-purple outline as the only cue. Added an explicit grid-focused selector for both controller gpfocus and keyboard focus-visible:14%white overlay over retained Home glass,2px rounded80%white/20%accent ring and inset accent edge. No exterior blur/glow or geometry changes.

Installed mode3 capture `/private/tmp/gg-navigate-focus-after.png` inspected over bright Ori1057090: Library has a distinct bright rounded ring and lighter fill; neighbors retain resting styling. Native navigation code unchanged; physical controller feel remains user feedback. TypeScript/full1503 tests across133 files/ZIP integrity/diff checks passed. Local/device ZIP SHA256 `06ffb0652fc5819043759a98c2fa64a7cacc4049ff1ef23e25527447c90bce5d`; backup `/tmp/gg-menu-before-grid-focus-20261020.js`. No settings changed or Git remote operations.


### 2026-10-20: Toggle-induced text flicker

Reproduced Do not disturb true→false→true on the Ally. DOM trace showed no root remount, text style changes, or viewport/frosting lease replacement. Isolated MainMenu CEF PNG frames showed setting labels switching between sharp and blurred rasterization during toggle updates, while the title/tabs stayed unchanged. Native field `.Panel` carries `scale(1) rotateX(0deg)` and transform/focus animations beneath our0.65 root scale. Removing only those native field transforms/transitions/animations stopped the raster changes in the comparison; native thumb movement remains untouched.

Production scoped `.gg-menu-setting .Panel` now sets transform/transition/animation:none!important. Temporary CSS/DOM observers removed before production verification. Installed CEF17-frame toggle+restore capture `/private/tmp/gg-toggle-production/`: all sampled untouched title/Volume/Wi-Fi/Night/tab crops pixel-identical across every frame; DND restoredtrue. Before capture `/private/tmp/gg-toggle-before/` reproduced Volume/Wi-Fi pixel changes. Final actual gamescope mode3 capture `/private/tmp/gg-toggle-flicker-final.png` inspected for complete layout/glass. This addresses measured field raster flicker; physical user feedback remains final acceptance.

TypeScript/full1503 tests across133 files/ZIP integrity/diff checks passed. Local/device ZIP SHA256 `fb054604069dc30e8f7b4eaf39a4e9c1fc8e8a7ad687b336fb1cc94332fef6b3`; backup `/tmp/gg-menu-before-toggle-flicker-20261020.js`. Only DND toggled for reproduction and restored; other settings untouched. No Git remote operations.


### 2026-10-20: Fuller focus glow

User requested improved glow. Focus halo8→12px, faint10%raw accent→26% of a70%accent/30%white mix so dark game accents remain visible, plus10px inset12%accent glow. Navigate grid retains its bright rounded ring with this shared halo. Menu panel/bar exterior shadows unchanged. Installed mode3 screenshot `/private/tmp/gg-focus-glow-final.png` inspected: soft focused Volume edge, no broad menu/background blur. Stable field transform fix retained.

TypeScript/full1503 tests across133 files/ZIP integrity/diff checks passed. Local/device ZIP SHA256 `c148d7ee02068d2c3db075b3c94c079eebe0f04e5bf17970e2f52a5d4b17a877`; backup `/tmp/gg-menu-before-focus-glow-20261020.js`. No setting writes or Git remote operations; user visual acceptance pending.


### 2026-10-20: Match Home information-card focus

User rejected the Navigate ring as inconsistent with Game Glance. Actual Ally capture `/private/tmp/gg-ring-review.png` shows the white-mixed offset outline plus inset edge. Compared Home's actual `.gh-card.gh-card-focus` shadow in home/homeCss.ts:1px game-accent edge and0 16px 40px -12px accent glow. Extracted that exact string to `homeCardFocusShadow` in styles/homeGlass.ts; Home continues generating identical shadow values. Menu actions/settings/grid now consume it, removing white-mixed outlines, inner rings and separate focus-fill overlays. Active tab dark fill retained; no focus transforms introduced, stable field rendering preserved.

Installed actual mode3 screenshot `/private/tmp/gg-home-card-focus-final.png` inspected: single accent edge and soft glow beneath Library, no double pale outline. No change to menu size/frosting or settings. TypeScript/full1503 tests across133 files/ZIP integrity/diff checks passed. Local/device ZIP SHA256 `53f9433bd1fe02fbaac03d06487361c84d1e5fb51efd9543b410e48885c6e34a`; frontend backup `/tmp/gg-menu-before-home-card-focus-20261020.js`. User visual acceptance pending; local Git only.


### 2026-10-20: Requested Navigate destinations

Navigate now shows Home/Library/Store on the first row and Downloads/Settings/Power on the second. Profile removed from the grid. New Home action routes to the existing shared HOME_ROUTE `/library/home`; internal native Profile routing left available to existing callers. Home route regression RED→GREEN. TypeScript/full1504 tests across133 files/ZIP integrity/diff checks passed.

Installed grid DOM/order and actual mode3 screenshot `/private/tmp/gg-navigate-home-grid.png` verified. Activated Home: route `/library/home`, Game Glance `.gh-root` present, menu closed. Returned to the running-game view and reopened Navigate. Local/device ZIP SHA256 `5cd9b1f4f8b58e50b42e300e8a84283d2556ed7c7080bec173d224e88ce6a07a`; frontend backup `/tmp/gg-menu-before-home-tile-20261020.js`. No setting changes or Git remote operations.


2026-10-20 Store icon: replaced LuStore storefront with LuShoppingBag, retaining the existing23px/2.4stroke white vector styling. Installed actual mode3 screenshot `/private/tmp/gg-store-bag-final.png` inspected. TypeScript/full1504 tests/ZIP integrity/diff checks pass. Local/device ZIP SHA256 `4dd07f2281492af6e9a233a8d9f96f7037f891d4a9373da2a313140b16ebd9e7`; frontend backup `/tmp/gg-menu-before-store-bag-20261020.js`. No settings or route changes, local Git only.


### 2026-10-20: Top-bar readability parity

Ally computed styles confirmed tab weight700 but shadow:none (native button reset),12px text and14.4px icons, unlike the improved setting labels. Tabs now explicitly use13px700 white text/0 1px 2px #0009 shadow and18px icons; shoulder text11→12px700. Preview removed before production check. Actual mode3 `/private/tmp/gg-top-readability-final.png` inspected; all six tabs fit without clipping, bar764client/764scroll. Menu scale/frosting unchanged.

TypeScript/full1504 tests/ZIP integrity/diff checks passed. Local/device ZIP SHA256 `735dc05eb99723e543822689cabb7550e599d2e2344869e01690f1133f8e08ac`; frontend backup `/tmp/gg-menu-before-top-legibility-20261020.js`. No setting writes or remote Git operations.


### 2026-10-20: Live Brightness and requested Quick settings layout

Brightness was hidden because the native value is a subscribable `{Value:1}` and Steam labels the Ally windowed session external despite `is_display_brightness_available:true`. Seed from numeric or wrapped Value; use explicit native brightness capability when present, falling back to existing internal-display metadata only when the capability is absent. Include capability in polling fingerprint so availability changes reach adapters. Existing native callback/setter and write-confirmation lifecycle retained. Two discovery regressions RED→GREEN cover wrapped/windowed live readback/write confirmation and explicit unsupported capability.

Final requested layout: full-width Brightness first, Volume/Microphone side by side beneath; remove Open Steam Quick Settings button and unused handoff prop. Initial three-column comparison discarded after user steering. Installed DOM confirms sliderorder/widths467.87/230.69/230.69CSSpx and audio samey209.69; panel474client/474scroll, no quick:native button. Actual gamescope mode3 screenshot `/private/tmp/gg-brightness-layout-final.png` inspected; all content fits. Live slider test on preceding discovery-equivalent candidate changed100→89%, native value0.8899999857 and visible89% confirmed, then restored100%; final native readback1 and visible100%. Volume61%/Microphone100% untouched.

TypeScript/full1506 tests across133 files/ZIP integrity/diff checks passed. Final local/device ZIP SHA256 `a6b47abfad9b405b5882609fe756c3ac154bf47cacef0a0827465ee4835e7209`; original pre-brightness backup `/tmp/gg-menu-before-brightness-20261020.js`, pre-layout backup `/tmp/gg-menu-before-brightness-layout-20261020.js`. No Git remote operations.


### 2026-10-20: Live Game Glance status bar while menu opens

Reuse existing GameStatusBar/StatusBar and shared Home CSS/canvas scale, clock, battery/connection subscriptions, downloads and persona/avatar settings. New menuOverlay prop keeps only the popup foreground copy visible despite native menu-open state; existing Home/game-page away behavior remains default. MenuShell mounts it only during custom-open; body portal avoids the menu transform. Scoped frosting tracks its pill separately from the three menu surfaces and observes popup body portal mount/unmount. Native header/footer holds unchanged.

Portal frosting regression RED→GREEN covers dynamic outside-root pill geometry and removal. TypeScript/full1507 tests across133 files/ZIP integrity/diff checks passed. Installed mode3 screenshot `/private/tmp/gg-menu-status-final.png` inspected: one top-right live bar showing Wi-Fi/47%charging/14:40/avatar without menu overlap. Popup boundsx588.33/y3.98/w221.01/h32 at829x467, opacity1/aria-hiddenfalse. Open panes4; close leaves zero frost layers/status hosts; native QAM handoff has zero custom layers/status hosts; closed-menu Home retains exactly one visible status host. Returned to in-game menu. No settings writes (user volume78% was read as found).

Local/device ZIP SHA256 `f73e6aeaf5298df432d6c3bcbb24c40c10d81d44a84f9a52c4e854767ed7e605`; frontend backup `/tmp/gg-menu-before-status-bar-20261020.js`. No Git remote operations; user visual acceptance pending.


2026-10-20 notification/status spacing: actual Ally screenshot showed bell directly touching the status pill vertically. Align menu header notification pill to the left, retaining menu/panel/status geometry. Installed mode3 `/private/tmp/gg-status-bell-final.png` inspected: bell above left edge, status top-right,386.07CSSpx horizontal gap; no clash. TypeScript/full1507 tests/ZIP integrity/diff checks pass. Local/device ZIP SHA256 `7b35d43766798c6334ddb1f2f86dd3e55d7e051093c381fa3cf00fd8cc70abc3`; backup `/tmp/gg-menu-before-status-bell-20261020.js`. No setting writes or Git remote operations.


### 2026-10-20: L1/R1 stale In Game focus

Actual Ally DOM reproduced Quick settings aria-pressedtrue with In game gpfocus/DOMfocus. Steam native `FocusNavController.DispatchVirtualButtonClick(5/6)` reproduced Navigate→Quick restoring section:in-game. Global tab/notification focus had been saved as the current panel's focus key. Reducer now excludes those shell targets from per-panel history. Restoration repairs stale section:* keys to the selected tab; when section switching originates in the bar, layout effect captures that intent and synchronously/next-frame moves both DOM and Steam focus to the active tab. Panel-origin switching retains panel restoration.

Two regressions RED→GREEN cover global-focus history and stale/selected-tab resolution. TypeScript/full1509 tests across133 files/ZIP integrity/diff checks passed. Installed native L1 from panel→Navigate/Home, R1→Quick/Brightness: no In Game tab focus. From bar R1→Performance and L1→Quick aligned selection/focus; full six-tab R1 wraparound aligned exactly one gpfocus tab with aria-pressedtrue at every step. D-pad up can still move focus to an unselected tab before activation (separate focus/selection); shoulder step realigns to newly selected tab. Actual mode3 `/private/tmp/gg-single-tab-focus-final.png` inspected: only Quick settings highlighted. Temporary focus observer removed; no setting writes.

Local/device ZIP SHA256 `727cca9d17d9ce40a393474811a39de39e4c15a0df93634530060cb904bbae0b`; frontend backup `/tmp/gg-menu-before-tab-focus-20261020.js`. No Git remote operations.


### Capability-aware Performance — 2026-10-20

Implemented Task 7 in the local floating-menu worktree. General, Display, Power & GPU, and Overlay use the existing menu glass/readability/focus styling. General retains the three-part Performance profile pill and adjacent Disable limit/VRR toggles. The General and Display panels each fit the Ally's 474px panel with no scroll overflow; all top-bar items fit its 764px width.

Native bindings are intentionally split: SteamOSManager/Gamescope capability services and `settingsStore` client settings supply platform controls, while `SystemPerfStore` owns legacy scaling/VRR/overlay and per-game profile selection. Platform limits win over stale legacy limits: this Ally reports 4–20 W and 200–1800 MHz, with Low power/Balanced/Performance choices. Unsupported HDR is omitted even though the saved HDR preference is true. Frame/refresh choices come from the active Gamescope connector; fractional native values are preserved. Client-setting scope remains unknown rather than being labelled per-game. Queued writes invalidate on game/account/display/capability changes. FPS/GPU commands coalesce at 700/200ms; other continuous controls at 100ms. Normal close/unload never saves, resets or restores user settings.

Programmatic device checks used the real UI controls and authoritative native readback, not mocked state:

- Profile: Performance → Balanced → Low power → Performance.
- Disable limit: true → false → true; frame target: 60 → 61 → 60 FPS while limit was enabled.
- VRR: true → false → true; tearing and half-rate shading: false → true → false.
- Refresh: 120 → 119 → 120 Hz.
- Scaling: Auto=1 → Stretch=5 → Fill=4 → Auto=1. Filter: Linear=1 → Pixel=2 → Linear=1.
- TDP: enabled, 20 → 19 → 20 W, then disabled. GPU: enabled, 1800 → 1700 → 1800 MHz, then disabled.
- Overlay: 0 → 1 → 0; Show overlay in Steam: true → false → true.
- Final client/legacy value comparison exactly matches the captured starting values. Native current game 1057090/active profile 769 remained unchanged. These are stored-value checks; effective gameplay/frame timing was not measured.
- Steam native virtual D-pad/A dispatch traversed all four subsections, entered their controls, and moved left/right across the section row. Physical controller feel remains user acceptance.
- Both Open Steam Performance and Reset in Steam opened native QAM tab5. Custom menu/status content cleaned up; neither action reset settings. Reopened successfully and left on General.

The first native dropdown experiment moved focus into Steam's separate popup and lost the custom menu after selection. Scaling selectors now render native MenuAction choices inside the panel; final device checks confirm selection/readback without leaving the menu. No global input or native popup behavior was patched.

Per-game profile dispatch, scope transitions and cleanup are covered by tests. Creating a previously unused profile and cross-game persistence were deliberately not device-tested; no native SaveGameProfile or custom profile storage is introduced. Custom Reset remains deferred to Steam's own workflow. Physical AC/display changes were not induced; notification-driven capability refresh and queued-write cancellation are covered by tests.

TypeScript, all **1,523 tests across 135 files**, packaging, ZIP integrity and diff checks passed. Final ZIP SHA256: `4771aa6d31ddf8c666f18b743b5208355ee511d529906ecfd2d161c8a3a1d833`; device hash matches. Only the frontend was installed. Backups: `/tmp/gg-menu-before-performance-20261020.js` and `/tmp/gg-menu-before-performance-final-20261020.js`. Temporary layout probe removed. Screenshots: `performance-general-2026-10-20.png` and `performance-display-2026-10-20.png` in the task's local visualization folder. No Git remote operations or publication.


### Steam-native Performance icons — 2026-10-20

Replaced the generic Performance artwork with Steam's own components: the tab's lightning icon, Disable limit, VRR, tearing, half-rate shading, TDP and GPU clock. A single cached icon-module lookup matches verified SVG geometry, not minified export names or numeric module IDs. Fields that have no native icon (such as frame limit, per-game selection and scaling) now use text only. Missing native artwork stays absent with its text/control usable. Native SVG fills are preserved; the Lucide stroke override does not apply to them.

Installed on the Ally. Compared all seven rendered SVG trees/attributes with their native Quick Access originals: exact matches. General remains474client/474scroll and bar764client/764scroll. Actual compositor screenshot `performance-steam-icons-2026-10-20.png` in the task visualization folder inspected; crisp distinct icons, unchanged glass/scale. No setting writes. TypeScript/full1523 tests across135files/package/ZIP integrity/diff checks pass. Local/device ZIP SHA256 `609a093fa9fe637643f56566791d70d44cfdad1fb004eb50e3ad50248ec4347a`. Frontend backup `/tmp/gg-menu-before-steam-performance-icons-20261020.js`. Local Git only.


### Performance spacing and touch corners — 2026-10-20

User requested more separation between profile pill and Use per-game profile, removal of Open Steam Performance and Reset in Steam, and stable rounded corners on touch. Added12px logical margin above the native profile row; removed both footer actions, unused handoff prop/import, and obsolete action CSS. This explicit user request supersedes Task7's earlier requirement to retain those two visible actions.

Reproduced the touch issue with CEF Input.dispatchTouchEvent and requestAnimationFrame sampling: section-button computed borderRadius changed12px→2px→12px without inline style changes during activation. A scoped important12px radius on Performance section buttons prevents Steam's transient pressed shape from overriding our rounded tabs. Final production build sampled all four tabs through touchStart/touchEnd: radii stayed12px throughout and each correct section activated. Diagnostic style removed; no input hooks retained.

Ally final readback:12px logical profile margin (7.80CSSpx after menu transform), both footer action elements absent, panel474client/474scroll. Actual compositor screenshot `performance-spacing-2026-10-20.png` inspected. No setting writes in this pass; live user profile/FPS selections left as found. TypeScript/full1523 tests across135files/package/ZIP integrity/diff checks pass. Local/device ZIP SHA256 `0d1dd81905583b3b581b468756b452ed08bd5953942863f7285492f700b2a293`. Backup `/tmp/gg-menu-before-performance-spacing-20261020.js`. Local Git only.


### Performance organization and native behavior corrections — 2026-10-20

Requested sections are now Display (previous General), Scaling (previous Display), Power & GPU, Overlay. Performance profile pill moved to Power & GPU. Per-game profile remains outside the subsection content in the top-right header, opposite Performance and battery and its live battery summary. Removed the standalone refresh slider from Scaling. Display has one frame-control slot: native FPS target normally, native Hz control when Disable limit is on and refresh switching is available. FPS and refresh preferences remain independent; swapping the slot does not overwrite either. Refresh commands now match native700ms coalescing.

Scaling uses native notched sliders with the same labels and order as Steam: Auto/Integer/Fit/Stretch/Fill and Linear/Pixel/Sharp on this Ally. Sharp (native filter3) reveals Sharpness. Its native profile-aware SetFSRSharpness binding uses live fsr_sharpness_min/max (0–5 on Ally),100ms coalescing, authoritative readback and filter-change invalidation. Unsupported sharpness is omitted. Scaling labels align at identical left187.21649CSSpx; no refresh or platform profile selector appears here.

Root causes verified on native Steam and the candidate:

- Touch activation temporarily applied16px/20px typography instead of13px/16.9px, increasing tab height despite the preceding corner fix. Pin scoped section-button font size, line height and height. Real touchStart/touchEnd with frame sampling across all four sections now keeps font13px, line16.9px, corners12px and identical width/height within each press. No diagnostic hooks or styles remain.
- Native overlay notches are **Off/1/2/3/4 → enum0/4/1/2/3**, not consecutive enum order. Native React props were inspected read-only to verify that mapping; production never reads or mutates fibers. The adapter options and visible labels now use the verified order. This corrects the preceding Task7 assumption that raw1 meant visible1.

New regressions ran RED (4failed/14passed) then GREEN (18/18 targeted): overlay label order and dispatch, Sharpness bounds/setter and pending-write cancellation on filter change, native sharpness collection, and700ms Hz writes. Full TypeScript/1,527tests across135files/package/ZIP/diff checks passed.

Programmatic Ally UI verification:

- FPS60 → Disable limit on → Hz120;119→120Hz; Disable limit off returnsFPS60. FPS61→60 readback confirmed. No duplicate frame slider.
- Scaling Auto1→Stretch5→Auto1; filter Linear1→Pixel2 (no Sharpness)→Sharp3 (Sharpness appears at3); Sharpness3→4→3; filter restoredLinear1.
- Overlay visible1/2/3/4/Off produced native4/1/2/3/0. Hidden native QAM selector independently reported matching visible notch1/2/3/4/0 for every selection.
- Final exact client/legacy/native profile comparison matches the captured starting values. No per-game profile was created/toggled by these checks.
- Native D-pad/A traversed sections and Down entered FPS, scaling mode, profile pill and overlay respectively. Returned to Display with native focus aligned. Physical feel remains user acceptance.
- Display, Scaling and Power & GPU each fit474client/474scroll; per-game header remains visible. Actual compositor screenshots `performance-display-reorganized-2026-10-20.png`, `performance-scaling-reorganized-2026-10-20.png`, and `performance-power-reorganized-2026-10-20.png` in the local task visualization folder inspected. Existing glass, menu scale, icon artwork and status bar retained.

Installed ZIP/local-device SHA256: `5b755dc62c82df248f1cef3de3f15639855b5462bfccbb61d49836fe8a37acba`. Frontend backup `/tmp/gg-menu-before-performance-reorg-20261020.js`. No Git remote operations or publication.


### Single status bar and stable Home footer reservation — 2026-10-20

User reported a blurred duplicate status bar behind the custom menu's foreground copy and Home card/footer overlap after the footer returned. Native inspection reproduced both: GameStatusBar passed away=true, but StatusBar's older Quick Access rule deliberately kept its bar visible when the page lost focus. Home's legend hook measured only at mount/size change plus two timers; a measurement while the menu had removed the footer left the fallback46logical-pixel reserve indefinitely after the42CSS-pixel footer returned.

Custom host now owns a scoped, synchronous background-status lease in its owner document: only Game Glance's page `.gg-status-host` copies are hidden (visibility/opacity, no fade); the popup's `.gg-menu-status-host` stays visible. The style is removed on close, handoff, failure or disposal along with the existing balanced native chrome/blur holds. Ordinary native-menu status behavior is unchanged. No screen-wide blur/material changes or native-root hiding were introduced.

Home now observes footer removal/remount with a coalesced owner-document MutationObserver, follows the measured footer with ResizeObserver, and remeasures on window resize. It retains the last real footer height while the footer is absent rather than shrinking to the fallback. A late-mounted footer is detected even if Home first mounted under an open menu. Teardown removes observers/listeners/pending animation frames.

Regression RED3failed/17passed → GREEN31targeted tests. Full TypeScript/1,530tests across136files/package/ZIP integrity/diff checks passed. Tests cover removal/remount, initial missing footer, preserved reservation, callback cleanup and scoped status-style ownership.

Ally verification, through live DOM/native menu handlers and actual mode3 compositor screenshots:

- Closed Home: one visible page status, reserve74logical px and shift29px (previous46/57). Card row bottom412.26279CSSpx; footer top424.52856CSSpx:12.26578px clearance.
- Three custom-menu open/close cycles: the page status was hidden immediately on opening and remained hidden (visibility:hidden/opacity0); popup contained exactly one foreground status copy. Native footer temporarily absent, but reserve74/shift29/card-row bottom stayed identical throughout. Every close restored one visible page bar, zero popup copies, zero status leases/frost layers and the same12.26578px footer clearance.
- Native notification handoff opened native menu2 and released custom status/frost resources; closing it retained the same Home reservation and card clearance.
- Actual screenshots `menu-single-status-2026-10-20.png` and `home-footer-restored-2026-10-20.png` in the task visualization folder inspected: one clean foreground status, no blurred twin, and restored footer below the cards. Left on Home with the menu closed. No setting writes.

Installed local/device ZIP SHA256 `33407c524507e0a634fe2f5de01092827c64c55bc5e2accfc2f831a4682bf2ef`; frontend backup `/tmp/gg-menu-before-home-bars-20261020.js`. All work remains local; no Git remote operations/publication.
