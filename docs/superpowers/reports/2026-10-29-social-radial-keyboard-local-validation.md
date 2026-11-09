# Social radial keyboard — local validation

2026-10-29. Native execution. Implementation remains local on `codex/social-chat`. Michael authorised the paired build installation and full Ally restart; these are now completed and verified. No push, PR or release was performed.

## Implemented

- Saved Social keyboard choice, default Compact, with Radial as an alternative.
- Two independently selected corner wheels; all letters, per-side trigger extras, L3/R3 typing, held L1 uppercase, R1 local layout cycling, Y space, B delete, A send, X close.
- Blank centred selection; held-button/edge protection; boundary retention; layout-change rearming; accent-aware typing and external-draft synchronization.
- Scoped input routing and body-portal lifetime/outside-tap behavior. The message remains in Social's existing compose field.
- Paired frontend/backend contract, fixed tile capacity and circular masks for `keyboard-left` and `keyboard-right`.

## Verification evidence

- `npm test`: **2,292 tests passed**, 202 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Existing verified scratch venv, `pytest tests/py -q`: **132 passed**.
- `git diff --check`: passed.
- Built `dist/index.js` SHA-256: `83ea5fcd90207e8e302b58f883f04bd0a6bf5ec4eb3a3edfa0ea600e09322a71`.
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

Michael subsequently authorised resuming the inherited Compact handoff fixes. The drop now commits its live position before drag flags/React state are cleared. Frost-host error paths retire and reset their measurement observer, allowing identical recovered geometry to forward. Repeated keyboard-move measurements are skipped during a no-frost drag; drag start/drop and real region/viewport resizes still measure.

Four new failing regressions were reproduced before the fixes. The focused suite passes 45 tests and the full frontend suite passes 2,292. Typecheck/build/diff checks pass. A separate scoped review approved all three handoff findings for device validation with no actionable correctness findings. React wiring was inspected rather than mounted; timer/context-error recovery and observer callbacks are covered, but not every browser/CEF error path. Device drag smoothness remains unverified. The inherited local installation blocker is resolved.

## Authorised Ally installation and remaining trial

1. Confirm the checked revision and bundle checksum above; the inherited Compact drop blocker has been fixed and reviewed locally.
2. With explicit installation/restart approval, confirm the in-game menu is closed. Back up the installed frontend and entire `py_modules/gameglance/frost/` directory under a timestamped home-directory backup.
3. Transfer and verify the checked frontend and paired frost backend, then perform the full device restart needed to load Python changes. No sudo or effect-atom injection.
4. Select Radial in Game Glance's menu preferences. Check the plan's Task 7 matrix with Michael. Do not send a test message to anyone without explicit authorization.
5. Restore the matched frontend/backend backup and restart if the trial requires rollback. Record actual device findings before marking acceptance complete.

## Installation result

Installed implementation revision `7d0fe87` with the in-game menu confirmed closed immediately beforehand. The frontend and complete frost backend (eight files) were checked against the SHA-256 manifest before and after reboot. Backup: `/home/deck/gg-backup-radial-20261029-fedgw2kb` (original frontend, frost directory and installed manifest).

SSH `systemctl reboot` was refused because interactive authentication was unavailable. Steam's source-verified normal `SteamClient.System.RestartPC()` action requested the authorised full restart instead. A changed kernel boot ID confirms that this was a full system restart. No sudo or forced reboot was used. After boot, Decky's `plugin_loader.service` is active, Game Glance is loaded in Steam, and the installed backend exposes all seven expected regions.

The saved keyboard choice remains at its existing/default value. To try the feature, choose **Social keyboard → Radial** in Game Glance settings and open the Social compose field. No messages were sent. Controller responsiveness, both sticks/triggers, frost appearance/performance and the remaining Task 7 acceptance matrix still need actual user/device testing.

## First Ally finding: released button values

The first opening fell back to Compact with “Radial keyboard unavailable.” Read-only inspection confirmed usable compose geometry and controller0, but Steam's button-state object assigned every released button an `undefined` value rather than explicit `false`. Strict boolean validation rejected that legitimate snapshot.

The frontend correction checks the expected field schema and matching controller index, accepts only boolean/undefined button values, and normalises released values to false before the input edge detector. True pressed values are preserved; missing schema fields and malformed values still fail. A regression mirroring the device snapshot failed before the correction and now passes. Full frontend 2,293 tests, typecheck, build and diff checks pass. New bundle SHA-256: `7d7295ba43b5a62a213a0f205bef7840836ae606b416ef5edbd46c120ac8e238`. No Python change or restart required. Michael approved installation; frontend correction 2123535 is now installed, checksum verified, and Game Glance reloaded. Backup: `/home/deck/gg-backup-radial-feed-20261029-l9s9_or_`. Post-reload plugin load passed. The keyboard was closed at inspection; successful radial opening/input remains to be confirmed.

## Second Ally finding: one-to-one send converter

User confirmed the radial keyboard appeared to work, then a send attempt failed. Send was enabled and the radial wheels remained open. A sanitised application-error signature identified a read of `ProcessMentions` on an undefined receiver. Steam's group-chat subclass inherits the shape used by helper discovery but overrides text conversion with an instance-dependent mentions operation. The helper lookup selected that subclass rather than the base one-to-one view. The error occurs during conversion before the transport call.

The correction selects the prototype that defines all three helper methods itself, skipping inherited group-chat matches. A derived-first regression reproduces the selection problem using synthetic text. Chat-focused 40 tests and the full frontend 2,294 tests pass, along with typecheck/build/diff checks. Bundle SHA-256: `84eaf3605508e1655532938c3d2373a988d1e40299154a94879f13a5efe170ee`. Frontend-only; user approved installation after being told reload clears the unsent draft. No test messages were sent by the agent.

Send correction `8dd746f` installed with the menu closed, checksum verified and Game Glance reloaded successfully. Backup: `/home/deck/gg-backup-radial-send-20261029-sfu5ru2y`. Successful message delivery remains for the user to confirm; no agent-sent message or reboot.
