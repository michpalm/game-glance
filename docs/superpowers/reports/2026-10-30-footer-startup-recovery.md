# Footer startup recovery — 2026-10-30

User reports Game Glance footer does not acquire its floating styling after the first plugin reload following installation until the menu is opened/closed. Reproduced repeatedly on installed f1a0de8ead264975f210d1b892bdb9f1d9149d0bfb5d6dcc985d944beed849e1 with all opt-ins true, mounted/foreground/visible Home, no menu, keyboard, launch or opening gate.

## Evidence

- Normal installed frontend reload: Home returned after its existing remount, but footer marker/header ownership/status cells remained absent. It remained stalled for the ten-second observation. Opening/closing menu recovered immediately.
- A measurement notification (resize event only, no actual resize) also recovered immediately.
- Read-only debugger closure inspection verified the actual Home runtime footerReady=false and no acquired header. Its lease was alive, unsuspended, idle, bound to the same connected current Footer element, with ready=false and measure=true. Calling the existing pure discoverNativeFooter afresh on its captured connected/current Home root returned true. This establishes a cached unavailable result without a subsequent refresh, not an absent native footer, setting, focus or stale binding.
- A temporary measurement notification upon native transition completion recovered the footer without a menu cycle. Native position-only transform settling does not generate a ResizeObserver content-size change; existing footer observation covers sizes and content, but misses that retry path.

Private sanitized evidence under `/Users/micpaal/Documents/Claude/Bazzite/recordings/2026-10-30-footer-startup/`: reload timelines, runtime-internals-2.json and browser checks. No friend content, account identifiers, unknown native module calls, notification actions or messages were required.

## Correction

`acquireHomeFooter` retains its strict native structure/geometry contract. An initially unavailable lease gets one next-animation-frame recheck. Native transition/animation completion or cancellation can trigger a fresh coalesced measurement while unavailable. Once ready, those events do no measurement work. No polling timer, synthetic menu action or navigation workaround. Suspension skips recovery; resume can retry; disposal cancels queued frames and removes listeners. Shared helper covers Home and page footer leases. rAF is a next-frame check, not a guaranteed post-paint event.

## Verification and install candidate

- Five startup regressions failed before the implementation; focused lifecycle cases pass afterward, including disposal, pending-frame cancellation, suspend/resume and native position-only end/cancel signals.
- Real Chromium: first-frame layout correction and actual120ms transform transition both recover automatically; native footer nodes are preserved and markers restore on dispose.
- Final frontend: **222 files /2559 tests passed**. Typecheck, Rollup build and git diff check passed.
- Independent read-only review: no actionable findings. Minor lifecycle coverage gaps were addressed; terminology corrected to next-frame.
- Candidate SHA256 **87d8a388e3cbaf4c76102d6df67b8e1442deea8e60617fa424e18876a5e618ed**, saved immutably as `recordings/2026-10-30-footer-startup/candidate-index.js` in the Bazzite workspace.

No installation, commit, push, PR or release in this task yet. Existing changes were preserved. Only the currently installed frontend was reloaded for diagnostics; menu closed and working Home footer restored afterward. Installed baseline remainsf1a0de8ead264975f210d1b892bdb9f1d9149d0bfb5d6dcc985d944beed849e1.

After explicit approval, install with menu closed, checksum verify and back up baseline, atomically replace frontend, guarded reload, independently verify digest/plugin load. Record the initial reload with no menu/resize workaround and confirm footer/header/status acquire on their own; repeat reload. The fix removes the manual menu dependency, but does not promise zero milliseconds before Steam has mounted valid native geometry, or change the existing1500ms Home remount delay.


## Approved installation and two device reloads

User approved “yes”. Menu closed was verified before staging and immediately before atomic replacement. Previousf1a0de8ead264975f210d1b892bdb9f1d9149d0bfb5d6dcc985d944beed849e1 frontend backed up to `/home/deck/gg-backup-footer-startup-20261030-msbi4kjt/index.js` with original checksum. Staged candidate and replacement verified. Independent postreload digest matched87d8a388e3cbaf4c76102d6df67b8e1442deea8e60617fa424e18876a5e618ed, plugin loaded.

Two controlled reloads ran using installed code only, with no menu open/close, synthetic resize, injected recovery event or temporary helper. Entire recorded timelines report menu=false. First new Home observation without ownership at2491ms /2445ms; footer/header and4 status controls acquired automatically at2974ms /2967ms respectively, about483ms /522ms after Home's return. Native transition settling still imposes that brief delay; this is not a zero-millisecond first-frame footer claim. Both remained active through the10s observation. Load counter47 then48. No diagnostic listeners or overlays remain; Ally left on Home, menu closed. No reboot, backend change, commit/push/PR/release.

Private evidence: installed-reload-1.json and installed-reload-2.json in the task recordings directory. User visual acceptance remains separate from these measured checks.
