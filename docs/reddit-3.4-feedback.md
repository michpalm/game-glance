# Game Glance 3.4 feedback triage

Reviewed October 19, 2026. [Release discussion](https://www.reddit.com/r/deckyloader/comments/1x8da69/game_glance_34_is_out_touch_and_mouse_seamless/).

The available indexed text contains replies from October 17–18. Reddit's direct feed returned HTTP 403, so completeness and newer replies could not be verified. Attached screenshots were not inspected. Reports below describe individual observations, not independently reproduced device failures.

## Regression patch

| Report | Local change | Status |
|---|---|---|
| RDR2 shows 200+ hours instead of about 40 | Use Steam's overview total for Steam games rather than the larger of overview and details. Shortcuts prefer local details; Unifideck's separate merge is retained. Accept a local counter resetting to zero. | Regression tests pass; compare against the reporter's Steam totals on device. |
| Home order differs from native Home, with an uninstalled game first | Preserve the recent collection's supplied order; append library fill-ins after it. Purchase dates no longer reorder the native entries. Hidden games and duplicates remain excluded. | Regression tests pass; verify the collection's supplied order matches native Home on device. |
| Back feels delayed after opening; top gradient flashes | B/Escape now cancels a pending transition, or removes its overlay and passes through to Steam after navigation. Remove the one-second activation lock. Subscribe to page readiness before navigation so an immediately ready page cannot be missed. | Cancellation and readiness race tested; gradient flash remains unconfirmed. |
| Home metadata missing after updating, but present on the game page | Fix a fallback that discarded Home's cleanup when no transition overlay could be mounted. | Fallback tested; this is a candidate for a subset of disappearance cases, not a confirmed explanation of the report. |

Superseded on 2026-10-21: RDR2 was a Lutris shortcut, which commit 2200f5d fixes with Lutris's own play time, and the change for Steam games (the first row above) was reverted (30abc15).

Update 2026-10-21: R3APER's screenshots show 223.4 h on Home and 38.6 h on the game page. Cause: Home-only inputs; fixed by plan Task 5c.

The metadata reporter said disabling CSS Loader did not help. Do not label the report a CSS Loader conflict without further evidence.

## Device checks still required

All checks below are **not run**. Record plugin build, device, OS, Steam/Decky versions, display mode, and active themes.

1. Compare playtime on native Steam, Game Glance Home and the game page. Include RDR2, an unplayed Steam game, an ordinary shortcut and a Unifideck game.
2. Compare native Home's leading games with Game Glance after a cold start, a restart, playing a game and adding a game. Include uninstalled and hidden games. No relaunch of every game should be needed to correct order.
3. Press B/Escape during the morph, during the overlay handover and immediately after the game page appears. Reopen immediately. Home should remain usable and no delayed navigation should occur.
4. Reproduce missing metadata from a cold start and after repeated open/Back cycles. Compare with CSS Loader enabled and disabled. Check whether `data-gh-opening`, `data-gh-phase` or `data-gh-twins` remains on the live `.gh-root` while Home is at rest.
5. Record the gradient flash in handheld and docked modes with normal and Clean game pages. The transition's normal visual timing has not been shortened by this patch.

Automated validation: 1,409 tests pass; TypeScript passes. These results do not establish a device fix. The patch is local and unreleased.

## Ally follow-up: missed first D-pad press

On October 19 the first test ZIP was installed on a ROG Xbox Ally RC73YA. Its installed bundle matched the local build's SHA-256. A read-only Home inspection showed visible playtime, achievements and HLTB chips, with no leftover opening attributes or bridge. This is a smoke check, not a reproduction of the Reddit metadata report.

The user reproduced an intermittent missed first Left press after opening REANIMAL Demo, waiting and returning with B. In one captured sequence, Home restored selection `g9`; the first Left release reached the row without a preceding DOM press event and without changing selection. The next Left press reached the row and moved it to `g8`.

A second trace at Steam's controller dispatcher captured the missed press with input suppression **false** and **no focused node in the active navigation tree**. The following release saw the Home row focused; subsequent presses moved normally. This distinguishes native focus acquisition from a row handler ignoring an event.

Two temporary guards based on focus notifications and polling did not eliminate the misses. Live telemetry showed an empty native node at the instant of a physical D-pad press, even with browser focus still on the row and input suppression false. A polling repair cannot close that gap. Six automated page-return cycles at 350/475/650 ms passed both without and with that guard; they did not reproduce the physical-button failure and do not establish a fix.

Revised candidate: during the existing 1.5-second Home-return settling period, use Decky's standard `beforePatch` on Steam's `GetEventTarget`. Immediately before a Left/Right press is routed, repair an empty/detached native node if browser focus is still in Home (or its neutral window ancestor, with a remembered Home control) and that control belongs to the active tree. Preserve valid native focus, other controls/trees/menus, an unfocused window, an opening page and suppressed input. The original dispatcher still runs once with its original arguments; no controller input is replayed. Remove the patch and focus listener on timeout or unmount. A regression test models Steam's focus-restoring-but-press-consuming branch and verifies the same press receives its target.

The same-press preview passed a direct device check: after returning from REANIMAL Demo, native focus was explicitly cleared while browser focus remained on the Home row. The first Left moved `g9` to `g8`. Subsequent live telemetry recorded physical presses arriving with no native node and being repaired, including `g11` → `g10` and `g10` → `g9`. At this stage the preview was temporary and the installed ZIP was still the first regression build.

The user subsequently suspected one very fast miss. The trace confirmed a real unchanged selection at `g9` across a Left press/release. In that case Steam pointed at another node while DOM focus was already on Home; the empty-node-only repair skipped it. The candidate now also repairs a connected native node outside Home when DOM focus is explicitly on a Home control and that control belongs to the active tree. A neutral DOM ancestor alone never displaces a connected native control. Tests cover both this mismatch and the preservation boundary.

The extended candidate passed direct device checks for an empty node and a detached former game-page node: the same Left moved `g9` → `g8`, then the same Right after another clear moved `g8` → `g9`. The old page's node was already detached in that run; the connected-node case is covered by regression tests.

### Installed focus-test result — October 19, 2026

The extended fix was packaged as `game-glance-3.4.0-focus-test.zip` and copied to the Ally's Downloads folder. Its SHA-256 matched the local archive: `171ae8f309baf5890d4c01b79ed92a882c0df8496352a67bc68bdcf91a56ee82`. The temporary preview was removed before the installed-build test.

**Manual regression result: PASS so far on the ROG Xbox Ally.** After testing the new ZIP, the user reported: "I could not manage to force a miss again, it seems to work." The previously reproduced first-D-pad-press failure was not reproduced in this test round. Together with the captured failure traces, direct device checks and 1,409 passing tests, this supports the focus fix. Longer-term confirmation and other devices remain untested; the separate Reddit playtime, ordering, metadata and gradient reports retain their statuses above.

## Follow-up suggestions

Next customization work: add separate grayscale and HowLongToBeat visibility toggles, then consider a larger recent-games limit and release-calendar access. Hiding HowLongToBeat must also cover Home's transition copy, the Clean panel and screensaver stats.

Other requests: store shortcut on the Steam badge, Deckshelves, Playhub, Junk Store tags, CSS theme compatibility, library/interface expansion and weather settings. These require separate scoping.

The carousel-style question was resolved by selecting Spotlight in settings; this patch clarifies the existing dropdown description. The Junk Store requester accepted Unifideck as an alternative; Junk Store support itself remains a request.
