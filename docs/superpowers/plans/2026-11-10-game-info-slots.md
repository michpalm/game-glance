# Game Info Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick three stats and one featured stat that Home's chips and both game-page looks show, in their order, with a detailed card for the featured one.

**Architecture:** One pure slot model (`logic/infoSlots.ts`) stored in settings decides which stats show and in what order. Pure builders turn slots plus a game's facts into Home's chips, the Clean row and the Full look's info stats; pure view functions build each featured card. The open transition keeps mapping chips to page places by stat id; the page targets learn which stat is featured and whether the info card spans the row.

**Tech Stack:** TypeScript, React (Decky `@decky/ui`), vitest, rollup (`pnpm build`), `tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-11-10-game-info-slots-design.md`

## Global Constraints

- Stat ids: `'played' | 'size' | 'achievements' | 'protondb' | 'hltb'`. Featured ids: the same without `'size'`.
- Default slots: `stats: ['played', 'size', 'achievements'], featured: 'hltb'` (today's look exactly).
- Picking a stat another slot holds swaps the two slots. Nothing shows twice.
- ProtonDB is requested only while `'protondb'` is in a slot.
- Home: three stats in slot order, then the featured stat, one row of at most four chips; empty or inapplicable slots close up.
- Clean look: the same four, same order. Full look: the three stats in the info card, the featured stat as the right-hand card; featured `null` removes that card and the info card spans the row.
- An inapplicable featured stat keeps its card with one line: "No achievements", "No ProtonDB rating yet".
- Settings live in the **Game page** category, section **Game info**: "Stat 1", "Stat 2", "Stat 3", "Featured", note "Shown on Home and the game page. ProtonDB sends the game's Steam app id to ProtonDB."
- `homeChips` (be5ce6c, unreleased) is removed without migration.
- Commits: author/committer `Michael Palma <18511803+michpalm@users.noreply.github.com>` (repo-local config already set); end each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.
- Every task ends with `pnpm vitest run` and `pnpm tsc --noEmit` clean.

## Review Focus

1. A stored slot value with a duplicate (`stats: ['played','played','hltb']`) or `size` as featured: expect it read as valid slots (first occurrence kept, later emptied; featured `size` → default `'hltb'`). Pinned in Task 1.
2. A shortcut (non-Steam) game with ProtonDB in a slot: no request, the slot closes up on Home and Clean, the featured card says "No ProtonDB rating yet". Pinned in Tasks 4 and 6.
3. Featured `'achievements'` for a game whose details have not loaded (`achievements` undefined): the card shows its title and "No achievements" only after details say total 0; while unknown it shows the title with a skeleton row. Pinned in Task 6.
4. Featured `null` with the open transition: Home's chips fly into the full-width info card; no shell is left for a missing card. Pinned in Task 8.
5. A user's order where the featured chip is not HowLongToBeat: no accent label swap on a non-HLTB chip that has no accent copy on the page (ProtonDB keeps its tier colour). Pinned in Task 8.

---

### Task 1: Slot model

**Files:**
- Create: `src/logic/infoSlots.ts`
- Test: `tests/logic/infoSlots.test.ts`

**Interfaces:**
- Produces:
  - `type StatId = 'played' | 'size' | 'achievements' | 'protondb' | 'hltb'`
  - `type FeaturedId = Exclude<StatId, 'size'>`
  - `type SlotIndex = 0 | 1 | 2 | 'featured'`
  - `interface GameInfoSlots { stats: [StatId | null, StatId | null, StatId | null]; featured: FeaturedId | null }`
  - `const STAT_IDS: readonly StatId[]` (order above), `const FEATURED_IDS: readonly FeaturedId[]` (`['hltb','protondb','achievements','played']`)
  - `const DEFAULT_SLOTS: GameInfoSlots`
  - `function infoSlotsOf(raw: unknown): GameInfoSlots`
  - `function assignSlot(slots: GameInfoSlots, slot: SlotIndex, id: StatId | null): GameInfoSlots`
  - `function slotOrder(slots: GameInfoSlots): StatId[]` (stats then featured, nulls dropped)
  - `function usesStat(slots: GameInfoSlots, id: StatId): boolean`
  - `const STAT_LABELS: Record<StatId, string>` = Play time, Space required, Achievements, ProtonDB, HowLongToBeat

- [ ] **Step 1: Write the failing tests**

```ts
it('defaults to today', () => expect(infoSlotsOf(undefined)).toEqual({ stats: ['played', 'size', 'achievements'], featured: 'hltb' }));
it('reads junk slot by slot', () => {
    expect(infoSlotsOf({ stats: ['protondb', 'nope', 7], featured: 'size' })).toEqual({ stats: ['protondb', 'size', 'achievements'], featured: 'hltb' });
    expect(infoSlotsOf({ stats: [null, null, null], featured: null })).toEqual({ stats: [null, null, null], featured: null });
    expect(infoSlotsOf('x')).toEqual(DEFAULT_SLOTS);
});
it('keeps the first of a duplicate and empties the rest', () =>
    expect(infoSlotsOf({ stats: ['played', 'played', 'hltb'], featured: 'hltb' })).toEqual({ stats: ['played', null, 'hltb'], featured: null }));
it('swaps when the stat is already placed', () => {
    expect(assignSlot(DEFAULT_SLOTS, 0, 'achievements')).toEqual({ stats: ['achievements', 'size', 'played'], featured: 'hltb' });
    expect(assignSlot(DEFAULT_SLOTS, 'featured', 'played')).toEqual({ stats: ['hltb', 'size', 'achievements'], featured: 'played' });
    expect(assignSlot(DEFAULT_SLOTS, 1, 'protondb')).toEqual({ stats: ['played', 'protondb', 'achievements'], featured: 'hltb' });
    expect(assignSlot(DEFAULT_SLOTS, 2, null)).toEqual({ stats: ['played', 'size', null], featured: 'hltb' });
});
it('never features Space required, and a swap that would put it there empties the featured slot instead', () => {
    expect(assignSlot(DEFAULT_SLOTS, 'featured', 'size')).toEqual(DEFAULT_SLOTS);
    expect(assignSlot(DEFAULT_SLOTS, 1, 'hltb')).toEqual({ stats: ['played', 'hltb', 'achievements'], featured: null });
});
it('orders stats then featured', () => expect(slotOrder({ stats: ['hltb', null, 'played'], featured: 'protondb' })).toEqual(['hltb', 'played', 'protondb']));
it('knows whether a stat is used', () => { expect(usesStat(DEFAULT_SLOTS, 'protondb')).toBe(false); expect(usesStat(DEFAULT_SLOTS, 'hltb')).toBe(true); });
```

- [ ] **Step 2: Run** `pnpm vitest run tests/logic/infoSlots.test.ts` — Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `src/logic/infoSlots.ts` (pure). A featured `'size'` from a swap becomes `null` (second "never features" case).
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `git add src/logic/infoSlots.ts tests/logic/infoSlots.test.ts && git commit -m "Add the game info slot model"`

### Task 2: Settings store (replaces homeChips)

**Files:**
- Modify: `src/data/settings.ts` (field, load, setter)
- Delete: `src/home/chipSwitches.ts`
- Modify: `tests/data/settings.test.ts` (six default `toEqual` lines: `homeChips: { protondb: false }` → `infoSlots: DEFAULT_SLOTS`; replace the "settings: info chips" describe)

**Interfaces:**
- Consumes: Task 1 `GameInfoSlots`, `DEFAULT_SLOTS`, `infoSlotsOf`, `assignSlot`, `SlotIndex`, `StatId`.
- Produces: `Settings.infoSlots: GameInfoSlots`; `settings.setInfoSlot(slot: SlotIndex, id: StatId | null): Promise<void>`. `Settings.homeChips` and `setHomeChip` no longer exist.

- [ ] **Step 1: Failing tests** in `tests/data/settings.test.ts`, describe `settings: game info slots`:
  - `store.get().infoSlots` equals `DEFAULT_SLOTS` on an empty kv; after `setInfoSlot(1, 'protondb')` a reloaded store reads `{ stats: ['played','protondb','achievements'], featured: 'hltb' }`.
  - `setInfoSlot(0, 'hltb')` stores `{ stats: ['hltb','size','achievements'], featured: 'played' }` (swap via `assignSlot`).
  - A stored `infoSlots: { stats: [...], featured: 'hltb', later: 1 }` keeps `later: 1` after a change (as `setFeedTab` keeps unknown keys).
- [ ] **Step 2: Run** — Expected: FAIL (`setInfoSlot` undefined).
- [ ] **Step 3: Implement**: `infoSlots: infoSlotsOf(raw?.infoSlots)` in `load`, `DEFAULTS.infoSlots = DEFAULT_SLOTS`, setter persisting `{ infoSlots: { ...object(retained.infoSlots), ...next } }`. Remove `homeChips` everywhere it is read (`useHomeData`, `GameGlancePages`, `SettingsPanel`, `settingsCategories` `'protondb'` row and `PROTONDB_SWITCH_TEXT`), and the matching tests in `tests/data/settingsCategories.test.ts` and `tests/menu/gameGlancePages.test.ts` (`gg:home:protondb` leaves the expected Home rows; fixtures get `infoSlots: DEFAULT_SLOTS`). `useHomeData` reads `infoSlots` and asks ProtonDB when `usesStat(infoSlots, 'protondb')`.
- [ ] **Step 4: Run** `pnpm vitest run && pnpm tsc --noEmit` — Expected: all pass.
- [ ] **Step 5: Commit** "Store game info slots in settings; drop the ProtonDB switch"

### Task 3: Settings pickers (Game page → Game info)

**Files:**
- Modify: `src/data/settingsCategories.ts` (copy constants, summary)
- Modify: `src/menu/views.ts` (`GAME_INFO_VIEW = 'gg:game-page:info'`, back target `gg:game-page:info:<slot>`)
- Modify: `src/menu/components/GameGlancePages.tsx` (section in `GamePage`, new `GameInfoPicker` view)
- Modify: wherever `HOME_ROW_VIEW` is routed to `HomeRowPicker` (same file that routes views; follow `HOME_ROW_VIEW`)
- Modify: `src/components/SettingsPanel.tsx` (Decky drop-downs)
- Test: `tests/menu/gameGlancePages.test.ts`, `tests/data/settingsCategories.test.ts`

**Interfaces:**
- Consumes: Task 1 `STAT_IDS`, `FEATURED_IDS`, `STAT_LABELS`, `SlotIndex`; Task 2 `setInfoSlot`.
- Produces: `GAME_INFO_NOTE = "Shown on Home and the game page. ProtonDB sends the game's Steam app id to ProtonDB."`; `slotLabel(slot: SlotIndex): string` ("Stat 1".."Stat 3", "Featured"); `slotChoices(slot: SlotIndex): Array<StatId | null>` (featured: `FEATURED_IDS` + null; stats: `STAT_IDS` + null); picker view id `${GAME_INFO_VIEW}:${slot}`.

- [ ] **Step 1: Failing tests**:
  - `GamePage` ids include, after `gg:game-page:look`, `gg:game-page:slot:0`, `gg:game-page:slot:1`, `gg:game-page:slot:2`, `gg:game-page:slot:featured`; each row shows `STAT_LABELS[id]` or "None" as its value.
  - `GameInfoPicker` for `'featured'` lists HowLongToBeat, ProtonDB, Achievements, Play time, None (no Space required); choosing ProtonDB calls `store.setInfoSlot('featured','protondb')` and goes back.
  - `categorySummary('game-page', …)` reads `'Full look · HowLongToBeat featured'`, `'Clean look · Nothing featured'` for featured null.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**. Menu rows use `MenuAction` with class `gg-plugin-picker` like the Games row; the section heading is `<h3>Game info</h3>` followed by `<p className="gg-plugin-note">{GAME_INFO_NOTE}</p>`. Decky panel: four `DropdownItem`s (`@decky/ui`) with the same labels, under a "Game info" field heading in the Game page group.
- [ ] **Step 4: Run** all tests and tsc — Expected: pass.
- [ ] **Step 5: Commit** "Pick game info slots in settings"

### Task 4: ProtonDB summary details and a shared hook

**Files:**
- Modify: `src/data/protondb.ts`, `tests/data/protondb.test.ts`
- Create: `src/data/useProton.ts`
- Modify: `src/home/useHomeData.ts` (use the hook; delete `protonMemo`)

**Interfaces:**
- Produces:
  - `ProtonResult` found case becomes `{ status: 'found'; tier: ProtonTier; details?: ProtonDetails }`, `interface ProtonDetails { total: number; confidence: string; trending: ProtonTier | null; best: ProtonTier | null }`
  - `function useProton(appId: number | null, wanted: boolean): ProtonResult | undefined` — session memo by app id; `undefined` while unknown or when `!wanted`; never asks when `!wanted` or `appId` is null.
- Consumes: Task 1 `usesStat`.

- [ ] **Step 1: Failing tests**: the summary `{ tier:'platinum', total:237, confidence:'strong', trendingTier:'platinum', bestReportedTier:'platinum' }` gives `{ status:'found', tier:'platinum', details:{ total:237, confidence:'strong', trending:'platinum', best:'platinum' } }`; a cached entry without `details` is returned as found (no details) and refreshed in the background (fetcher called once more).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**. Shortcut games: callers pass `wanted && !isShortcut`.
- [ ] **Step 4: Run** all tests and tsc — Expected: pass.
- [ ] **Step 5: Commit** "Keep ProtonDB's report details; share the lookup between Home and the page"

### Task 5: Stats by slot (Home chips, Clean row, Full info card)

**Files:**
- Create: `src/logic/slotStats.ts`, `tests/logic/slotStats.test.ts`
- Modify: `src/home/chips.ts` (`gameChips` takes `slots`), `tests/home/chips.test.ts`
- Modify: `src/logic/cleanInfo.ts` (`CleanStat.key` adds `'protondb'`, `tone?: string`; `cleanStats` and `homeCleanStats` take `slots`)
- Modify: `src/components/CleanInfo.tsx` (draw `ProtonMark` before a value with `tone`), `src/components/InfoCard.tsx` (stats from `pageInfoStats`)
- Modify: `src/home/SpotlightHome.tsx` (pass slots to the page twins), `src/components/GameHero.tsx` (pass slots, proton)

**Interfaces:**
- Consumes: Task 1, Task 4 `useProton`.
- Produces:
  - `function orderBySlots<T extends { key: string }>(items: T[], slots: GameInfoSlots): T[]` — keeps items whose key is in `slotOrder(slots)`, in that order (Home's `added` chip counts as `played`).
  - `function pageInfoStats<T extends { key: string }>(items: T[], slots: GameInfoSlots): T[]` — only `slots.stats`, in order (Full look's info card).
  - `gameChips(i: GameChipInput & { slots: GameInfoSlots }, now, locale): Chip[]` — the chip set as today plus ProtonDB, then `orderBySlots`.

- [ ] **Step 1: Failing tests**:
  - `gameChips` with `{ stats: ['protondb','achievements',null], featured: 'played' }` and `protonTier: 'gold'` gives keys `['protondb','achievements','played']`.
  - A new game (`addedAt`) with `played` in slot 0 keeps the `added` chip in slot 0's place.
  - Default slots and an installed game give `['played','achievements','hltb']` (size closes up).
  - `cleanStats(..., slots)` with featured `null` and stats `['hltb','played','protondb']`, proton found gold → keys `['hltb','played','protondb']`, the ProtonDB stat `{ value: 'Gold', tone: 'gold' }`.
  - `pageInfoStats` on `[played,size,achievements,hltb]` with default slots → `[played,size,achievements]`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**. `InfoCard` builds its candidate stats as today plus ProtonDB (`{ key:'protondb', label:'ProtonDB', value: Tier name, tone }`) then `pageInfoStats`; `InfoCardPanel` draws `ProtonMark` for a stat with `tone` (same mark and `PROTON_COLOURS` as Home; add `.gg-value .gg-mark` colour rules in `themeCss` per tier).
- [ ] **Step 4: Run** all tests and tsc — Expected: pass.
- [ ] **Step 5: Commit** "Order Home's chips and the page's stats by the user's slots"

### Task 6: Featured card views

**Files:**
- Create: `src/logic/featuredViews.ts`, `tests/logic/featuredViews.test.ts`
- Create: `src/components/FeaturedCard.tsx`

**Interfaces:**
- Produces:
  - `interface FeaturedView { title: string; columns: Array<{ key: string; label: string; value: string; accent?: boolean; tone?: string }>; icon?: { src: string; label: string; value: string }; bar: number | null; caption: string | null; empty?: string; loading?: boolean }`
  - `function protonView(r: ProtonResult | undefined): FeaturedView`
  - `function achievementsView(a: AchievementFacts | undefined, now: number, locale: string): FeaturedView`, `interface AchievementFacts { achieved: number; total: number; unlocked: Array<{ id: string; name: string; image: string; unlockedAt: number; globalPct: number }> }`
  - `function readAchievementFacts(details: unknown): AchievementFacts | undefined` — from `achievements.nAchieved`, `nTotal`, `vecHighlight` + `vecAchievedHidden`, achieved only, de-duplicated by `strID` (first wins), sorted newest first.
  - `function playTimeView(p: { minutes: number; twoWeeks: number; lastPlayed: number }, now: number, locale: string): FeaturedView`
  - `function FeaturedCard({ featured, ... }): JSX.Element | null` — `'hltb'` renders the existing `HltbCard`; others render the view in a `CardShell` with classes `gg-card gg-featured gg-featured-<id>`; `null` renders nothing.

- [ ] **Step 1: Failing tests** (values from the Deck, Mini Motorways):
  - `protonView` of found platinum with details 237/strong/platinum/platinum → title `'ProtonDB'`, columns `Rating: Platinum (tone platinum)`, `Reports: 237`, `Confidence: Strong`; caption `'Trending Platinum · best reported Platinum'`. Not found or shortcut (`{status:'none'}`) → `empty: 'No ProtonDB rating yet'`. `undefined` → `loading: true`.
  - `readAchievementFacts` on a fixture with Wood Riddance twice (in both lists) and Beijing Tourist (74.8) → 2 unlocked, newest first.
  - `achievementsView` → icon `{ label: 'Latest · 7 days ago', value: 'Wood Riddance' }`, `bar: 4` (6/170 rounded), caption `'6 of 170 unlocked · rarest: Beijing Tourist (74.8% have it)'`. Total 0 → `empty: 'No achievements'`. Achieved 0 of 170 → no icon, caption `'170 to unlock'`. `undefined` → `loading: true`.
  - `playTimeView({ minutes: 68, twoWeeks: 68, lastPlayed: now-6d })` → columns `Total 1.1 h (accent)`, `Past 2 weeks 1.1 h`, `Last played 6 days ago`; caption `'All of it in the past two weeks'`; `twoWeeks: 0` → `'None in the past two weeks'`; otherwise caption null.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**. "x days ago" uses the formatter Home's eyebrow uses (`formatLastPlayed` in `src/home/recents.ts`). Text that would not fit gets the page's existing ellipsis class.
- [ ] **Step 4: Run** all tests and tsc — Expected: pass.
- [ ] **Step 5: Commit** "Featured cards for ProtonDB, achievements and play time"

### Task 7: The page reads the slots

**Files:**
- Modify: `src/components/GameHero.tsx` (render `FeaturedCard` in place of `HltbCard`; `CardsRow` gets `single` when featured is null; ProtonDB via `useProton(game.appId, usesStat(slots,'protondb') && !game.isShortcut)`, and a shortcut game passes `{ status: 'none' }` to the card so it says "No ProtonDB rating yet" instead of loading forever; HowLongToBeat looked up only when `usesStat(slots,'hltb')`)
- Modify: `src/styles/themeCss.ts` (layout rules on `.gg-card.gg-hltb` become `.gg-card.gg-featured`; `HltbCard` adds `gg-featured`; `.gg-cards.gg-cards-single { grid-template-columns: minmax(0, 1fr) }` and its card `max-width: none`; featured card fixed to today's HLTB card height)
- Test: `tests/styles/themeCss.test.ts`, `tests/components/` (follow existing GameHero/HltbCard tests)

**Interfaces:**
- Consumes: Tasks 4–6.

- [ ] **Step 1: Failing tests**: a pure `featuredProton(isShortcut: boolean, looked: ProtonResult | undefined): ProtonResult | undefined` (in `src/logic/featuredViews.ts`) returns `{ status: 'none' }` for a shortcut and `looked` otherwise; themeCss has `.gg-cards.gg-cards-single` with one column; the old `.gg-card.gg-hltb { … justify-self: end }` rule is now on `.gg-featured`; `HltbCard`'s root has both `gg-hltb` and `gg-featured`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** all tests, tsc, `pnpm build` — Expected: pass, build created.
- [ ] **Step 5: Commit** "The game page shows the chosen stats and featured card"

### Task 8: Open transition follows the slots

**Files:**
- Modify: `src/home/openTargets.ts` (`StatKey` adds `'protondb'`; `PageTargets.featured: StatKey | null`; Spotlight: info row = stats other than `featured`; featured stat placed as the first column of the featured card; `featured === null` → one card spanning `W - 2*side`)
- Modify: `src/home/openMotion.ts` (`shellOf(key)` = `key === page.featured ? 1 : 0`; the accent label swap only when `page.featured` is `'hltb'` or `'played'` and the chip is that key)
- Modify: `src/home/openHome.ts` (`pageStatsFromChips` adds ProtonDB; `extrasParts` adds `'hltb'` only when featured is `'hltb'`)
- Modify: `src/home/homeCss.ts` (twin-out list adds `'protondb'`)
- Modify: `src/home/SpotlightHome.tsx`, `src/home/OpenExtras.tsx` (HowLongToBeat extras only when featured is `'hltb'`)
- Test: `tests/home/openTargets.test.ts`, `tests/home/openMotion.test.ts`, `tests/home/openHome.test.ts`, `tests/home/homeCss.test.ts`

**Interfaces:**
- Consumes: Task 1 `GameInfoSlots`; the targets function gains a `featured: StatKey | null` input next to its stats (follow its existing options object).

- [ ] **Step 1: Failing tests**:
  - Spotlight targets with stats `[played, achievements, protondb]` and `featured: 'protondb'`: `protondb`'s value box lies inside `shells[1]`; `played` and `achievements` inside `shells[0]`.
  - `featured: null`: `shells.length === 1` and `shells[0].w` equals `W - 2*side` (to 1 px).
  - `openMotion` with a ProtonDB featured chip: `--gho-chip-i-accent` is not set for it; its shell source is shell 1.
  - `openMotion` with featured null: no `--gho-shell-1-*` variables.
  - `homeCss` twin-out rules exist for `.gh-chip[data-chip="protondb"]`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** A non-HLTB featured card's other parts are not drawn by Home: the page's own parts fade in on arrival (intent `homeHltb` stays unset), as a card no chip merges into does today.
- [ ] **Step 4: Run** all tests, tsc, build — Expected: pass.
- [ ] **Step 5: Commit** "The open transition follows the user's slots"

### Task 9: Device check

- [ ] **Step 1:** Back up and install on the Deck (`micpaal@192.168.1.21`, `-o HostKeyAlias=deck-192.168.1.21 -i ~/.ssh/ally_ed25519`) and the Ally (`ally`), reload with `(async () => { await window.DeckyPluginLoader.importPlugin("Game Glance", "4.0.0-rc.3"); })()` in SharedJSContext.
- [ ] **Step 2:** With the user, on the Deck: each featured stat (HLTB, ProtonDB, Achievements, Play time, None) in the Full look; the Clean look with four; Home's chip order; the open transition into each. Film transitions with screencast only (no per-frame DOM reads); never press while the user is using the device.
- [ ] **Step 3:** Fix what the device shows (each fix with its test), then commit.
