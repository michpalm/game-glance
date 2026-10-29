# Expanded Home controls — local visual validation

Validated 2026-10-29 at source commit `7bd7331` on `codex/social-chat`. This report covers local browser presentation only. Fresh independent review and Steam/controller acceptance remain open; Task 6 is not complete.

## Method

The ignored fixture under `.superpowers/sdd/2026-10-29-expanded-home-controls/visual/` bundles actual `homeControlsCss`, `statusCss`, `homeCanvas`, `statusPlacement`, `statusScale` and `acquireHomeFooter` from the current source. Unrelated module side effects are excluded from this fixture bundle. The synthetic footer matches the verified node structure and 41.75px reserve; status markup mirrors the current classes, with placeholder SVG icons and a generated avatar. It does not mount React StatusItems, Decky Focusable or Steam's focus tree. The background, cards and Search are synthetic context, not a Home screenshot or a proposed Search redesign.

Checked fixed iframe viewports in the in-app browser, then visually inspected full-size handheld, Deck and docked scenes. The fixture cycles the production focus class over each visible cell and measures computed outline width and viewport bounds. It checks footer group bounds, inter-group separation, original SVG identity, original header markup, unchanged footer height, and marker removal when disabled.

## Results

| Viewport | Standard labels, avatar | Long German labels, duplicate controller labels, persona dot | Expansion off |
|---|---|---|---|
| 829 × 467 | Pass | Pass; 66px between left and right footer groups | Pass |
| 1280 × 800 | Pass | Pass; 517px gap | Pass |
| 1500 × 845 | Pass | Pass; 737px gap | Pass |

All nine scenarios returned no geometry problems. Every active status cell had a computed 2px outline and its outline stayed within the viewport. The low battery colour, selected clock, joined Select/Back group, separate Menu pill and persona variants rendered as expected. Footer height stayed 41.75px. All three original footer SVGs and prompt nodes survived. Header markup stayed unchanged. Expansion off restored zero footer-group markers and the fixture's original native footer presentation.

Evidence is stored locally at `/Users/micpaal/.codex/visualizations/2026/10/29/01a1879f-94e5-7f42-b497-62344233cc9c/home-validation/`: `standard.json`, `stress.json`, `off.json`, `829-stress.png`, `1280-standard.png`, `1500-stress.png`. The browser's temporary viewport override was reset.

No product code was changed for these checks. Current-branch catch-up verification passed 210 test files / 2,433 tests and TypeScript. A fresh production build and `git diff --check` passed during visual validation. Frontend SHA-256: `dcbefe016e852b28b1a1834c654c84768ac5f243fe04e6208bbe95535397e6c6`.

## Limits and device baseline correction

Synthetic SVGs do not establish every native glyph family's appearance. Synthetic markup does not establish React/Decky focus, real Steam footer DOM fidelity after updates, Gamescope frost, route/menu handoff, live dynamic status changes or controller behaviour. Very long unbounded labels and arbitrarily many status cells are not covered. Device acceptance still requires separately approved access; none occurred during this validation.

The current build checksum exactly matches the root handoff's recorded installed screenshot-notification build `7bd7331`. Home controls are ancestors of that commit, so the earlier assumption that their code was absent from every later device build is stale. The recorded installed bundle includes the Home controls implementation; the setting remains false by default. Live device checksum and setting state were not re-read, and these local checks do not establish device acceptance. No installation/reload was performed here.

## Independent source review

A fresh-context reviewer inspected `72b65f8..985dbf3` in current `859b7c4`, including later menu integration changes. No Critical or Important issue was established. Reviewer verdict: source is ready with one nonblocking recommendation; actual device acceptance remains open. The review was read-only and did not rerun tests.

Deferred minor: `src/home/useHomeControls.ts:109` installs an unconditional 250ms watchdog even when expansion is off, adding four small runtime checks per second and departing from the plan's no-new-polling constraint. No measured lag was established. Reusing an existing runtime notification or gating the timer behind the opt-in is future cleanup; no product fix was made in this review round.

Reviewer exclusions were explicitly retained: Search redesign/keyboards and status activation are deferred by user approval; unrelated newer notification behavior was checked only for Home integration; Steam/Decky/Gamescope behavior and other native glyph families still require device acceptance. None is silently treated as passing or waived. Keep the plan workspace until the acceptance gate is resolved.

## Ally feedback and native footer strip correction

After the user enabled expansion, they described it as decent and reported a remaining full-width bottom strip. Approved read-only inspection verified the installed SHA matches `7bd7331` and Home runs at828×466 with four interactive status cells and owned footer markers. No automated navigation or installation was performed. Full controller acceptance is not inferred from this feedback.

Root cause: the native `#Footer` remained transparent but retained `backdrop-filter:blur(100px)` and a visible top border. The initial synthetic fixture lacked both, so the earlier visual pass did not cover the actual strip. The local fixture now reproduces those native effects; its computed-style assertion failed at all three sizes before correction. The owned-footer rule now removes native backdrop filtering and makes the native border transparent, preserving border geometry/reserve. Child prompts retain their own glass surfaces. Standard and long-label scenarios pass at all three sizes after correction. Opt-out restores native blur100px, original border colour and no ownership marker. Saved local image: `home-validation/829-footer-strip-fixed.png` (synthetic scene).

Fresh2433 tests, typecheck, build and diff check pass. Corrected frontend SHA: `264de64f08fc339ab87ff4b150e1660ba904fcab1a41a6816ffc62079d272096`. Not installed. The user has now requested full Home replacement of Steam's header plus the Search pill for testing; this supersedes the earlier header/Search deferral for presentation. Search query/results behaviour remains deferred; pill-only versus expanding field/saved keyboard is awaiting their preference.
