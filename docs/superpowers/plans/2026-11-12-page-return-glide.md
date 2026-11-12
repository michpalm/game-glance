# Page-to-Home Return Glide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** B on a game page (at its top, opened from Home by the morph) returns to Home with the shared parts gliding back, the page's cards fading out, the chips fading in and the game row rising.

**Architecture:** FLIP on Home's return mount: Home measures itself, reuses the open's `pageTargets` + `openMotion` to get the page's places, starts with those transforms (`data-gh-closing="from"`) and releases them a frame later (`"to"`). A module "return note" written at a morph open decides glide or today's fade. The leaving page keeps only its cards visible, fading, inside the 200 ms delay before Steam's exit animation.

**Tech Stack:** TypeScript, React 19 (Decky plugin), vitest + linkedom, CSS built as strings (`homeCss.ts`, `themeCss.ts`).

**Spec:** `docs/superpowers/specs/2026-11-12-page-return-glide-design.md`

## Global Constraints

- Repo `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`, branch `fix/menu-contrast-play-handoff`. **No commit steps: Michael commits on request. Never push.**
- Any failure, missing class or unmeasurable Home means today's fade, unchanged. Nothing here may throw into Home's render or delay its focus restore.
- CEF probes on the Ally are read-only. Ask Michael before any recording, screenshot or button press on the device.
- Only `transform` and `opacity` animate. The existing `openingRules()` output must stay byte-identical (its snapshot tests prove it).
- Timings (spec): glide 300, cards 150, row 220 after 100, chips 200 after 120, chip rise 12 px, row rise `OPEN_TIMINGS.leaveDrop` (70), cap 500 (glide + 200), easing `MORPH_EASE`.
- Commands: `npx vitest run <file>`, `npm run typecheck`, `npm run build`.
- Dim text and house CSS rules are untouched; no new settings.

## Review Focus

1. **Docked/undocked between open and return** (viewport changed): must fade, not glide to stale places. Test in Task 2.
2. **The open starts while a glide runs** (A pressed within 300 ms of returning): the glide must end and remove its variables before `applyOpening` sets its own. Test in Task 5.
3. **Home returns on another game or from the feed zone**: fade. Tests in Task 2.
4. **The note outlives its page** (page → store → back → B, or a page reached from the Library later): every other navigation clears it; a note older than `RESTORE_MAX_AGE_MS` is stale. Tests in Task 2, wiring in Task 7.
5. **Mouse mode** (no focus look on the page): `openMotion`'s `focused` must be read as the open reads it, so Play's page size is the unfocused one. Test in Task 4.

---

### Task 1: Ally checks (read-only)

**Files:** none (scratchpad recorders only). Ledger: record each answer as a `Ruling:`.

Ask Michael for the go-ahead first; he opens a game page from Home and presses B while the recorder runs. Record with one `MutationObserver` + `requestAnimationFrame` timestamps armed before B, no per-frame DOM reads (memory: probe observer effect).

- [ ] **Step 1: The page under Home.** Record when Home's `.gh-root` mounts, when the page's `TopLevelTransition` element gets its Exit/ExitActive classes and when it is removed; read once, at Home's mount, the two elements' stacking (which is later in DOM order / z-index) and the page's `.gg-cards` rect.
  Expected: the page element is present ≥ 200 ms after Home mounts, and Home paints above it. If not: Ruling "page side dropped" and skip Task 6 (cards are gone at frame 0).
- [ ] **Step 2: Home's first frame.** At the first frame where `.gh-actions .gh-btn[data-action="play"]` exists, read once: the count of `.gh-chip`, and whether `.gh-source`, `.gh-family`, `.gh-players` exist; read again 500 ms later.
  Expected: equal. If chips or pills arrive later: Ruling "wait one frame budget (50 ms) for them, else fade" and add that wait to Task 7 Step 3.
- [ ] **Step 3 (after Task 8's install): first-frame pop.** Michael looks; if Home's Play label visibly softens at frame 0, add the spec's 80 ms cross-fade (a `closingRules` opacity keyframe on the shared parts and the page's Play row kept visible for 80 ms) as a ledgered ruling.

### Task 2: Timings and the return note

