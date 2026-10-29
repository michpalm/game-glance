# Social radial keyboard — local validation

2026-10-29. Native execution. Implementation is local on `codex/social-chat`; no push, PR, release, installation or device restart was performed.

## Implemented

- Saved Social keyboard choice, default Compact, with Radial as an alternative.
- Two independently selected corner wheels; all letters, per-side trigger extras, L3/R3 typing, held L1 uppercase, R1 local layout cycling, Y space, B delete, A send, X close.
- Blank centred selection; held-button/edge protection; boundary retention; layout-change rearming; accent-aware typing and external-draft synchronization.
- Scoped input routing and body-portal lifetime/outside-tap behavior. The message remains in Social's existing compose field.
- Paired frontend/backend contract, fixed tile capacity and circular masks for `keyboard-left` and `keyboard-right`.

## Verification evidence

- `npm test`: **2,288 tests passed**, 202 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Existing verified scratch venv, `pytest tests/py -q`: **132 passed**.
- `git diff --check`: passed.
- Built `dist/index.js` SHA-256: `4fc8ccaf024561f297c8d03f5b053b9f664882fedbebaa494a479d846ddca326`.
- Local browser rendered the actual hook-free production wheel view and production CSS in eight combinations: 829×467 / 1500×845, letters / symbols / uppercase / blank centres. No browser errors or compose overlap; 28 letter keys / 32 extra-character keys. This checks drawing and geometry, not mounted Steam hooks.
- Screenshots: `/Users/micpaal/.codex/visualizations/2026/10/29/01a1879f-94e5-7f42-b497-62344233cc9c/radial-implemented-829-letters.png` and matching `radial-implemented-*` variants.

## Independent review and fixes

Fresh-context final review by a separate reviewer found three important issues. Each was reproduced by failing tests before the fix; all regression tests and the full suite now pass:

1. Consume Decky L3/R3 routing IDs 15/16; leave Select/Start and system buttons untouched. Runtime and shell use one explicit shared ownership predicate.
2. With one usable layout, R1 has no transition effects: no cleared accent, blanked selection or disarming.
3. A successful send's external draft replacement clears pending accents so the following message starts fresh.

No deferred minor findings from this feature review. No second review was substituted for the post-fix regression/full-suite checks, following the chosen Native workflow.

## Plan adjustments

- Session mode ownership and the body-portal exclusion from menu dismissal landed with the renderer rather than the following integration task, because its lifecycle already consumed them. Cost if wrong: revisit those narrow shared session/navigation changes.
- Included `worker.py` in the frost update: its independent `capitalize()` would otherwise emit invalid hyphenated uniform names. Cost if wrong: the worker must travel with the paired backend update, already required for the new contract.
- Included the primary accent from the compact letters bottom row when constructing extras; compact symbols alone omit Spanish acute. This is the plan's documented clarification of accessible accents.

## Pending before device acceptance

Actual Steam hook initialization, both sticks/triggers/buttons together, controller changes, focus behavior, shader compilation/performance and Home/game/docked rendering remain untested for this new feature. Do not infer these from the automated checks.

The existing handoff at `/Users/micpaal/Documents/Claude/Bazzite/handoff-social-keyboard-2026-10-29.md` also records a blocking Compact drag-drop ordering issue in baseline `bab6d32`, plus two observer findings. Those fixes remain paused and outside this feature's scope. Its instruction not to install that baseline before the drop fix still applies to a build inheriting it; resolve the installation blocker before the Ally trial.

## Proposed Ally trial after approval

1. Resolve the inherited Compact drop blocker and rerun relevant checks/build, updating the checksum above if the bundle changes.
2. With explicit installation/restart approval, confirm the in-game menu is closed. Back up the installed frontend and entire `py_modules/gameglance/frost/` directory under a timestamped home-directory backup.
3. Transfer and verify the checked frontend and paired frost backend, then perform the full device restart needed to load Python changes. No sudo or effect-atom injection.
4. Select Radial in Game Glance's menu preferences. Check the plan's Task 7 matrix with Michael. Do not send a test message to anyone without explicit authorization.
5. Restore the matched frontend/backend backup and restart if the trial requires rollback. Record actual device findings before marking acceptance complete.
