# QAM region frost — integration validation

27 October 2026. Private menu/Social preview branch. **Device visual acceptance is pending; this is not a release-readiness report.**

## Implemented and locally verified

- Exactly three regions: tab bar, main panel and notification capsule. Existing 75% tint, navigation and Social layout are preserved.
- Owner-document Home backdrop surfaces and cropped in-game shader with glass fallback.
- Generation cancellation, ordered updates, 250 ms heartbeat and 1-second lease expiry. Preparation and activation share a bounded zero-mask lease.
- Strict geometry-only RPCs plus one read-only native-environment query. No global force-composition writer, capture pipeline or persisted region telemetry.
- 1,947 frontend tests; 105 Python tests; TypeScript and Rollup build pass.
- Offline pinned compiler: 36 SDR contexts across 16:9/16:10 outputs, unequal game resolutions, Fit/Fill/Stretch and capped Auto. Each has a positive 72-byte uniform buffer, six reflected runtime bindings with zero defaults, six cropped targets, one production technique and seven passes. A valid zero-uniform shader is explicitly rejected.
- ZIP inspected: production FX template and six backend modules present; no debug shaders, captures, bytecode or source maps.

Latest installed preview ZIP SHA-256: `6434cd0a86cf066cbcc5d04f83ae197ea01261a270897b207f2e381e52952ed3`. It includes deferred input-callback surface access, queued live activation, runtime shader bindings, correct unsupported-mapping diagnostics and compositor HDR output feedback.

## Independent review and corrections

A fresh reviewer found three Important issues. Reproducing tests failed before fixes and passed afterward:

1. Ignore unchanged initial ResizeObserver delivery instead of clearing valid first-frame frost.
2. Remove speculative multi-entry readiness caching; Gamescope retains only its last pipeline.
3. Re-arm per-request readiness so cancellation or viewport identity cannot permanently lose it.

Further source inspection established that disabling can clear the last pipeline during composition. Preparation therefore retains its zero-mask effect until activation, cancellation or a bounded timeout; it does not disable and assume the pipeline survives. Ready preparation expires after 1 second without activation. Cold preparation is bounded to 5 seconds and can be cancelled immediately.

Native readiness is emitted from pipeline `update()`, called by `execute()`, after `set_effect` re-arms the callback. Installed behavior still needs a live effect test. Readiness/activation acknowledgements do not establish atomic GPU presentation across the game and Steam UI.

## Ally integration checks and recovery

