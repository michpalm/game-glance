# Achievement Pins and Scrolling Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Y pins up to two achievements per set at the top of the menu's Achievements list (saved in settings), and
cut-off text on the game page's featured Achievements card and stat-card description scrolls into view.

**Architecture:** Pins are a pure list operation (`src/menu/achievementPins.ts`) fed into the pure page model
(`achievementsPage`), stored in the settings store under one new key. Scrolling text is two small DOM controllers
(`src/components/scrollText.ts`) driven by timers and events, attached by the two card components.

**Tech Stack:** TypeScript, React (Decky UI), vitest in a `node` environment (DOM is faked with plain objects, as
`followFocus` tests do), CSS strings in `src/styles/themeCss.ts` and `src/menu/achievementsStyles.ts`.

**Spec:** `docs/superpowers/specs/2026-11-18-achievement-pins-and-text-scroll-design.md`

## Global Constraints

- Pins: per set, at most **2**, a third replaces the **oldest**; Y = Decky `onOptionsButton` (as `StoragePage` uses).
- Pinned rows are the first rows of the set's list, in pin order, and scroll with it; never in the "Unlocked" list.
- A pin of an unlocked (or no longer present) achievement is dropped when read.
- Stored in the settings file: `achievementPins: Record<"<appId>:<setId>", number[]>` (achievement `internal_key`, oldest first).
- One-line marquee: waits **1.5 s** after focus, **30 px/s**, holds **2 s** at the end, fades back, repeats while focused; text that fits never moves; focus lost resets at once.
- Description: after **3 s** without input, moves up **one line every 3 s**; at the end holds, then returns to the top; any input returns it to the top.
- Respect `prefers-reduced-motion: reduce` (no movement).
- Never commit without Michael's word; never push.

## Review Focus

1. Toggling a pin re-orders the list: focus must stay on the same achievement (rows keyed by `item.key`).
2. A set with fewer than two locked achievements, or an empty list: pins and Y must not break it.
3. Settings written by an older build (no `achievementPins`) or a malformed value: loads as `{}`.
4. Text that fits exactly (scrollWidth == clientWidth, or within 1px): never moves.
5. A card unmounting mid-animation: timers and listeners cleaned up (no errors after navigation).

---

### Task 1: Pin list rules and the page model

**Files:** Create `src/menu/achievementPins.ts`; Modify `src/menu/achievementsPage.ts`; Test `tests/menu/achievementPins.test.ts`, `tests/menu/achievementsPage.test.ts`

**Interfaces — Produces:**
- `MAX_PINS = 2`
- `pinSlot(appId: number, setId: number): string` → `"<appId>:<setId>"`
- `togglePin(pins: readonly number[], key: number): number[]` — removes if present, else appends, dropping the oldest beyond 2.
- `achievementsPage(..., sort, pinned: readonly number[] = [])`: `ItemRow` gains `pinned: boolean`; in the
  closest / rarest / common lists the pinned, still-locked achievements of the picked set come first in pin order,
  then the rest (without duplicates) in the sort's order; the unlocked list ignores pins.
- `AchievementsPageView` gains `pins: number[]` — the live pins (pinned keys that exist in the set and are locked).

Tests: toggle add / remove / third replaces oldest; slot format; page puts pins first in each locked sort, keeps
the rest's order, drops unlocked or unknown pins from `pins`, ignores pins in Recently unlocked; empty set with pins.

### Task 2: Pins in the settings store

**Files:** Modify `src/data/settings.ts`; Test `tests/data/settings.test.ts` (or the existing settings test file)

**Interfaces — Produces:** `Settings.achievementPins: Record<string, number[]>` (default `{}`);
`settings.setAchievementPins(slot: string, keys: number[]): Promise<void>` — an empty list removes the slot.

Load keeps only string keys with arrays of finite integers, at most 2 each; anything else is `{}`.
Tests: default `{}`; round trip; malformed values dropped; empty list removes the slot; other settings untouched.

### Task 3: Y on the Achievements page

**Files:** Modify `src/menu/components/MenuAction.tsx`, `src/menu/components/AchievementsPage.tsx`, `src/menu/achievementsStyles.ts`; Test `tests/menu/achievementsPageView.test.ts`

**Interfaces — Consumes:** Tasks 1–2. **Produces:** `MenuAction` optional `onOptions?(): void` and
`optionsLabel?: string` → `onOptionsButton` / `onOptionsActionDescription` on its `DialogButton`.
`AchievementsPageView` props gain `onTogglePin?(key: number): void`. Each list row gets Y with label `Pin` or
`Unpin`; a pinned row carries `gg-ach-pinned` and a pin icon (`LuPin`) before its name.
`AchievementsPage` reads `useSettings().achievementPins[pinSlot(appId, page.picked)]`, passes it to
`achievementsPage`, and on Y saves `togglePin(page.pins, key)`.

Tests: rows pass Y with the right label; a pinned row shows the icon and class; Y calls `onTogglePin(key)`.

### Task 4: One-line marquee

**Files:** Create `src/components/scrollText.ts`; Modify `src/components/FeaturedCard.tsx`, `src/styles/themeCss.ts`; Test `tests/components/scrollText.test.ts`

**Interfaces — Produces:** `marqueeTimes(overflowPx: number): { wait: 1500; slide: number; hold: 2000; fade: 300 } | null`
(null when overflowPx ≤ 1; slide = overflowPx / 30 s); `attachMarquee(card: HTMLElement, line: HTMLElement): () => void`
— starts on the card's `focusin` (or when it gains `gg-card-focus`), stops and resets on `focusout`; moves the
line's first child with `transform: translateX(-Npx)` transitions; sets `data-gg-marquee` while running so CSS
switches `text-overflow` to clip. FeaturedCard wraps the icon value and the caption text in a `<span>` and attaches
it when the card is focusable. Tests (fake timers + fake elements): fits → never moves; overflow → waits 1.5 s,
slides, holds, resets, repeats; focus out resets at once; cleanup removes listeners and timers.

### Task 5: Description that rolls

**Files:** Modify `src/components/scrollText.ts`, `src/components/InfoCard.tsx`, `src/styles/themeCss.ts`; Test `tests/components/scrollText.test.ts`

**Interfaces — Produces:** `attachRoll(desc: HTMLElement, doc: Pick<Document, 'addEventListener' | 'removeEventListener'>): () => void`
— after 3 s with no `keydown` / `pointerdown` / `wheel` / `focusin` on `doc`, if the text has more lines than shown
(scrollHeight > clientHeight + 1), steps `scrollTop` by one line height every 3 s; at the bottom holds 3 s and
returns to 0; any input returns to 0 and restarts the 3 s wait. CSS: the page description keeps its 3-line height
but uses `overflow:hidden` with line-clamp off while `data-gg-roll` is set, `scroll-behavior:smooth`.
Tests: short text never moves; idle 3 s then one line per 3 s; input resets; cleanup.

### Task 6: Ship to the PS5

Full suite and `tsc`; `npm run build`; copy `dist/index.js`; reload only with `.gg-menu` absent and a 40 s limit;
screenshot after Michael opens the page. No commit until Michael asks.