**Files:**
- Modify: `src/home/motion.ts` (after `RETURN_TIMINGS`)
- Create: `src/home/returnNote.ts`
- Test: `tests/home/returnNote.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // motion.ts
  export const RETURN_GLIDE = { glide: 300, cards: 150, rowDelay: 100, row: 220, chipsDelay: 120, chips: 200, chipRise: 12, cap: 500 } as const;
  // returnNote.ts
  export type Size = { width: number; height: number };
  export type ReturnWay = 'glide' | 'fade';
  export function noteMorphOpen(appId: number, look: PageLook, viewport: Size, now?: number): void;
  export function clearReturn(): void;
  /** The pending note's look when Home is returning to `appId` in `zone` (no take): for the first render's page CSS. */
  export function peekReturn(appId: number | null, zone: Zone, now?: number): PageLook | null;
  /** Takes the note (once) and decides. */
  export function takeReturn(q: { appId: number | null; zone: Zone; viewport: Size; atTop: boolean }, now?: number): { way: ReturnWay; look: PageLook | null };
  ```
  `PageLook` from `./openTargets`, `Zone` from `./focusZones`, staleness `RESTORE_MAX_AGE_MS` from `./homeMemory`.

- [ ] **Step 1: Write the failing tests** (`tests/home/returnNote.test.ts`; `beforeEach(clearReturn)`):

```ts
const V = { width: 1920, height: 1080 };
const q = (over = {}) => ({ appId: 292030, zone: 'actions' as const, viewport: V, atTop: true, ...over });
it('glides back to the game a morph opened', () => { noteMorphOpen(292030, 'spotlight', V, 1000); expect(takeReturn(q(), 2000)).toEqual({ way: 'glide', look: 'spotlight' }); });
it('is taken once', () => { noteMorphOpen(292030, 'clean', V, 1000); takeReturn(q(), 2000); expect(takeReturn(q(), 2001).way).toBe('fade'); });
it.each([
  ['no note', () => undefined, {}],
  ['another game', () => noteMorphOpen(1, 'spotlight', V, 1000), {}],
  ['the feed zone', () => noteMorphOpen(292030, 'spotlight', V, 1000), { zone: 'feed' }],
  ['the tabs zone', () => noteMorphOpen(292030, 'spotlight', V, 1000), { zone: 'tabs' }],
  ['a scrolled page', () => noteMorphOpen(292030, 'spotlight', V, 1000), { atTop: false }],
  ['another viewport', () => noteMorphOpen(292030, 'spotlight', V, 1000), { viewport: { width: 1280, height: 800 } }],
  ['the Library card', () => noteMorphOpen(292030, 'spotlight', V, 1000), { appId: null }],
])('fades with %s', (_n, arrange, over) => { arrange(); expect(takeReturn(q(over), 2000).way).toBe('fade'); });
it('fades when stale or from the future', () => {
  noteMorphOpen(292030, 'spotlight', V, 1000); expect(takeReturn(q(), 1000 + RESTORE_MAX_AGE_MS + 1).way).toBe('fade');
  noteMorphOpen(292030, 'spotlight', V, 1000); expect(takeReturn(q(), 999).way).toBe('fade');
});
it('a fading take still clears the note', () => { noteMorphOpen(292030, 'spotlight', V, 1000); takeReturn(q({ atTop: false }), 2000); expect(takeReturn(q(), 2001).way).toBe('fade'); });
it('clearReturn drops it', () => { noteMorphOpen(292030, 'spotlight', V, 1000); clearReturn(); expect(peekReturn(292030, 'actions', 2000)).toBeNull(); });
it('peeks without taking, by game and zone only', () => {
  noteMorphOpen(292030, 'clean', V, 1000);
  expect(peekReturn(292030, 'recents', 2000)).toBe('clean'); expect(peekReturn(1, 'recents', 2000)).toBeNull(); expect(peekReturn(292030, 'feed', 2000)).toBeNull();
  expect(takeReturn(q(), 2000).way).toBe('glide');
});
it('ignores an invalid appId or viewport', () => { noteMorphOpen(0, 'spotlight', V, 1000); noteMorphOpen(292030, 'spotlight', { width: 0, height: 0 }, 1000); expect(peekReturn(292030, 'actions', 2000)).toBeNull(); });
```

