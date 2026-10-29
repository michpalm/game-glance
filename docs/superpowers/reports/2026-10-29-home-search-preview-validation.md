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

## Independent review and verified fix pass

Fresh read-only review at0558eec found no Critical issues and four Important findings. All four were reproduced in focused tests before fixes:

1. Updated native tabindex/aria values were overwritten then restored from stale snapshots. The lease now remembers observed external values, watches owned attributes and filters its own writes. Tests cover native3→7 restoration, attribute-only updates and overlapping owners.
2. Compact's deferred saved-position load and first-key autofocus ignored current input ownership. Both now require an open session, the live context and the same connected host. A mounted real-Compact test revokes ownership before resolving its deferred load and confirms focus stays with the new owner.
3. Compact retained an offscreen position after shrinking. It now observes viewport/field resize, cancels an interrupted drag and settles/reanchors without persisting a resize as user movement. A real-component test and browser check verify saved-right1280→829: x855/right1264 becomes x404/right813, y36; no position save is issued by resize.
4. Portalled keyboard pointer/wheel events bubbled into Home's gestures. The Home keyboard surface now stops pointer down/up/cancel and wheel propagation. Mounted tests cover the portal and the actual Compact keys within a Home-like gesture-owning parent.

Final full suite:216 files /2,460 tests pass; typecheck, build and diff check pass. Final frontend SHA-256: `49d72bab7427c4f48c101725dc6f8dc565d139e4c8aeac8e8c1efe6a79ac3178`. Repeated the21 browser state/size checks after the fixes: zero reported problems, no captured browser errors/warnings. Evidence `checks-final.json`, `resize.json`, `829-compact-resized.png` and per-size `*-radial-final.png` in the same local visualization folder. No second review was dispatched; the four findings were addressed through RED→GREEN regressions and the green whole suite.

Deferred minor: unknown-header fallback has no deduplicated diagnostic reason yet. It still safely falls back; the missing developer diagnostic was graded nonblocking. Optional inactive-parent header/account reads still share the existing250ms runtime and do not add a baseline timer; no optimization was made in this fix pass.

## Rulings retained for handoff

- Preserve legacy focus mode/tests when Search callbacks are absent: unsupported-native-layout fallback retains native access; cost is supporting both coordinator modes.
- Use `HomeSearchControl.tsx` to avoid the case-insensitive `homeSearch.ts` import collision; cost is a filename difference from the plan, not a behavioral change.
- Hide normal owned footer prompts only while Home search is editing: they collided with keyboard hints; cost is temporarily absent Menu/Select/Back prompts, with reserve retained and keyboard-specific hints present.
- Actual Steam/Decky traversal, controller feeds, native update compatibility and Gamescope rendering remain a device-acceptance gate; cost is that local success does not establish device acceptance.
- Query/results/history/submission remain disconnected by explicit scope; cost is that this is an editor/keyboard preview, not a working search provider.
- Device installation/publication remain separately authorized; cost is that the Ally keeps the prior build until approved installation.
- Existing unconditional polling was assessed incrementally, not expanded into a new optimization task; cost is continuing a small amount of inactive header/account reading on the shared runtime.

Local implementation and review-fix gates are complete. Device installation and real-controller acceptance are still pending approval; preserve the execution workspace until that gate is resolved.