- Original frontend rollback hash: `924e3279894aeedbb441040c91ce82a8dc69e1680b427266767a0b01f3e43aa8`. The revised preview is currently installed; original frontend and backend were verified against their backup during recovery.
- Native Wayland ABI/interface binding passed. The former HDR read used `GAMESCOPE_DISPLAY_HDR_ENABLED`, which source inspection establishes is a saved request, not output feedback. Its value remained 1 on the built-in SDR screen. Do not infer that the earlier external-TV test actually emitted HDR from this property alone. Auto maximum scale is 2.
- Steam's performance store omits `is_hdr_enabled`, and its process environment omits `WAYLAND_DISPLAY`. The implementation reads native HDR metadata and discovers one verified desktop-owned Gamescope socket; ambiguous sockets fail closed.
- Initial native effect slot was empty, technique 0, global force-composition value 0. No test writes the global force-composition property.
- Earlier integrated SDR openings missed the presentation deadline. A measured separate prepare/activate round trip was removed; early preparation now uses cached plain geometry and verifies it against the live allocation before activation. This has not yet established successful integrated SDR frost presentation.
- An initial early-preparation experiment froze both Steam JS renderers. The compositor remained responsive; no effect or global force override remained active, and recent kernel checks showed no GPU reset/timeout. Precise cause is unproven. Synchronous cross-window reads in the native input callback are the leading hypothesis.
- Restored the original frontend, restarted only Steam webhelper processes after graceful restart failed, and installed the complete baseline through Decky. Frontend/backend backup hashes and the settings fingerprint matched. The user confirmed normal screen updates and menu operation afterward.
- The corrected session manager defers surface work out of native input callbacks. A frontend-only canary and then the full revised preview both remained responsive. The full preview completed two game-menu openings with both renderers responding. A foreground SSH recovery guard was armed and disarmed successfully; detached SSH child watchdogs did not survive and must not be relied on.
- The earlier full-preview run read the saved HDR preference as active HDR. Its valid frame was rejected by the SDR-only shader path, leaving glass; the backend incorrectly labelled this `invalid-geometry`. Regression tests reproduced both the classification and preference-versus-feedback errors. Both corrections are now installed.
- The built-in output is confirmed by Gamescope as BOE/eDP-1. `GAMESCOPE_HDR_OUTPUT_FEEDBACK` and `GAMESCOPE_DISPLAY_SUPPORTS_HDR` are both 0 while the saved enable preference is 1. The source publishes output feedback from HDR capability plus enablement/force flags; a positive value conservatively retains glass even if content-driven HDR is temporarily idle. Missing/invalid feedback fails closed. No HDR preference was changed.
- Installing the corrected candidate with QAM open timed out before an acknowledgement; the recovery guard restored the original frontend and restarted Steam webhelpers. Full baseline rollback then succeeded. There was no observed active effect or recent kernel GPU error. No independent renderer-health result was captured before that guard fired, so this timeout does not establish a second freeze or its cause.
- A controlled retry with QAM closed during installation succeeded. The corrected environment RPC reports SDR; two menu openings and both renderers remain responsive. Steam was on Home with Ori still running, so those openings verified presence of the three Home surfaces rather than the in-game shader. The documented `RaiseWindowForGame` request did not complete within 20 seconds while renderer health remained good; physical controller resume was requested.
- The user physically resumed Ori and confirmed navigation updates. The first in-game warmup/activate sequence missed the reveal deadline by about 8 ms (ready 101 ms, reveal cancellation 110 ms, activation acknowledgement 118 ms). Live presentation can now queue against a matching early preparation and activate in the ready dispatch; cancellation completes both requests, and mismatched generation/context/allocation is rejected. Six backend regression cases and the frontend queue test failed before correction and passed afterward.
- Guarded queued-activation package `7286c0c47018c561aa9f29e988f80058e31f79334620e1b9725d4d22f2f31e2f` is installed. One measured opening acknowledged activation at about 102 ms and retained heartbeats. A subsequent 8-second trace showed successful renewals every 250 ms, with an independent observer seeing the owned effect throughout. Global forced composition remained 0 and both renderers responded. These are lifecycle observations, not visual acceptance.
- The user reported frost missing. Loader source inspection found that unannotated uniforms are `DataUniform` values reset to their initial defaults; only nonempty `source` annotations create runtime bindings consumed by the protocol. The production template omitted those annotations, so successful lease activation did not establish populated masks. The strengthened reflection check reproduced all six missing bindings/defaults, then passed all 36 contexts after correction. Each uniform now explicitly names its protocol source and supplies zero-valued `defaultValue` metadata, which the runtime loader uses during preparation and cleanup. The corrected package installed with QAM closed and both renderers stayed responsive. Its second opening acknowledged activation around 100 ms and retained renewals. User visual acceptance of this correction remains pending.
- Gamescope captures obtained during this check contained the game without the QAM, despite the menu renderer reporting it open. Those captures do not establish the device's visible menu or its frosting. Physical feedback remains authoritative for acceptance.
- Home previously exposed all three bounded 8px backdrop surfaces. Their presence and bounds are established; visual ordering/strength and transition acceptance remain pending.

- Frost-missing investigation (17:05). Gamescope 3.16.30.1 source review: the logged `Couldn't find texture with name: V__Scene` is benign (a `COLOR`-semantic sampler binds the game image at execute time); an active effect forces full composition (no partial path); `set_effect` clears runtime uniforms, but the worker always sends masks afterwards; Gamescope screenshots never run the effect, so captures cannot show frost. A standalone two-stage visual probe (A: a minimal invert shader, B: production shader with a full-screen panel mask) started while Steam, not a game, was focused. Stage A crashed Gamescope (SIGSEGV in libvulkan_radeon about 1 s after enable); the session restarted and the running game closed. Probe shaders were removed afterwards. The production shader has not crashed in any recorded run, but this shows that an effect can take down the compositor; probe work now requires the user's go-ahead per run. Frost root cause still unknown.

- **Root cause of missing in-game frost (17:30).** A production-shader probe with a full-screen panel mask, QAM closed, visibly blurred all of Ori twice (user-confirmed), so the shader, runtime-uniform bindings and native path work. A temporary in-memory logger on `DeckyBackend.call` then recorded one QAM-button opening: `frost_environment` (89 ms, cold), `frost_present` at +92 ms, frontend `frost_cancel` at +108 ms (the present returned `cancelled`), then only `frost_environment` every 250 ms for 5 s. `controller.presented()` cancels any activation still in flight at the reveal, and `frame()` only prepares again when the geometry changes. Gamescope drops its compiled pipeline whenever no effect is set (`vulkan_composite` → `g_reshadeManager.clear()`, 3.16.30.1), so every opening compiles from cold (~100 ms measured earlier), while the menu is revealed instantly by lifting a visibility gate about 16 ms after the request. Under the "frost at the reveal or glass" rule every opening therefore stays glass. This is a design constraint, not a code defect; the way forward is a user decision (hold the reveal, fade frost in, keep the pipeline armed during play, or no in-game frost).

