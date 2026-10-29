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
