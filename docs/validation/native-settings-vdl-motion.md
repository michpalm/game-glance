# Native Settings transitions — 2026-11-06

Approved scope: smooth entry into and exit from the actual Settings page on Steam Deck. Native routing, focus and controls remain Steam-owned.

## Behavior

- Panel and external Settings heading fade at fixed geometry over the VDL base duration (250 ms). Full artwork crossfades into frost over the same opaque artwork, without animating blur.
- A scoped claim suppresses Steam's observed ancestor route transition (200 ms delay, 600 ms opacity/scale transition). Discovery requires the native `#Main` boundary and searches only below it. Claims and native styling restore on release.
- Exit retires native control styling immediately. An inert, pointer-transparent decorative bridge carries only artwork, empty glass and our heading through the handoff. It retains its own calm-filter lease, sits in the durable page/footer ancestor below native footer chrome, waits at most 250 ms, then fades for 250 ms with a 50 ms cleanup fallback.
- Categories, activation already inside Settings, and suspension recovery do not replay the introduction. Rapid re-entry cancels the outgoing bridge. Reduced motion is instant; preference/account changes and disposal cancel pending effects. Calibration stays outside this decorative transition.

## Verification

Source commits: `96ad01e`, `d15d892`.

- Full Vitest suite: **264 files / 2861 tests passed**. Typecheck, production build and whitespace checks passed.
- Native-shaped browser checks: 24 layout cases across three viewport sizes plus calibration, dropdown alignment, focus/scroll, category centering and footer movement; no page errors.
- Actual browser animation checks: intermediate opacity and unchanged bounds, no category replay, delayed/bounded exit, rapid re-entry, account invalidation, reduced-motion preference change, disposal and decorative-only bridge; no page errors. Fixture includes a native-shaped opacity/scale ancestor.
- Review exposed backdrop-first route notification ordering and an exit filter lease gap. Both reproduced in failing regression tests before fixes. A follow-up review required a fail-closed native Main boundary; positive/restoration and missing-boundary tests cover it.

## Steam Deck installation and live checks

Frontend SHA-256: `5f7f5b49f23b85dbdb49a97dc87af663445a1d630ada07f4b61e77d604317c4e`.

Final install backed up its predecessor to `/home/deck/gg-backup-native-settings-20261106-qicq4_p4/index.js`. The pre-motion frontend remains in `/home/deck/gg-backup-native-settings-20261106-grpl5l7j/index.js`. Source and staged hashes were checked, original backup independently verified, atomic replacement performed, and Game Glance reloaded with menu/keyboard closed and no running games. Home remounted successfully. Ally was not altered.

Live requestAnimationFrame observations at approximately 854 × 534 CSS pixels:

- Settings entry: 31 sampled frames, 11 intermediate-opacity frames, 12 artwork-underlay frames. Every observed panel rectangle was `[8,44,838,446.3333]`; native zoom removed.
- Category switch: 18 frames, no intro fade/underlay and the same fixed rectangle.
- Exit to Home: 31 frames; decorative bridge present in 20, intermediate fade in 13, last observed at 517 ms, gone at completion. No native controls copied, no input interception, no missing calm filter. Native footer z-index remained 7000 above the bridge's 1000 inside its shared host.
- Rapid Settings/Home/Settings: 36 frames, fixed geometry and no residual bridge/underlay/style.
- Temporary CDP reduced-motion emulation: panel opacity 1, zero panel animations, no underlay or exit bridge; override cleared in a finally block.
- Native Audio, Display, Downloads and System dropdowns: A opens, B closes, focus returns, current values/options right aligned, native values unchanged.
- Route-exit ownership cleanup and re-entry verified, including new ancestor/transition markers. Category content and icons remain centered in their full highlights.

This verifies live rendering geometry and lifecycle behavior, not subjective smoothness under every game/background workload. Account switching is covered locally rather than changing the device account. Temporary test input kept the device awake without changing sleep preferences.
