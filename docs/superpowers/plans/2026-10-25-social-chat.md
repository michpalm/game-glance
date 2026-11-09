# Embedded Social Chat Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Social placeholder with live friends and embedded one-to-one history/composition backed by Steam.
**Architecture:** A session service owns friends, entered conversation and in-memory drafts; a native adapter owns guarded Steam discovery, history, view visibility and delivery observations. A React panel supplies controller navigation and keyboard input.
**Tech Stack:** TypeScript, React, Decky UI, Vitest, existing Steam stores; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-25-social-chat-design.md

## Global Constraints
- Only explicit conversation entry creates a chat. Browsing friends does not activate or acknowledge chats.
- No real sends during development. No device install, remote push, PR or release.
- Full-string Steam IDs. Snapshots and drafts isolated by account.
- At most 200 rendered messages; older history explicitly loaded.
- Preserve native text filtering, outbound escaping, pending/failure/acknowledgment semantics and native fallback.
- One owned native view; release only owned resources on close/tab/handoff/disable.
- 30/70 layout. Token-compatible glass, type and focus; do not migrate other menu styles.

## Review Focus
- Stale history after selecting a different friend/account cannot replace current content (Task 1).
- Native send resolves on failure; failures must retain draft and never duplicate a pending send (Tasks 1–2).
- Hidden/scrolled-up/background conversation never acknowledges unread (Tasks 1–2).
- Friend removal, blocked status, disconnected or missing native helpers keep fallback accessible (Tasks 1–2).
- B closes keyboard before conversation; returning to list restores stable friend focus (Task 3).

### Task 1: Account-scoped Social session
**Files:** src/menu/steam/social.ts; tests/menu/social.test.ts.
**Interfaces:** Export SocialBindings, SocialContext, ChatSession, ChatMessage, SocialSnapshot and createSocial(bindings).
Service offers get/subscribe, preview(id), enter(id), leave(), setDraft(text), setVisibility(visible,atBottom), loadMore(), send(), retry(messageId), dispose().
Native open(context, steamId) returns a ChatSession with snapshot/read, subscribe, load, more, send, retry, visibility and dispose.
- [x] Write tests for preview without open, entry, stale async requests, account/friend removal, full list, draft isolation, send failure/pending, history and teardown.
- [x] Run targeted tests RED; implement service; run GREEN.
- [x] Record result in progress ledger.

### Task 2: Native friends/chat bridge
**Files:** src/menu/steam/chatNative.ts; tests/menu/chatNative.test.ts.
**Interfaces:** discoverSocialBindings() returns SocialBindings. Export native binding factory with injected dependencies for meaningful contract tests.
Discover native outgoing conversion and visibility enum by export shape, not minified IDs.
- [x] Write tests for full-string to account-ID conversion, visibility gating, filter/escape use, native delivery state, invalid data and missing helpers.
- [x] Run RED; implement guarded bindings and exactly-once view release; run GREEN.
- [x] Verify current runtime capability shapes without reading real conversations.

### Task 3: Panel, navigation and lifecycle
**Files:** src/menu/components/SocialPanel.tsx; src/menu/socialStyles.ts; src/menu/components/MenuShell.tsx; src/menu/startMenu.ts; tests/menu/socialPanel.test.ts; tests/menu/startMenu.test.ts.
**Interfaces:** SocialPanel({social, entered, enter, leave, handoff}) uses service snapshot; menu history token social-chat owns B behavior.
- [x] Write controller/component tests for list, compose/failed states, safe text, history and Back, plus startup/disposal.
- [x] Run RED; implement panel and service wiring; run GREEN.
- [x] Run full tests, tsc --noEmit and Rollup build. Review diff and address important findings.
- [x] Document device-validation limits and local handoff. Keep changes local.

