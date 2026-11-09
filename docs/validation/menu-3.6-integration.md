# Menu / Social integration with main and 3.6

26 October 2026. Branch `codex/social-chat`.

## Baselines and preservation

- Fetched `origin/main` at `a9a926f` (includes the released 3.5.0 work and prior maintenance merges).
- Verified it is already an ancestor of `feature/3.6-hero-scale-whatsnew` at `751e7ed`; merging that complete candidate therefore includes both requested baselines.
- Saved the prior working tree as local checkpoint `150a40e`, including the approved stronger-glass/no-blur menu, embedded Social, lifecycle fixes, tests and validation notes. A binary diff and untracked-file archive also exist at `/private/tmp/gg-menu-pre-3.6-20261026-111127/`.
- Merged the 3.6 candidate into this branch with a merge commit rather than rewriting the feature history. Other worktrees, local main and release refs were not changed.

## Conflict decisions

Only two files had textual conflicts, both in import groups:

- `src/home/SpotlightHome.tsx`: keep `watchLegendHeight` for footer removal/remount observation and reserve retention, alongside 3.6 `giveWayVars` / `homeStack`. Keep the shown-artwork accent publication in the merged 3.6 Home.
- `src/home/homeCss.ts`: retain the existing Home glass helpers and 3.6 `SCALE_UNIT_CSS`. Helper values match the 3.6 button/glow values.

The remaining shared changes were reviewed against both parent trees. The 3.6 Hero Fit, feed controls, fixed growth, transitions, pill caching, settings, gray uninstalled games, backend and updater remain present. Menu settings/startup wiring and foreground menu status remain present. Menu/Social implementation files are unchanged from checkpoint `150a40e`.

## Verification

- Pre-merge frontend baseline: 143 files / 1,593 tests passed.
- Integrated `pnpm test`: 171 files / 1,909 tests passed.
- `pnpm exec tsc --noEmit` and `pnpm run build`: passed.
- `python -m pytest tests/py -q`: 46 tests passed using an isolated `/private/tmp/gg-menu-merge-pytest` environment; system and bundled Python lacked pytest. No project dependency was changed.
- Python source parsing, all nine JavaScript utility syntax checks and shell syntax checks: passed.
- `bash scripts/package.sh`: passed. ZIP integrity, expected backend files, 3.6.0 package metadata, bundle equality, and absence of source maps/bytecode caches verified.
- `git diff --check`: passed.
- Independent read-only integration review found no important regression.

Integrated frontend SHA-256: `0579f883c32e6528d234e853462d684c1536ac8fac238211c77b94fdaf194ade`.

The branch keeps 3.6.0 package metadata from the candidate; it is a local integration branch for the planned menu work, not a published 4.0.0 release. No push, PR, release or device installation was performed for this merge. The Ally still has the previously tested glass-only frontend; combined 3.6/menu rendering, focus, navigation, updater and installation behavior require device validation before shipping.
