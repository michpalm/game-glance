# Home Search preview — local validation

Scope: approved hidden-until-Up Search pill, local expanded draft editor using the saved Compact/Radial keyboard, and complete native-header replacement on expanded Spotlight Home. Search queries/results/submission remain disconnected. No device access, installation/reload, publication or chat send occurred during implementation.

## Implementation and local checks

- Search state/draft/bounds, top-control navigation, reversible native header ownership and shared runtime are covered by focused tests. Home and Social keep independent keyboard sessions. A per-document shared250ms runtime replaces the old duplicated status timers and unconditional Home watchdog.
- Mounted ReactDOM/linkedom tests cover the Home editor's hidden/reveal/edit/complete lifecycle, local draft isolation/late writes, suspension/account reset, saved Radial mode and per-opening fallback. Another mounted test connects the Home coordinator with actual native header/footer leases and checks upward reveal and exact disable cleanup. Decky controls and keyboard children are mocked in these node integration tests; they are not Steam navigation validation.
- Full suite:215 files /2,454 tests pass. TypeScript, Rollup production build and whitespace checks pass. Frontend SHA-256 before independent review: `b354ab95d5e981fa474c412c14b075c416cfcdcfa2524da56465cd72ac03cb6b`.
- A development-only ReactDOM19.1.1 dependency matches existing React19.1.1. Installed with lifecycle scripts disabled. Production continues to use Decky's external ReactDOM.

## Browser evidence

The local browser harness mounts actual production `HomeSearch`, `useHomeControls`, `StatusItems`, Compact and Radial keyboard components, CSS, placement and native leases. React/ReactDOM are real; Decky controls are synthetic adapters and Radial receives a valid idle synthetic controller snapshot. The fixture contains no real user content, native handlers or Steam controller/navigation tree. Its synthetic native header/footer represent the verified structure, including the previously missed footer blur100px/top border. Unrelated module side effects are excluded from the fixture bundle.

At829×467,1280×800 and1500×845, checked browsing-hidden, dense top-controls reveal, Compact editing/type/Done, returned-to-content hidden, Radial editing and disabled/restored native UI:21 recorded state/size combinations. All reported no geometry/ownership problems. Dense status includes download progress, duplicate controller labels, overflow count and battery/clock/persona dot; long German footer labels are included. Search stays before the status pill, both keyboard variants fit, and live editing resize829→1280 adapts the field to360px without overlap. Keyboard clicks type into the local displayed draft. Completion returns to the pill; returning to content removes it. Disabling restores native header visibility and footer blur100px.

Browser inspection exposed competing footer prompts below Radial hints. Regression assertion failed before correction and passed after hiding only the owned normal footer while Home search is editing; its measured layout reserve stays unchanged and prompts restore on completion. This is recorded as a design ruling rather than silently changing the accepted layout.

Evidence: `/Users/micpaal/.codex/visualizations/2026/10/29/01a1879f-94e5-7f42-b497-62344233cc9c/home-search-preview/` contains `checks.json`, pill/Compact/Radial screenshots for all three sizes and an additional829 Radial view. Temporary viewport overrides reset. Browser console had no captured errors/warnings at the final inspection.

## Outstanding gates

Fresh independent whole-change review is pending. Local fixtures do not establish actual Steam/Decky controller focus, real account switching, native rerender handling after Steam updates, Gamescope composition, or real controller feed behavior. A separately approved device trial is required before claiming device acceptance. Current recorded installed Ally build remains7bd7331; this preview and footer correction are not installed.
