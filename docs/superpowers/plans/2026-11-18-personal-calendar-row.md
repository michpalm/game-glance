# Personal Calendar Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A setting lets row 1 of Spotlight Home's Recommended tab show Steam's Personal Calendar as day columns
(two games each) instead of Play next; the wishlist sale row is unchanged.

**Architecture:** A pure module (`src/home/calendar.ts`) parses Steam's `personalcalendardata`, picks the days and
games, and loads/caches the calendar and each game's name and header art. `useRecommended` loads it when the
setting says so and hands `calendar` to the feed. `feedItems` turns each day into one row-1 item (`day`), which
`FeedSheet` draws with a new `DayColumn` (heading + two focusable game cards); scrolling, restore and row 2 keep
working by column index. The setting is one new key with a dropdown (Quick Access) and a segment row (menu).

**Tech Stack:** TypeScript, React (Decky UI), vitest (`node` env), CSS strings in the Home styles.

**Spec:** `docs/superpowers/specs/2026-11-18-personal-calendar-row-design.md`

## Global Constraints

- Setting `recommendedRow: 'playNext' | 'calendar'`, default `'playNext'`; anything else loads as `'playNext'`.
- Calendar request: `https://store.steampowered.com/personalcalendardata?tag=0&days_backward=7&days_forward=14`
  with the page's own `fetch(..., { credentials: 'include' })` (Steam cookies; `fetchNoCors` has none).
- Days: local dates from 7 back to 14 ahead; only days with games; owned games left out; per day the two lowest
  `nRank`; chronological; the row starts at today, else the first later day, else the last day.
- Names/art: `appdetails?appids=<id>&filters=basic` (`name`, `header_image`) through `fetchNoCors`.
- Cache: calendar 6 h under `calendar:<steamId>`; game info 7 days under `calendar:app:<appId>`; failures not cached.
- Empty or failed calendar: row 1 shows Play next.
- Card A: store page. Focused card shows its name; others art only. `aria-label` = name.
- Never commit without Michael's word; never push; reload the PS5 only with the menu closed, 40 s limit.

## Review Focus

1. Calendar arrives after the feed was entered: focus/selection must not jump while the user is browsing row 1.
2. A day whose games' info fails to load: cards still show (name falls back to nothing, art glass) and A still works.
3. Switching the setting while Home is open: row 1 swaps without a crash or a stale selection index past the end.
4. Steam answers non-JSON / signed out (HTML or 401): no throw, Play next shown, nothing cached.
5. Restore after returning from a store page lands on the same day column.

---

### Task 1: Calendar data (`src/home/calendar.ts`)

**Files:** Create `src/home/calendar.ts`, `tests/home/calendar.test.ts`; Modify `src/data/cache.ts` (TTL `calendar`, `calendarApp`).

**Produces:**
- `parseCalendar(json: unknown): CalendarEntry[]` — `{ appId, releaseDate (s), rank, owned, wishlisted, earlyAccess }`; invalid → `[]`.
- `calendarDays(entries, now: Date): CalendarDay[]` — `{ key 'YYYY-MM-DD', date: Date, today: boolean, games: CalendarEntry[] (≤2) }`.
- `calendarStart(days, now): number` — index of today / first later day / last.
- `dayLabel(day, locale): { weekday: string; date: string }` — Intl short weekday, `2-digit` day/month.
- `getCalendar(steamId, deps: { cache, fetchJson(url): Promise<unknown>, now() }): Promise<CalendarEntry[]>` — never rejects.
- `calendarGames(appIds, deps: { cache, fetcher }): Promise<Map<number, { name: string; art: string | null }>>` — concurrency 4, never rejects.

Tests: parse valid/invalid; grouping by local date, owned dropped, rank order, top 2, range edges, empty days absent;
start index cases; cache hit skips fetch; failure → `[]` and no cache write; game info cached and parsed.

### Task 2: The setting

**Files:** Modify `src/data/settings.ts`, `src/data/settingsCategories.ts`, `src/components/SettingsPanel.tsx`,
`src/menu/components/GameGlancePages.tsx`; Tests `tests/data/settings.test.ts`, `tests/data/settingsCategories.test.ts`.

**Produces:** `Settings.recommendedRow`, `settings.setRecommendedRow(v)`, `RECOMMENDED_ROWS`, `RECOMMENDED_ROW_LABELS`
(`Play next`, `Personal calendar`), HomeRow `'recommendedRow'` listed after `'recommended'` while Recommended is on.
Quick Access: `DropdownItem` "Recommended row"; menu: `SegmentRow` "Recommended row".

### Task 3: Feed items and the day column

**Files:** Modify `src/home/feedLayout.ts`, `src/home/FeedSheet.tsx`, `src/home/useHomeData.ts`, Home styles;
Create `src/home/DayColumn.tsx`; Tests `tests/home/feedLayout.test.ts` (or the existing feed test), markup test for DayColumn.

**Produces:** `FeedData.calendar?: CalendarCard[]` (`{ key, weekday, date, today, games: { appId, name, art }[] }`);
`FeedItem.day?: {...}` and `FeedItem.start?: true`; `calendarColumn(h): { width, cardW, cardH }` (heading 30, padding 8,
gap 8, cards 460:215); `feedItems('recommended')` → day items when `calendar` has days, else Play next.
`FeedSheet`: `at` −1 means "the row's start" (`start` item, else 0); day items render `DayColumn`.

### Task 4: Ship

Full suite + `tsc`; build; copy `dist/index.js`; reload with the menu closed; set the setting to Personal calendar
on the PS5 only with Michael's word; screenshot. No commit until asked.