- [ ] **Step 2: Run** `npx vitest run tests/home/returnNote.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `RETURN_GLIDE` (with a doc comment naming the spec) and `returnNote.ts` (module state, one note; zones `recents` and `actions` glide).
- [ ] **Step 4: Run** the same command — Expected: PASS (all).

### Task 3: "The page is at its top"

**Files:**
- Modify: `src/logic/feedbackScroll.ts`
- Test: the existing `tests/logic/feedbackScroll*.test.ts` (add to it; create `tests/logic/pageAtTop.test.ts` if none fits)

**Interfaces:**
- Consumes: the file's private `scrollPort(element)`.
- Produces: `export function pageAtTop(doc: Document, playSelector: string | null): boolean` — true only when the element matching `playSelector` exists, its scroll port is found and `scrollTop <= 1`. Unknown is false (fade). Never throws.

- [ ] **Step 1: Failing tests:** true at `scrollTop` 0 and 1; false at 2; false with a null selector, no match, no scroll port; false when a getter throws.
- [ ] **Step 2: Run** — Expected: FAIL (`pageAtTop` is not exported).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.

### Task 4: The closing variables and CSS

**Files:**
- Create: `src/home/closeMotion.ts`
- Modify: `src/home/homeCss.ts` (`openingRules()` at ~690-870; `gh-return-in` rule at ~522; `homeCss()` assembles the rules)
- Modify: `src/home/openHome.ts` and `src/home/homeNav.ts` (extract the morph measuring)
- Test: `tests/home/closeMotion.test.ts`, `tests/home/homeCss.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // openHome.ts — extracted from homeNav.startHome's morph branch, behaviour unchanged
  export interface MorphMeasure { home: HomeRects; page: PageTargets; scale: number; focused: boolean; stats: ReturnType<typeof pageStatsFromChips> }
  export function measureMorph(root: HTMLElement, look: PageLook, extras: string, slots: GameInfoSlots): MorphMeasure | null;
  // closeMotion.ts
  /** openMotion's variables the glide uses: the title, eyebrow, pills, Play (not its ring or settle layer) and the round buttons. */
  export function closingVars(vars: MotionVar[]): MotionVar[];
  export const CLOSING_ATTR = 'data-gh-closing';
  /** Sets the glide's variables and `data-gh-closing="from"`; returns the undo (variables, attribute, pill placement), or null when Home cannot be measured. */
  export function applyClosing(root: HTMLElement, look: PageLook, slots: GameInfoSlots): (() => void) | null;
  // homeCss.ts
  export function closingRules(): string[];
  ```
- `closingVars` keeps names matching `^--gho-(title|eyebrow|store|play-(bg|fg|icon|label|arrow|dy|inset-x|inset-y|home-w|home-h|size|size-arrow|size-from|size-font)|circle-\d|circle-icon-\d)$`; everything else (rings, shells, settle, extras `--gho-x-*`, chips) is dropped.
- `applyClosing` = `measureMorph(root, look, '', slots)` → `openMotion(home, page, look, scale, focused)` → `closingVars` set on `root.style`, `preparePillOpen(root, page, look)` for the pills (as `startHome` does), then the attribute, then one `getBoundingClientRect()` (the start frame must be styled before `to`).

- [ ] **Step 1: Failing tests.**
  - `closeMotion.test.ts`: `closingVars` on a list holding one name of each kind keeps exactly the subset above (assert `--gho-pring-x`, `--gho-shell-0-x`, `--gho-play-settle-from`, `--gho-x-d`, `--gho-chip-0-value` are dropped; `--gho-title`, `--gho-store`, `--gho-play-bg`, `--gho-circle-2`, `--gho-circle-icon-0` kept). `applyClosing` on a root without `.gh-canvas` returns null and sets nothing. With the fixture Home used by `tests/home/normalOpen.test.ts`: returns an undo, sets `data-gh-closing="from"` and `--gho-title`; the undo removes both. Mouse mode (`MOUSE_ATTR` on the document element): `--gho-play-page-w` is not set and `--gho-play-bg` equals the open's unfocused value (Review Focus 5).
  - `homeCss.test.ts`: `openingRules().join('\n')` unchanged (existing snapshot). `closingRules()`: every `from` rule for a moving part has `transition: none`; the `to` rules use `300ms` and `MORPH_EASE` for transforms; `.gh-recents` goes from `translateY(70px)` and opacity 0 to none over `220ms` after `100ms`; `.gh-chip` from `translateY(12px)` over `200ms` after `120ms`; the info circle (`[data-action="info"]`) fades with the chips; no rule animates anything but `transform`/`opacity`; the `gh-return-in` rule's selector now contains `:not([data-gh-closing])`.
- [ ] **Step 2: Run** `npx vitest run tests/home/closeMotion.test.ts tests/home/homeCss.test.ts` — Expected: FAIL (new names missing).
- [ ] **Step 3: Extract `measureMorph`** from `startHome` (it then calls it); run `npx vitest run tests/home` — Expected: PASS for every existing test (pure refactor).
- [ ] **Step 4: Implement `closingRules()`.** In `openingRules()`, lift the `MT`-keyed move rules of the shared parts (title slot, eyebrow, `.gh-source`, Play and its `::before`, icon, label, arrow, size; the four circles, their icons and the cloud `::after`) into one `const MOVES: Array<[selector: string, variable: string]>` used by both blocks. Closing block: `.gh-root[data-gh-closing="from"] SEL { transform: var(VAR); transition: none }`, `…="to"] SEL { transform: none; transition: transform 300ms MORPH_EASE }`; the Play `::before` layer's box declarations apply under `[data-gh-closing]` as they do under morph. Add it to `homeCss()` after the opening rules.
- [ ] **Step 5: Implement `closeMotion.ts`.**
- [ ] **Step 6: Run** the Step 2 command, then `npm run typecheck` — Expected: PASS, clean.

### Task 5: The glide's timeline

**Files:**
- Create: `src/home/returnGlide.ts`
- Test: `tests/home/returnGlide.test.ts`

**Interfaces:**
- Consumes: `RETURN_GLIDE.cap`.
- Produces:
  ```ts
  export interface ReturnGlideDeps {
      /** Home's closing start state (closeMotion.applyClosing); null: no glide. */
      apply(): (() => void) | null;
      /** Sets data-gh-closing to 'to'. */
      release(): void;
      frame(fn: () => void): void;
      setTimer(fn: () => void, ms: number): unknown;
      clearTimer(id: unknown): void;
      warn?(message: string, error: unknown): void;
  }
  /** Starts the glide; false (nothing left set) when it cannot. One runs at a time. */
  export function startReturnGlide(deps: ReturnGlideDeps): boolean;
  /** Ends a running glide at once: everything at rest, variables and attribute removed. Safe when none runs. */
  export function endReturnGlide(): void;
  export function returnGlideRunning(): boolean;
  ```

- [ ] **Step 1: Failing tests** (fake timers; `frame` collects callbacks):
  - start: `apply` called once, returns true, running; `release` only after the frame callback runs; the undo runs at 500 ms and not at 499; not running after.
  - `apply` returns null or throws: false, no timer, not running.
  - `endReturnGlide()` before the frame: undo once, `release` never called when the frame fires later, timer cleared.
  - `endReturnGlide()` twice, or with none running: no throw, undo once.
  - a second `startReturnGlide` while one runs ends the first (its undo runs) before `apply` (Review Focus 2).
  - `release` or the undo throwing is reported to `warn` and still leaves it not running.
- [ ] **Step 2: Run** `npx vitest run tests/home/returnGlide.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** (module-level current glide; a generation counter guards the late frame).
- [ ] **Step 4: Run** — Expected: PASS.

