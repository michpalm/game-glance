# Embedded Social tab — local implementation

25 October 2026. Branch `codex/social-chat`, based on `codex/floating-menu` at `5d16dcc`.

## Implemented

- Live full friends list with existing avatars, presence colors and current-game descriptions.
- 30/70 friends/conversation panel using the approved visual language for its own controls.
- Explicit conversation entry, embedded one-to-one history, bounded 200-message moving window, older-history loading and return to latest.
- Native Steam text filtering and outbound escaping; unsupported rich content opens in Steam.
- Native text input/keyboard path and explicit Send/Retry actions.
- Pending, failed and acknowledged delivery states. No second message queue.
- In-memory account/friend drafts, including correct outcomes after closing, reopening or disconnecting during a send.
- One owned native view; real visibility/scroll state; edge-triggered activation respecting Steam's idle handling.
- Back returns to the same friend before closing the menu. Keyboard/modal input retains native ownership.
- Account/policy/friend changes invalidate old work and clear old-account content.
- Native fallback and lazy subscriptions, with cleanup on tab change, handoff, close, disable and unload.

## Verification

- `pnpm test`: **140 test files, 1,581 tests passed** (baseline: 1,539).
- `pnpm exec tsc --noEmit`: passed.
- `pnpm run build`: passed; local output is `dist/index.js`.
- `git diff --check`: passed.
- Independent read-only review completed. Important findings were fixed with regression tests: native history readiness/timeouts, idle acknowledgment, retry draft duplication, scroll anchoring, and issued-write completion across close/disconnect.
- Metadata-only check on the current Ally Steam build confirmed native helper discovery, text conversion/filtering, policy gate, ready/connected store and expected browser/account shapes. No conversation creation, message history access, read acknowledgment or send occurred.

## Device validation remaining

No installed-build rendering or controller/keyboard acceptance is claimed. Before shipping, test the installed tab over Home and a running game: list selection, A/B and keyboard cancel, paging/read boundaries, reconnect, native fallback and disable/reload. Live delivery still needs an explicitly authorized send test naming its recipient and text.

Groups, voice and uploads remain available through Steam rather than a custom composer. Rich messages use a safe native-view fallback.

## Integration state

The new worktree is attached to this chat. All feature changes are local. The authorized Ally preview was installed as recorded below; no remote push, PR or publication occurred.

The original floating-menu worktree and its unfinished accent changes are untouched. This branch contains the committed floating-menu baseline plus Social and the subsequent [QAM VDL preview](qam-vdl.md). The 3.6/visual-language rebase and wider release integration remain separate work for the planned release.

## Ally deployment attempt — 26 October 2026

The user authorized building and sending this test build to the Ally. Fresh verification passed all 1,581 tests, typecheck and Rollup build. Frontend SHA-256: `504c10515a7943a49d7ec9d5d0ea6388e39978b5942f96d7157a9e1018b73775`.

The Ally initially did not respond. After the user confirmed it was awake on home Wi-Fi, deployment succeeded.

- Backed up the original 3.6.0 frontend, package metadata and settings at `/home/deck/gg-social-backup-20261026-000925/` (private backup directory; settings backup mode 0600).
- Replaced only `/home/deck/homebrew/plugins/game-glance/dist/index.js`, after verifying the transferred SHA-256, using an atomic rename. Backend and package metadata remain 3.6.0.
- Reloaded Game Glance with Decky's existing importPlugin method; the plugin returned loaded with settings and unload handler present.
- Verified the custom menu, Social tab, Social panel, friends pane and native fallback mount with no Social error. No conversation was entered and no screenshot or private friend identity was collected.
- Verified the installed bundle matches the local build, and the saved settings/menu-preferences fingerprint is unchanged.
- Left the Social tab open for the user. Keyboard, in-conversation rendering, read behavior and sending still require the respective device checks; no real message was sent.

The staged frontend-only artifact and manifest are saved in `/Users/micpaal/.codex/visualizations/2026/10/25/01a174ca-7ab2-7ec3-a6a1-3c0d37b9f207/deploy/`. Rollback is to restore the backed-up `index.js` to the plugin's dist directory and reload Game Glance through Decky.

