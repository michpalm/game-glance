# Post-reload Home opening guard

User approved the bounded guard on 2026-10-30. Frontend candidate only; not installed.

## Evidence

The healthy manual comparison did not reproduce a flicker. That reload started on a game page and the opening happened after startup settled, so it did not exercise the Home remount timer.

A controlled replay reloaded the existing installed frontend on Home and clicked the selected Home card about one second after the new load counter appeared. This opens the library page, not the game itself. The local diagnostic captured Home's morph at 1207 ms after load, an unexpected `/library` route at 2311 ms while the bridge was present at opacity 1, then the intended game page at 3115 ms. The automatic 1500 ms reload refresh can interrupt the opening while its pathname still says Home. Recorded sample intervals include main-thread/protocol delays, so these are observed times, not exact animation durations.

Private local evidence: `/private/tmp/gg-transition-audit/reload-race.json`. It is not a repository artifact.

## Change

`src/home/reloadRemount.ts` now checks the actual Steam owner document for the old or current copy's Home opening marker or bridge. It retries after 100 ms while Home is opening; if the route has changed it abandons the refresh. An opening cancelled back onto Home can still receive the needed refresh. The delayed return from Library only runs if Library remains current. Unload cancels both timer phases and a stopped latch guards already queued callbacks.

Normal opening, readiness and bridge timings are unchanged. This addresses the captured reload navigation race; it does not establish that every possible cold hero-image flicker is resolved.

## Verification

- Seven new regression cases failed against the old behavior, then passed with the guard.
- Focused reload tests: 13 passed.
- Full suite: 221 files, 2535 tests passed.
- Typecheck, frontend build and `git diff --check` passed.
- Independent review: no actionable defects.
- Candidate `dist/index.js` SHA-256: `528bdf8eae638b4ef75df7cb3f6bc8464c6e2b872e51c4bfb18687fb45ad6686`.
- Pending explicit installation approval, followed by repeating the same post-reload Home opening scenario on the Ally.

No install, commit, push or publication was performed for this candidate.

## Authorized installation

User explicitly requested installation. Installed and reloaded the frontend on the Ally; no backend change or reboot. Verified the previous baseline, staged digest, atomic replacement, and post-reload digest. Plugin is loaded and the load counter advanced to 38.

- Installed SHA-256: `528bdf8eae638b4ef75df7cb3f6bc8464c6e2b872e51c4bfb18687fb45ad6686`.
- Backup: `/home/deck/gg-backup-reload-guard-20261030-nyokrhig/index.js`.
- The controlled replay stopped when Steam reported an open side menu. No result is claimed for that replay; the guard's on-device visual confirmation remains pending.