### Task 6: The leaving page keeps its cards (skip if Task 1 Step 1 ruled it out)

**Files:**
- Modify: `src/styles/themeCss.ts` (beside `buildSteamEnterOffCss`), `src/styles/theme.ts`
- Test: `tests/styles/themeCss.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // themeCss.ts
  /** buildSteamEnterOffCss, with the leaving page's cards kept visible and faded out over `ms`; '' when the classes are unknown. */
  export function buildReturnCardsCss(classes: ThemeClasses, ms: number): string;
  // theme.ts
  export function returnCardsCss(): string; // buildReturnCardsCss(themeClasses(), RETURN_GLIDE.cards)
  ```
- Rule: after the enter-off rules, `TOP.Exit :is(.gg-cards, .gg-clean-info), TOP.ExitActive :is(...) { visibility: visible !important; animation: gg-return-cards <ms>ms ease forwards !important; }` and `@keyframes gg-return-cards { to { opacity: 0; } }`. Steam's own exit animation on the top element is not overridden.

- [ ] **Step 1: Failing tests:** with the fixture classes the output contains the enter-off rules unchanged, the cards rule with `150ms` and `visibility: visible`, and the keyframes; without `Exit`/`ExitActive` classes it equals `buildSteamEnterOffCss`; without the transition classes it is `''`.
- [ ] **Step 2: Run** `npx vitest run tests/styles/themeCss.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.

### Task 7: Wiring

**Files:**
- Modify: `src/home/homeNav.ts` (`openPage`, `openStorePage`, `openNews`, `openLibrary`, `openGame`)
- Modify: `src/home/SpotlightHome.tsx` (~158-175 the `restore`/`back`/`enterOff` block; the `contentUp` restore effects ~545-566)
- Test: `tests/home/homeNav.test.ts`

**Interfaces:**
- Consumes: `noteMorphOpen`, `clearReturn`, `peekReturn`, `takeReturn`; `pageAtTop`; `applyClosing`, `CLOSING_ATTR`; `startReturnGlide`, `endReturnGlide`; `returnCardsCss`; `playRow()` (`styles/theme`); `viewportSize` (`openHome`).

- [ ] **Step 1: Failing tests** (`homeNav.test.ts`, with its existing mocks): `openGame` with a morph variant leaves `peekReturn(appId, 'actions')` non-null with the look; with a `heroFade`/`fade` variant, or the Steam page look, null; `openStorePage`, `openNews`, `openLibrary` and `openPage` each clear a pending note; `openGame` calls `endReturnGlide` before the controller's `open`.
- [ ] **Step 2: Run** `npx vitest run tests/home/homeNav.test.ts` — Expected: FAIL.
- [ ] **Step 3: `homeNav.ts`.** `clearReturn()` first in the four non-transition opens. In `openGame`: `endReturnGlide()` right after the `isRunning()` guard; `clearReturn()`; after `variant` and `intent` are known, `if (variant === 'morph' && pageRestyled && root) noteMorphOpen(appId, look, viewportSize(win))`.
- [ ] **Step 4: `SpotlightHome.tsx`.**
  - First render: `const returnLook = restore ? peekReturn(restoredAppId, restore.zone) : null` (`restoredAppId`: `restore.recent.kind === 'game' ? restore.recent.appId : null`); `enterOff` is `returnCardsCss()` when `returnLook` is set (and `back`), else `steamEnterOffCss()` as today.
  - A `useLayoutEffect` on `[contentUp]`, once, when `restore` is set: `takeReturn({ appId: restoredAppId, zone: restore.zone, viewport: viewportSize(win), atTop: pageAtTop(doc, playRow()) })`; on `'glide'`: `startReturnGlide({ apply: () => applyClosing(root, look, slots), release: () => root.setAttribute(CLOSING_ATTR, 'to'), frame: (fn) => win.requestAnimationFrame(fn), setTimer, clearTimer, warn })`. Everything inside one try/catch that warns; it runs after the existing focus restore effects are declared and never returns early from them.
  - End early: an effect on `[recentIndex, sheetUp]` that skips its first run and calls `endReturnGlide()`; the component's unmount calls it too.
- [ ] **Step 5: Run** `npx vitest run tests/home && npm run typecheck` — Expected: PASS, clean.

**Ruling to ledger:** the page CSS is chosen at first render from the note's game and zone only (the scroll position and viewport are known a frame later); a scrolled or resized return therefore fades the cards over 150 ms instead of hiding them at once — cost if wrong: a 150 ms card fade under Home's fade in those cases.

### Task 8: Build, install, device checks

- [ ] **Step 1:** `npx vitest run` — Expected: all pass (3156 + the new ones). `npm run typecheck` clean. `npm run build` succeeds (check the exit code; never chain the install with `;`).
- [ ] **Step 2:** Install as the session does (back up `~/homebrew/plugins/game-glance/dist/index.js`, `scp`, `cp`, reload Game Glance in SharedJSContext); report the md5.
- [ ] **Step 3: Michael checks on the Ally** (handheld, then docked): B from the top of a game page glides; a scrolled page fades; a feed card's page fades; L1 to another game then back and B fades or glides correctly; A and L1/R1 during the glide work and end it; the family and player pills land where they rest; the Clean look; Task 1 Step 3's first-frame check.
- [ ] **Step 4:** Final whole-branch review (executing-plans), fixes, then report rulings and deferred minors.
