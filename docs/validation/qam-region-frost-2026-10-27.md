# QAM region frost — integration validation

27 October 2026. Private menu/Social preview branch. **Device visual acceptance is pending; this is not a release-readiness report.**

## Implemented and locally verified

- Exactly three regions: tab bar, main panel and notification capsule. Existing 75% tint, navigation and Social layout are preserved.
- Owner-document Home backdrop surfaces and cropped in-game shader with glass fallback.
- Generation cancellation, ordered updates, 250 ms heartbeat and 1-second lease expiry. Preparation and activation share a bounded zero-mask lease.
- Strict geometry-only RPCs plus one read-only native-environment query. No global force-composition writer, capture pipeline or persisted region telemetry.
- 1,947 frontend tests; 95 Python tests; TypeScript and Rollup build pass.
- Offline pinned compiler: 36 SDR contexts across 16:9/16:10 outputs, unequal game resolutions, Fit/Fill/Stretch and capped Auto. Each has a positive 72-byte uniform buffer, six cropped targets, one production technique and seven passes. A valid zero-uniform shader is explicitly rejected.
- ZIP inspected: production FX template and six backend modules present; no debug shaders, captures, bytecode or source maps.

Latest installed preview ZIP SHA-256: `58622d553825cb753f1ffcf6fe170d6170c9c408de8b626a13f70ef9881847f3`. A subsequent local diagnostic correction classifies valid unsupported HDR/Home shader requests as `unsupported`, rather than `invalid-geometry`; that correction has not been installed yet.

## Independent review and corrections

A fresh reviewer found three Important issues. Reproducing tests failed before fixes and passed afterward:

1. Ignore unchanged initial ResizeObserver delivery instead of clearing valid first-frame frost.
2. Remove speculative multi-entry readiness caching; Gamescope retains only its last pipeline.
3. Re-arm per-request readiness so cancellation or viewport identity cannot permanently lose it.

Further source inspection established that disabling can clear the last pipeline during composition. Preparation therefore retains its zero-mask effect until activation, cancellation or a bounded timeout; it does not disable and assume the pipeline survives. Ready preparation expires after 1 second without activation. Cold preparation is bounded to 5 seconds and can be cancelled immediately.

Native readiness is emitted from pipeline `update()`, called by `execute()`, after `set_effect` re-arms the callback. Installed behavior still needs a live effect test. Readiness/activation acknowledgements do not establish atomic GPU presentation across the game and Steam UI.

## Ally integration checks and recovery

- Original frontend rollback hash: `924e3279894aeedbb441040c91ce82a8dc69e1680b427266767a0b01f3e43aa8`. The revised preview is currently installed; original frontend and backend were verified against their backup during recovery.
- Native Wayland ABI/interface binding passed. Initial preflight reported HDR off; the latest external-TV game session reports HDR on and an Auto maximum scale of 2. These are observations of different output contexts, not a claim that the display configuration is unchanged.
- Steam's performance store omits `is_hdr_enabled`, and its process environment omits `WAYLAND_DISPLAY`. The implementation reads native HDR metadata and discovers one verified desktop-owned Gamescope socket; ambiguous sockets fail closed.
- Initial native effect slot was empty, technique 0, global force-composition value 0. No test writes the global force-composition property.
- Earlier integrated SDR openings missed the presentation deadline. A measured separate prepare/activate round trip was removed; early preparation now uses cached plain geometry and verifies it against the live allocation before activation. This has not yet established successful integrated SDR frost presentation.
- An initial early-preparation experiment froze both Steam JS renderers. The compositor remained responsive; no effect or global force override remained active, and recent kernel checks showed no GPU reset/timeout. Precise cause is unproven. Synchronous cross-window reads in the native input callback are the leading hypothesis.
- Restored the original frontend, restarted only Steam webhelper processes after graceful restart failed, and installed the complete baseline through Decky. Frontend/backend backup hashes and the settings fingerprint matched. The user confirmed normal screen updates and menu operation afterward.
- The corrected session manager defers surface work out of native input callbacks. A frontend-only canary and then the full revised preview both remained responsive. The full preview completed two game-menu openings with both renderers responding. A foreground SSH recovery guard was armed and disarmed successfully; detached SSH child watchdogs did not survive and must not be relied on.
- The latest full-preview run used the external TV with native HDR enabled. Its valid frame was rejected by the SDR-only shader path, leaving glass; the backend incorrectly labelled this `invalid-geometry`. A regression test reproduced that classification and the local correction passes. This run does not validate shader performance or SDR frost.
- Home previously exposed all three bounded 8px backdrop surfaces. Their presence and bounds are established; visual ordering/strength and transition acceptance remain pending.

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
