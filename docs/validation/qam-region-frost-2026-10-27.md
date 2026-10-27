# QAM region frost — integration validation

27 October 2026. Private menu/Social preview branch. **Device visual acceptance is pending; this is not a release-readiness report.**

## Implemented and locally verified

- Exactly three regions: tab bar, main panel and notification capsule. Existing 75% tint, navigation and Social layout are preserved.
- Owner-document Home backdrop surfaces and cropped in-game shader with glass fallback.
- Generation cancellation, ordered updates, 250 ms heartbeat and 1-second lease expiry. Preparation and activation share a bounded zero-mask lease.
- Strict geometry-only RPCs plus one read-only native-environment query. No global force-composition writer, capture pipeline or persisted region telemetry.
- 1,939 frontend tests; 83 Python tests; TypeScript and Rollup build pass.
- Offline pinned compiler: 36 SDR contexts across 16:9/16:10 outputs, unequal game resolutions, Fit/Fill/Stretch and capped Auto. Each has a positive 72-byte uniform buffer, six cropped targets, one production technique and seven passes. A valid zero-uniform shader is explicitly rejected.
- ZIP inspected: production FX template and six backend modules present; no debug shaders, captures, bytecode or source maps.

Preview ZIP SHA-256: `ffc71624dcccce1de8e7d490ae9fa50dba9c828208d0df5ac09c1b03a20b84bc`.

Frontend SHA-256: `9cb01c15f11de480e65c0fe630dae5e46b0963be6df1f096fb79524618991b2e`.

## Independent review and corrections

A fresh reviewer found three Important issues. Reproducing tests failed before fixes and passed afterward:

1. Ignore unchanged initial ResizeObserver delivery instead of clearing valid first-frame frost.
2. Remove speculative multi-entry readiness caching; Gamescope retains only its last pipeline.
3. Re-arm per-request readiness so cancellation or viewport identity cannot permanently lose it.

Further source inspection established that disabling can clear the last pipeline during composition. Preparation therefore retains its zero-mask effect until activation, cancellation or a bounded timeout; it does not disable and assume the pipeline survives. Ready preparation expires after 1 second without activation. Cold preparation is bounded to 5 seconds and can be cancelled immediately.

Native readiness is emitted from pipeline `update()`, called by `execute()`, after `set_effect` re-arms the callback. Installed behavior still needs a live effect test. Readiness/activation acknowledgements do not establish atomic GPU presentation across the game and Steam UI.

## Read-only Ally checks

- Ally reachable; original frontend remains installed at `924e3279894aeedbb441040c91ce82a8dc69e1680b427266767a0b01f3e43aa8`.
- Native Wayland ABI/interface binding passed without enabling an effect. The bridge reports HDR off and an Auto maximum scale of 2.
- Steam's performance store omits `is_hdr_enabled`, and its process environment omits `WAYLAND_DISPLAY`. The implementation reads native HDR metadata and discovers one verified desktop-owned Gamescope socket; ambiguous sockets fail closed.
- Effect slot empty, technique 0, global force-composition value 0 before testing. No shader was activated during preflight.
- The screen-update confirmation requested from the user remains pending. No new preview installation or live effect test has occurred.

## Rollback and settings

Existing plugin backup on Ally: `/home/deck/gg-qam-region-frost-backup-20261027-095403`.

Before-install settings fingerprint (canonical JSON for `settings` and `menu:preferences` only): `5ae04ce320421d5c3448605f0786600634f0d0812e08d7a9a39a4a72d1279b65`.

Use Decky's normal ZIP installer for the preview and rollback; the SSH account cannot write the root-owned plugin directory without elevation. No password is needed when using Decky's installer. A rollback ZIP can be generated from the private backup above, preserving plugin metadata and Python modules. After rollback, reload Game Glance and verify its frontend hash and the settings fingerprint. Do not restore or publish private settings/caches.

## Outstanding acceptance

- Confirm the physical display updates, install the preview and verify its hashes/settings.
- Test actual shader activation without a force-composition override; check all three masks, foreground sharpness and bell/count visibility.
- Verify Home backdrop-root ordering and visual blur strength.
- Record permitted Quick settings opening/closing with Social and Home feed closed. Reject late frost, blur-only frames, choppy edges, close flashes or residue.
- Controller/touch/mouse, Social scrolling/chat/keyboard, rapid reopen, native handoff, resize, game switch, plugin reload and interrupted bridge.
- Real competing-effect ownership handoffs in both directions.
- 16:9/16:10, output scaling, lower game resolution and fitting modes. Integer scaling and HDR game frost currently use glass; they are not accepted as supported frost configurations.
- Comparable baseline/frost unique UI-frame pacing and input-to-focus-paint distributions. GPU timing where available; repeated display presents are not UI FPS.
- User acceptance of navigation and transitions.

No public push, PR, release, merge or released 3.6.0 package change is part of this work.
