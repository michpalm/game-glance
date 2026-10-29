# Social polish — local validation (2026-10-29)

The user approved the rendered Social mockup. This bounded pass implements square friend/header avatars, conditional top/bottom friend-list fades, a scaled 20px focused-row inset, shared timestamp/delivery presentation, matching compose rows with Send at the right, and View profile for the displayed friend. Join game remains in the header; rich-message Steam fallback and failed-message Retry stay entered-only. Preview Send is disabled. Controller back navigation and radial keyboard behavior are unchanged; keyboard work remains paused at the user's request.

## Verification

- Regressions were observed failing before implementation: missing profile routing, preview metadata/Send, and scroll helpers. RED log: `.superpowers/sdd/2026-10-29-social-polish/red.log`.
- Final frontend suite: 202 files, 2,302 tests passed. Typecheck, Rollup build and `git diff --check` passed.
- Browser fixture uses actual hook-free SocialContents, production menu/Social styles and scroll helper, with synthetic friends/messages and Decky controls represented as native DOM. It does not mount Steam's React/navigation lifecycle.
- Chromium checks passed at 1500×845 and 829×467 for preview and entered views: square corners, shared compose positions, metadata, conditional masks, first/middle/last focused-row insets, armed Join game header spacing, and no page errors. Screenshots inspected. Fixture/logs: `.superpowers/sdd/2026-10-29-social-polish/`.
- Deferred focus scheduling and cleanup are covered separately. A DOM-test MutationObserver quirk exposed repeated identical dataset writes; updates now avoid redundant writes and ignore non-content records.
- Independent scoped review found no actionable issues.

## Device boundary

No Ally access, installation, reload, restart, message send or profile navigation was performed for this implementation pass. The user is using the Ally and asked to be notified before it is needed. Installation requires explicit approval, a closed menu and a frontend backup. Reload clears unsent drafts. This is frontend-only; no system reboot is needed.

Still to verify on Ally: Steam's actual focus-scroll timing and fade/outline rendering; controller entry/back and View profile; compose consistency and existing send behavior. Local checks do not establish these device behaviors.

Built `dist/index.js` SHA-256: `9c70dba03528bcae80eb707082138b51da2d79b660a89eee5cbb2f8ef8699bb1`.

## Approved Ally installation

After the user replied “ready” to the installation approval request, frontend commit `5fa7055` was installed with the side menu confirmed closed. Previous frontend backed up to `/home/deck/gg-backup-social-polish-20261029-g6ircvh8`. The staged and installed SHA-256 matched `9c70dba03528bcae80eb707082138b51da2d79b660a89eee5cbb2f8ef8699bb1`; an independent post-reload checksum matched too. Plugin reload requested successfully; subsequent read confirmed Game Glance present in DeckyPluginLoader.plugins. No backend change or system reboot. Real controller/scroll rendering, profile navigation, and send acceptance remain for user/device validation; no agent-sent messages.
