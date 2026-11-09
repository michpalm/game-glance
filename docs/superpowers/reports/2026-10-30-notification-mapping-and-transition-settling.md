# Notification mapping and transition settling

2026-10-30. User requested proper presentation for all currently generic notification rows on the Ally, plus investigation and correction of the Home-to-game page endpoint scale/brightness pop.

## Notifications

Live read-only inspection found types 1 (downloads), 5 (achievements), 14 (screenshots), 28 (wishlist/account), and 31 (plugins). Only achievement notices lacked mapping. The 14 current achievement entries comprise 4 unlocks and 10 progress updates, identified from their actual protobuf fields. No enum guesswork or unknown Steam module calls.

`notificationsList.ts` now displays achievement name, game context, description and applicable current/max progress, distinguishes unlocked/progress labels, preserves read identity and routes View game through the existing numeric app request. Existing app artwork uses appId. Malformed data retains safe descriptive fallbacks. No notices were opened or cleared.

## Transition causes and repairs

1. Moving normal-card surfaces captured their border colour before the target display ring adjustment was set. Ally samples showed moving pseudo-borders alpha .12, versus .15 on the frozen copy and final page. `prepareNormalOpen` now applies the target ring adjustment before reading the computed surface. Both unit regression and production-CSS browser reproduction failed before and passed afterward (.15 throughout).
2. The nominal 450 ms handover timer starts before the CSS transition starts on its animation frame. A native capture observed the moving surface still at scale .994321/.993685 shortly before the copy forced the endpoint. The morph now waits for its own running transform/translate and opening animations to finish, then one animation frame, before freezing the copy. A bounded 450 ms emergency escape remains; cancellation disposes the wait, and a generation guard ignores stale completion after reopening. Non-morph routes retain their timing. Local Chromium reproduced scale .993062 at the old timer and transform none at the corrected handoff.
3. The eyebrow twin used a percentage translate of its own height. A clean reversible Ally experiment compared its frozen copy, final page, and layout-anchor variant at native resolution. Original top 193.7702179 CSS px, page/new anchor 193.776947. Original glyph crop matched best after shifting +1 physical pixel (mean absolute RGB error 3.196, versus 10.574 unshifted). Layout-anchored copy matched best unshifted (error 1.445). The scoped eyebrow/base-origin rule now uses bottom layout anchoring while retaining dx/dy settling offsets and its bottom transform origin. No title or stat-twin layout change.

## Verification

- Notification regressions: RED 3 failed / 28 passed; GREEN 31 passed.
- Moving-ring regression: RED .12 versus expected .15; GREEN.
- Premature-handoff regression: RED bridge mounted before completion callback; GREEN, including cancellation.
- Motion helper tests cover all-motion completion, final committed frame, unrelated/finished animations, cancellation and emergency cap.
- Production-CSS browser fixture: ring mismatch RED before; final .15/.15 GREEN. Eyebrow fractional endpoint check RED before; GREEN after. Real Chromium CSS animation finishes before handoff.
- Final full frontend: **222 files / 2550 tests passed**. Typecheck, Rollup build and git diff check passed.
- Independent code review of mapping, ring ordering, motion completion/cancellation and eyebrow anchor: no actionable findings.

Private evidence and scripts: `/Users/micpaal/Documents/Claude/Bazzite/recordings/2026-10-30-transition-fix/`. Clean native typography evidence is specifically `ally-layout-clean`; earlier `ally-layout-probe` experiments were discarded because a diagnostic clone/reference error contaminated comparisons. That leftover overlay was removed, followed by verification of zero bridges/diagnostic overlays on Home. No installed frontend was changed.

## Candidate and remaining device acceptance

Installed baseline remains SHA256 `528bdf8eae638b4ef75df7cb3f6bc8464c6e2b872e51c4bfb18687fb45ad6686`.

Verified candidate SHA256 `735b942f90fd2c50f8fd0ca4814ab7d3ca6bec127d7e7d3ff79b6be0eaeeebc2`. An immutable copy for the approval/install handoff is `recordings/2026-10-30-transition-fix/candidate-index.js` in the Bazzite workspace.

Existing uncommitted changes were preserved. The candidate also includes the already pending cold-page readiness safeguards present in this worktree before this task: two visible frame checks, a 2000 ms emergency readiness cap, and non-consuming Back cleanup after navigation. They were not introduced by this task. The full suite above covers the combined candidate. No backend changes, commit, push, PR, release or installation.

Installation remains pending the user's standing requirement for explicit installation approval. After approval: menu closed, checksum baseline and candidate, backup current frontend, atomic frontend replacement and guarded reload, independently verify installed digest/plugin load. Then repeat native recordings and inspect the actual notification rows; test Home-to-page, Back and rapid re-open. Local browser checks and the temporary typography experiment do not establish acceptance of the entire installed candidate across games, shading modes and handheld/docked layouts.


## Approved installation and installed-build check

User explicitly approved “install”. Both native side-menu and Game Glance menu were closed before staging, and native side-menu closure was checked immediately before replacement. Verified baseline528bdf8e... backed up to `/home/deck/gg-backup-notifications-transition-20261030-g0o03hle/index.js` with original checksum. Staged candidate and atomic replacement validated. Guarded frontend reload requested successfully; independent postreload SHA256 matched735b942f90fd2c50f8fd0ca4814ab7d3ca6bec127d7e7d3ff79b6be0eaeeebc2, plugin loaded and menu closed. No reboot or backend change.

Two native-resolution installed-build captures completed. In both, the last measured moving-card surface before bridge creation had transform none; the copy was not frozen short of the endpoint. Moving and copied borders both used rgba(255,255,255,0.15). Eyebrow twin and final page rectangles matched at [34.981,193.777,151.36,8.991] CSSpx at the recorded precision. Native PNG screencast captured13 irregularly spaced frames per trial and adds observable overhead; these samples establish endpoint/paint-style continuity, not a120Hz performance or every-frame smoothness claim. Evidence: private installed-capture/results.json and native PNGs under the task recording directory. A lighter JPEG preview recording is also retained under installed-preview.

Opened the installed notification panel through normal Game Glance controls. It showed “You're all caught up” with0 rows; did not reset read memory or create synthetic notices to force acceptance. No individual notification or Mark all read action was taken. Achievement mapping is installed and covered by tests and the earlier read-only live protobuf evidence; actual newly arriving row presentation still requires an unread notice. Closed the menu afterward. No commit/push/PR/release.
