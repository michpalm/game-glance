# Social chat progress

Plan: docs/superpowers/plans/2026-10-25-social-chat.md

User approved the proposed embedded-chat scope and implementation. Execute inline; no repeated approval request. Separate worktree created because the existing menu worktree is owned by another chat. Preserve original accent changes there.

Pre-flight: Task 1 defines service/adapter contracts consumed by Tasks 2–3; maintain matching typed snapshots and teardown. No new packages.

Baseline: 1,539 tests passed. Dependencies installed from the lockfile without lifecycle scripts.

Task 1: complete — account-scoped Social session, explicit entry, draft isolation, stale-request guards, bounded moving history window and retry/delivery state. Red/green tests observed.
Task 2: complete — guarded native binding/discovery, native text filter/escape, full-string IDs, one owned view, native delivery/queue outcomes and history completion. Red/green tests observed.
Task 3: implemented — 30/70 panel, native TextField, rich-content fallback, paging/scroll anchor, Back/focus restoration, lazy startup and disposal. Final review/verification in progress.

First integrated verification: 140 files / 1,573 tests passed; tsc --noEmit passed; Rollup build passed. Subsequent late-completion regressions added and passing. Final totals will be recorded after the last review fix.

Independent read-only review found four important issues: sticky native history readiness; idle read acknowledgments on repeated visibility updates; stale draft after Retry; and scroll anchor consumed while loading. Each received a focused fix and regression coverage. A bounded-page message anchor is used instead of total-height changes.

Ruling: preserve native visibility for an older page but report not-at-bottom — this avoids acknowledging newer, unrendered messages without falsely reporting that the whole chat is hidden.
Ruling: late issued writes retain their native ownership; observe their result after the view closes, and update only the unchanged draft in the same account generation. Do not abandon the native write or create a second send queue.
Ruling: the existing floating-menu checkout belongs to another chat. Implement on codex/social-chat from its committed tip, without copying or editing its unrelated dirty accent work.

Current Ally metadata-only capability check passed: native chat-view/conversion helper found by shape, policy gate available and allowed, ready/connected friends app, account/browser-context shapes, text filter and chat lookup available; synthetic escaping returned the expected escaped opening bracket. No conversation was opened and no user data, read acknowledgment or send was requested. This does not validate rendered/interactive Social on-device.

No device build installation, real messages, push or publication performed.

Final verification: 140 files / 1,581 tests passed; TypeScript and Rollup passed; diff whitespace check passed. Review follow-up fixes include timed-out concurrent history refresh and issued-write outcomes when connectivity changes before teardown. Final handoff: docs/validation/social-chat.md. Keep branch/worktree locally.