- Reveal-hold build on the Ally (21:20 UTC install, trace build not committed). Openings that recorded `entry=home` came from `OnHomeButtonPressed`, where frost is off by design; the … button itself always fired `OnQuickAccessButtonPressed` once. Warm Quick Access opening: early warmup `frost_prepare` at +12 ms, `frost_present` at +62 ms, active at +145 ms, gate lifted at +170 ms; frost visible, renewed until close, then released. Cold opening (first Quick Access after plugin load): the first `frost_environment` took 219 ms, the 150 ms hold expired, and `presented()` cancelled the in-flight activation (`frost_cancel` → worker `cancelled`); the controller does not retry after reveal, so that opening stays glass. Remaining: warm the worker and environment before the first press.

- Game-focus warm-up (22:29 CET install). When a running game appears or changes, the coordinator calls `warmFrost()`, which asks the backend for its environment once in a later task: the worker starts and the frontend caches the answer. On the Ally the plugin restarted at 22:29:06 and a new frost worker started at 22:29:07 with no button press. The first Quick Access opening after the install, with … in Ori, showed frost (user-confirmed). 1960 tests pass.

- Frost for the Home entry too (22:34 CET install). The coordinator now enables frost for every custom-menu opening; both entries render the same bar, panel and notifications regions, and the panel is a fixed-size flex child that scrolls internally, so section changes keep the geometry. Steam's native main menu after a handoff and the status pills still get no frost. Opening the menu with the Home button in Ori showed frost (user-confirmed). 1960 tests pass.

- VDL frost (23:02 CET install). Shader rebuilt to match the visual language glass: sigma = 16 CSS px x dpr (37 px on the Ally), padding 3 sigma, exact 8x8 box downsample to 1/8-resolution tiles, Gaussian taps to 3 sigma. Bar and panel use the `glass` token (.40). The controller arms the effect with zero masks during the reveal hold and activates at the reveal; the shader fades frost in over 150 ms from the first frame with masks (persistent 1x1 state, Gamescope `timer` uniform) while the menu fades in over `--gg-fast`. The first install used RG32F state textures: Gamescope has no DRM format for it and aborted the session twice in Ori (`CVulkanTexture::BInit`, `VK_FORMAT_UNDEFINED`); now RGBA32F, with a guard test on allowed formats. After the fix: no crash, frost looks right and fades in with the menu (user-confirmed in Ori).

## Rollback and settings

Existing plugin backup on Ally: `/home/deck/gg-qam-region-frost-backup-20261027-095403`.

Before-install settings fingerprint (canonical JSON for `settings` and `menu:preferences` only): `5ae04ce320421d5c3448605f0786600634f0d0812e08d7a9a39a4a72d1279b65`.

Use Decky's normal ZIP installer for the preview and rollback; the SSH account cannot replace the root-owned plugin directory without elevation. No password is needed when using Decky's installer. The verified rollback ZIP is `/home/deck/gg-qam-region-frost-preview/game-glance-rollback.zip`, SHA-256 `3c992ffa636bad64c8f11c6cad459d62e5eb7c9942c8bf0083ef61329982841c`. After rollback, reload Game Glance and verify its frontend/backend hashes and the settings fingerprint. Do not restore or publish private settings/caches.

## Outstanding acceptance

- Confirm physical responsiveness of the revised preview and repeat SDR testing on the built-in screen or an SDR output. Baseline physical recovery is user-confirmed; preview renderer health checks pass.
- Test actual shader activation without a force-composition override; check all three masks, foreground sharpness and bell/count visibility.
- Verify Home backdrop-root ordering and visual blur strength.
- Record permitted Quick settings opening/closing with Social and Home feed closed. Reject late frost, blur-only frames, choppy edges, close flashes or residue.
- Controller/touch/mouse, Social scrolling/chat/keyboard, rapid reopen, native handoff, resize, game switch, plugin reload and interrupted bridge.
- Real competing-effect ownership handoffs in both directions.
- 16:9/16:10, output scaling, lower game resolution and fitting modes. Integer scaling and HDR game frost currently use glass; they are not accepted as supported frost configurations.
- Comparable baseline/frost unique UI-frame pacing and input-to-focus-paint distributions. GPU timing where available; repeated display presents are not UI FPS.
- User acceptance of navigation and transitions.

No public push, PR, release, merge or released 3.6.0 package change is part of this work.
