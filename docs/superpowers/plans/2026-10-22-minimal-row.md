# Minimal Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Minimal: Steam-style scrolling with uniformly small portrait cards.

**Architecture:** Extend the existing row-style domain and add a pure Minimal layout. Reuse Steam's centering behavior with no wide-card growth, retaining existing selection and activation ownership.

**Tech Stack:** TypeScript, React, Vitest, Rollup and device CEF inspection.

**Spec:** `docs/superpowers/specs/2026-10-22-3.5.0-stability-design.md`

## Global Constraints

- Add `minimal`; retain `steam` as the default and preserve Steam and Spotlight behavior.
- Every card stays small; first and selected games never widen. Opening must not temporarily widen the source card.
- Use an isolated implementation branch. No publication or packaging without release authorization.

## Review Focus

- Empty and one-game lists: finite geometry and reachable Library (Task 1).
- A collection changes size: selection clamps and viewport remains valid (Task 2).
- Held navigation and drag: no transient widening or erroneous opens (Tasks 2–3).
- First card, Library and ghosts: no gap left for a removed wide card (Task 1).
- Opening and B: transition copies use actual layout and return to the same selected card (Task 3).

### Task 1: Minimal geometry and persistence

**Files:** Modify `src/home/recentsLayout.ts`, `src/data/settings.ts`; test `tests/home/recentsLayout.test.ts`, `tests/data/settings.test.ts`.

**Interfaces:** Extend `ROW_STYLES` with `minimal`; export `minimalRowLayout(count: number, focused: number, geometry: RecentsGeometry, viewport: number): RecentsLayout`.

- [ ] Write failing tests: `rowStyleOf('minimal')` returns Minimal, unknown values still return Steam, stored Minimal survives reload. For selections at first/middle/last/Library, every item width is `geometry.capsuleW`, item left is `i * geometry.step`, and scroll centers the focused item's center after the viewport midpoint.
- [ ] Test zero/one games, invalid focus/count/viewport, ghost positions without `geometry.grow`, and equivalence of existing Steam/Spotlight fixtures before and after the addition.
- [ ] Run `npx vitest run tests/home/recentsLayout.test.ts tests/data/settings.test.ts`; confirm new failures.
- [ ] Implement Minimal geometry with existing sanitizers, opacity rules and ghost helpers. Persist the new value and update type comments.
- [ ] Run focused tests and TypeScript; commit the geometry change.

### Task 2: Render, settings and navigation

**Files:** Modify `src/home/RecentsRow.tsx`, `src/components/SettingsPanel.tsx`; inspect `src/home/SpotlightHome.tsx`, `src/home/rowDrag.ts` and `src/home/useRowDrag.ts`; test `tests/home/rowDrag.test.ts` and geometry tests.

**Interfaces:** Keep `RecentsRow` props; route `rowStyle === 'minimal'` through `minimalRowLayout`. Add `{ data: 'minimal', label: 'Minimal' }` to the setting and explain `Minimal: all cards stay small.`

- [ ] Add failing behavioral tests for any navigation/layout branches that currently assume every non-Steam style is Spotlight. Verify Minimal is unaffected by the `expand` fast-cycle flag, keeps a valid selection when games change, and preserves drag thresholds and tap activation rules.
- [ ] Run the affected tests; implement rendering from the selected layout. Audit art choice and size, ghost positions, viewport measurement and focus decoration. Use portrait art for all Minimal game cards and preserve render limits.
- [ ] Run focused tests, full frontend tests, TypeScript and build; check Steam and Spotlight snapshots/behavior remain unchanged. Commit.

### Task 3: Transition and device acceptance

**Files:** Inspect `src/home/openHome.ts`, `src/home/openTargets.ts` and existing open helpers; modify only where real source-card measurement or an explicit style assumption requires it. Test `tests/home/openTargets.test.ts` and affected transition tests; update `docs/device-checklist.md`, `docs/features.md`.

- [ ] First reproduce any incorrect Minimal handover with existing CEF recording tools. If a defect is found, add a failing test for the actual geometry/transition assumption before fixing it; do not introduce a speculative transition rewrite.
- [ ] On Ally and Deck, check first/middle/last game, Library and ghosts, held Left/Right, feed-to-row navigation, touch tap/drag/flick, mouse, switching all three styles and collection changes. Opening and cancelling must not widen a card or jump at handover.
- [ ] Run full frontend tests, TypeScript and build after any fix. Record observed results, commit code/docs, and leave untested cases explicitly marked.
