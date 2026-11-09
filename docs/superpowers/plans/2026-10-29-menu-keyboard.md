# Menu Keyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A compact, movable keyboard in the in-game menu's Social chat, built from Steam's own layout data, replacing Steam's docked keyboard for that one field.

**Architecture:** Three pure modules (layouts, typing, placement) under `src/menu/keyboard/`, a small session store that the menu shell uses for B and outside taps, one `MenuKeyboard` component mounted by `SocialPanel` only while a chat is entered, and a fifth frost area (`keyboard`) that may be absent.

**Tech Stack:** TypeScript, React (Decky `Focusable`, `DialogButton`), vitest; Python 3 backend and ReShade FX shader for the frost area; pytest.

**Spec:** `docs/superpowers/specs/2026-10-29-menu-keyboard-design.md` (52879fb). Visual reference: https://claude.ai/artifact/5kk1iFnARWLNAhULowfY13

## Global Constraints

- Only the Social chat's message field uses this keyboard; every other field keeps Steam's keyboard.
- Input: d-pad or left stick with A, and touch. No button shortcuts.
- No text cursor: keys edit the end of the draft.
- Steam code runs only through the two layout functions named in Task 2 (the current-layout getter and an entry's `rgLayout`), once per opening, inside a guard; everything else from Steam is read, never called.
- Find Steam's modules by shape or source text, never by minified export names.
- Look: `TOKENS.glass` frost panel, 1 px edge `TOKENS.edge`, 16 px corners; keys 34 × 40 px, 5 px gaps, 10 px corners; panel 409 × 210 px; modifier keys one glass step brighter; `✓` in the game accent; `focusRing('menu')`; `labelText()` shadow.
- Tests first for every task (superpowers:test-driven-development). Commit identity copied from memory `git-commit-identity`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No push, PR, release or install without Michael.
- CEF probes are read-only: Task 1 reads source text only.

## Review Focus

1. A layout whose letter rows hold more than ten letters (Spanish row one has `ç`): keys narrow to fit the 385 px row, never overflow the panel. Test in Task 2.
2. A held accent when the chat closes or the layout switches: it is dropped, never combined into the next opening's first key. Test in Task 3.
3. A drop or saved position that no longer fits (the window resized between openings, Home vs game): clamped back inside and clear of the field. Test in Task 4.
4. Two windows' click listeners (menu dismissal vs keyboard dismissal): an outside tap with the keyboard open never also closes the menu. Test in Task 5.
5. The keyboard frost area while the keyboard is closed: frost for the rest of the menu keeps working, and opening the keyboard never rebuilds the shader. Tests in Task 7.

---

### Task 1: Find how all selected layouts are reachable (Ally, read only)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-29-menu-keyboard-design.md` (the "Open" line under Reading Steam's layouts)

**Interfaces:**
- Produces: a sentence in the spec naming how the full layout list is found (a function export whose source returns the list, e.g. containing `HasIBusBinding` and `.filter(`), or "current layout only".

- [ ] **Step 1:** With the CEF tunnel up, read (never call) the source text of each function export of the keyboard module (the module whose exports include an object with `Character: 0`, `Enter: 1` and `Spacebar`). Command pattern: `node scripts/cef-eval.mjs '<read String(fn) of each export>' SharedJSContext`.
- [ ] **Step 2:** Record the result in the spec's Open line, replacing "Open:" with what was found.
- [ ] **Step 3:** Commit `docs: menu keyboard, how Steam's selected layouts are reached`.

### Task 2: Layouts

**Files:**
- Create: `src/menu/keyboard/layouts.ts`
- Test: `tests/menu/keyboard/layouts.test.ts` (+ fixture `tests/menu/keyboard/spanish.fixture.ts`: the Spanish `rgLayout` rows as read on 2026-10-29, Steam's shape, special keys as `{ type: <n> }` objects)

**Interfaces:**
- Produces:
  - `type KeyDef = { char: string; shifted?: string; dead?: { next: string; combined: string }; hint?: string; kind: 'char' | 'shift' | 'backspace' | 'page' | 'space' | 'send' }`
  - `type KeyboardLayout = { id: number; name: string; short: string; letters: KeyDef[][]; symbols: KeyDef[][]; ime: boolean }` (`letters` and `symbols` hold four rows each, bottom row included)
  - `interface SteamLayoutSource { current(): unknown; all(): unknown[] | null; selected(): { currentLayout: number; selectedLayouts: number[] } | null }`
  - `findSteamLayoutSource(modules: Iterable<Record<string, unknown>>): SteamLayoutSource | null`
  - `readLayouts(source: SteamLayoutSource | null): { layouts: KeyboardLayout[]; current: number }`: never throws; falls back to `BUILTIN_QWERTY`.
  - `compactLayout(entry: { name: string; layout: number; rgLayout(options: object): unknown }): KeyboardLayout | null`: `null` on any shape mismatch.
  - `BUILTIN_QWERTY: KeyboardLayout` (`short: 'EN'`, `´` and `¨` as dead keys).

Compaction rules (decisions the spec leaves to the plan):
- `rgLayout({})` rows: row 0 is the number row, rows 1–3 the letter rows, the last the bottom row. Letter rows keep every key whose normal character is a letter (`/\p{L}/u`), in order; row three is wrapped as `⇧ … ⌫`. Keys narrow to fit (Review Focus 1); nothing moves to another page.
- Digit hints: the first ten keys of letter row one get `1`–`9`, `0`.
- The main accent key is the first dead key in reading order (rows 0–3); none: a plain `'` key.
- Bottom row (letters): `?123`, `,`, main accent, space (label = the selected layouts' `short` names joined with ` · `), `.`, `✓`.
- Symbols page: `1 2 3 4 5 6 7 8 9 0` / `@ # € % & - + ( ) /` / `¿ ¡` (only those present in the layout) then `! ? " ' : ;` up to eight keys, wrapped `… ⌫` / `ABC`, `,`, the second dead key (none: `"`), space, `.`, `✓`.
- `short` names: from the entry name (`spanish` → `ES`, `qwerty` → `EN`, `swedish` → `SV`, otherwise the first two letters upper-cased).
- `ime: true` for names starting `schinese`, `tchinese`, `japanese`, `korean`.
- Validation: letter keys are strings, `[normal, shifted?, altGr?]` arrays (`null` allowed), or `{ key, label, dead: true, dead_next, dead_combined }` with equal-length `dead_next` / `dead_combined`.

- [ ] **Step 1: Write the failing tests**

```ts
it('compacts Steam\'s Spanish rows into the canvas layout', () => {
  const l = compactLayout({ name: 'spanish', layout: 19, rgLayout: () => SPANISH_ROWS })!;
  expect(l.letters[0].map(k => k.char)).toEqual([...'qwertyuiop', 'ç']);
  expect(l.letters[0].slice(0, 10).map(k => k.hint)).toEqual([...'1234567890']);
  expect(l.letters[1].map(k => k.char)).toEqual([...'asdfghjklñ']);
  expect(l.letters[2].map(k => k.kind)).toEqual(['shift', ...Array(7).fill('char'), 'backspace']);
  expect(l.letters[3].map(k => k.char)).toEqual(['?123', ',', '´', ' ', '.', '✓']);
  expect(l.letters[3][2].dead).toEqual({ next: ' aAeEiIoOuUyY', combined: '´áÁéÉíÍóÓúÚýÝ' });
  expect(l.symbols[2].map(k => k.char)).toEqual(['¿', '¡', '!', '?', '"', '\'', ':', ';', '⌫']);
});
it('falls back to the built-in QWERTY on a throw, malformed rows or no module', () => { /* each case: readLayouts(...).layouts[0] === BUILTIN_QWERTY */ });
it('marks input-method layouts so the field keeps Steam\'s keyboard', () => { /* schinese → ime: true */ });
it('finds the source by shape and source text, not export names', () => { /* fake module with renamed exports */ });
it('labels the space bar with the selected layouts', () => { /* selected [0,19] → 'EN · ES' order as selected */ });
```

- [ ] **Step 2:** `npx vitest run tests/menu/keyboard/layouts.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the signatures above in `src/menu/keyboard/layouts.ts`. `findSteamLayoutSource` locates the keyboard module by its key-kind enum (`Character: 0`, `Enter: 1`, `Spacebar`), the current getter by source text (`GetKeyboardLayoutSettings` and `currentLayout`), the list getter as Task 1 found it, and `selected()` from the store object holding `m_userLayoutSettings`. Calls happen only inside `readLayouts`, inside `try`.
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** Commit `Menu keyboard: read and compact Steam's layouts, QWERTY fallback`.

### Task 3: Typing

**Files:**
- Create: `src/menu/keyboard/typing.ts`
- Test: `tests/menu/keyboard/typing.test.ts`

**Interfaces:**
- Consumes: `KeyDef` (Task 2).
- Produces: `type TypingState = { text: string; shift: 'off' | 'once' | 'lock'; held: KeyDef | null }`, `press(state: TypingState, key: KeyDef): TypingState`, `clearHeld(state: TypingState): TypingState`, `typeText(state: TypingState, text: string): TypingState` (physical keyboard, no accent logic).

- [ ] **Step 1: Write the failing tests**

```ts
const s0 = { text: '¡Hola', shift: 'off', held: null } as TypingState;
it('appends and removes one grapheme', () => {
  expect(press({ ...s0, text: 'está' }, BACKSPACE).text).toBe('est');
});
it('shift once, then caps lock on a double press', () => { /* once → 'A' then 'a'; once+once → lock → 'AB' */ });
it('combines a held accent through dead_next/dead_combined', () => {
  expect(press(press(s0, ACUTE), key('a')).text).toBe('¡Holaá');
});
it('an accent with no combination types the accent then the key', () => { /* ´ then k → '´k' */ });
it('space after an accent types the accent alone', () => { /* ´ then space → '´' */ });
it('clearHeld drops a held accent (chat closed, layout switched)', () => { /* Review Focus 2 */ });
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement; graphemes via `Intl.Segmenter` (`granularity: 'grapheme'`). `send`, `page` and layout-switch keys are not handled here (the component handles them).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `Menu keyboard: typing reducer with accents and caps`.

### Task 4: Placement and remembered position

**Files:**
- Create: `src/menu/keyboard/placement.ts`
- Test: `tests/menu/keyboard/placement.test.ts`

**Interfaces:**
- Produces: `type Rect = { x: number; y: number; width: number; height: number }`, `type Spot = 'left' | 'right' | 'top'`, `SPOTS: readonly Spot[]`, `spotPosition(spot: Spot, view: Rect, menu: Rect, field: Rect, size: { width: number; height: number }): { x: number; y: number }`, `settle(pos: { x: number; y: number }, view: Rect, field: Rect, size): { x: number; y: number }` (clamp inside `view`, then move clear of `field` by the smallest shift), `loadPosition(kv: KvBackend): Promise<{ spot: Spot } | { x: number; y: number } | null>`, `savePosition(kv: KvBackend, value): Promise<void>` under the key `menu:keyboard`.
- Spots: `left` = left of the menu panel's chat column, bottom-aligned with the field (board A); `right` = right edge of the panel (board B); `top` = centred under the menu bar. Each is passed through `settle`.

- [ ] **Step 1: Write the failing tests:** every spot inside an 829 × 467 view and clear of a field at (378, 350, 116, 60) (the Ally's message field in CSS px: 875, 810, 268 × 140 device px at a ratio of 2.316); a drop over the field moves clear; clamping at each edge; a saved position outside a smaller view is clamped (Review Focus 3); malformed stored values load as `null`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `Menu keyboard: spots, clamping and remembered position`.

### Task 5: Session, B and outside taps

**Files:**
- Create: `src/menu/keyboard/session.ts`
- Modify: `src/menu/components/MenuShell.tsx` (`onButton`, a lifetime effect), `src/menu/navigation.ts` (export `installKeyboardOutsideTap`)
- Test: `tests/menu/keyboard/session.test.ts`, `tests/menu/navigation.test.ts`

**Interfaces:**
- Produces: `createKeyboardSession(): { get(): { open: boolean }; subscribe(fn: () => void): () => void; open(): void; close(): void }`; `installKeyboardOutsideTap(view: Window, inside: () => HTMLElement[], close: () => void): () => void`: a capture `click` listener on the **window** (it runs before the menu's document-capture dismissal), which, when the target is outside every element of `inside()` (the panel and the message field), calls `preventDefault`, `stopImmediatePropagation` and `close`.
- `MenuShell`: creates one session per shell (`useMemo`), passes it to `SocialPanel`. In `onButton`, B (`button === 2`, cancel) with `session.get().open` closes the session and consumes the event before `handleMenuButton`. An effect closes the session whenever `state.section !== 'social'` or the stack top is not `'social-chat'`.

- [ ] **Step 1: Write the failing tests:** session open/close/subscribe; outside tap closes and stops propagation, inside taps pass; with both listeners installed, an outside-the-menu tap closes only the keyboard (Review Focus 4); B with the session open closes it and dispatches nothing; leaving the chat (tab step, `back`, another section) closes it.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run tests/menu`. Expected: PASS.
- [ ] **Step 5:** Commit `Menu keyboard: session, B and first outside tap close it`.

### Task 6: The keyboard in the Social chat

**Files:**
- Create: `src/menu/components/MenuKeyboard.tsx`
- Modify: `src/menu/components/SocialPanel.tsx` (message field, mount), `src/menu/styles.ts` or `src/menu/socialStyles.ts` (keyboard styles, following where Social styles live)
- Test: `tests/menu/menuKeyboard.test.ts`, `tests/menu/socialPanel.test.ts`, `tests/menu/styles.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces: `MenuKeyboard({ session, layouts, draft, setDraft, canSend, send, field }: { session; layouts: { layouts: KeyboardLayout[]; current: number }; draft: string; setDraft(text: string): void; canSend: boolean; send(): void; field: () => HTMLElement | null })`.
- `SocialPanel`: when the current layout is not `ime`, the field is a `MenuAction` (`id="social:compose"`) showing the draft, or the placeholder "Message", that opens the session; when `ime`, the existing `TextField` stays. `MenuKeyboard` mounts only while `entered`. `canSend` uses the Send button's exact condition.
- Behaviour pinned by the spec: keys are `MenuAction`s in a `Focusable` grid; a key types on `click` (release on the same key); holding a key with a hint for 400 ms types the hint; the space key's long label switches layout on press when there is more than one (`clearHeld` first); the drag strip (`data-gg-keyboard-strip`, 24 px, grab bar and `LuMove` icon) drags by pointer events with lift styling (`box-shadow` and a brighter edge while dragging), saves on release via `settle` + `savePosition`; A on the strip cycles `SPOTS`; a window `keydown` listener while open: printable keys via `typeText`, Backspace, Enter sends when `canSend`. Layouts are read once per opening.

- [ ] **Step 1: Write the failing tests:** the field opens the session instead of a text input; `ime` keeps the `TextField`; `✓` disabled exactly when Send is; keys render the compacted rows (row one has 11 keys for Spanish and fits 385 px); style rules (panel glass, key sizes, focus ring, strip height); physical `keydown` types and Enter sends.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run tests/menu`. Expected: PASS.
- [ ] **Step 5:** Commit `Menu keyboard: floating keyboard in the Social chat`.

### Task 7: The keyboard as a frost area

**Files:**
- Modify: `src/menu/frost/types.ts`, `src/menu/frost/geometry.ts`, `src/menu/frost/host.ts`, `src/menu/frost/home.ts`, `src/menu/frost/controller.ts`, `py_modules/gameglance/frost/contracts.py`, `py_modules/gameglance/frost/shader.py`, `py_modules/gameglance/frost/native.py`, `py_modules/gameglance/frost/assets/qam-frost.fx.in`
- Test: `tests/menu/frost/*.test.ts`, `tests/py/test_frost_shader.py`, `tests/py/test_frost_native.py`, `tests/py/test_frost_leases.py`

**Interfaces:**
- Produces: `REGION_IDS` gains `'keyboard'`, with `OPTIONAL_REGIONS = new Set(['keyboard'])`. A missing optional element measures as `{ x: 0, y: 0, width: 0, height: 0, radiusX: 0, radiusY: 0 }`; the backend accepts an all-zero rectangle only for `keyboard`; the shader's `Mask` already returns 0 for an empty rectangle. Home frost skips empty regions.
- Allocation: the keyboard tile is sized from the fixed panel, `KEYBOARD_TILE_CSS = { width: 409, height: 210 }` times `dpr`, in both `frostAllocation` and `frost_geometry`, so opening or moving the keyboard is an update, never a new shader (Review Focus 5).
- An element appearing or disappearing restarts measurement without publishing `null` (host `measure` must not clear frost when only the keyboard element changes).
- Shader: `Keyboard` / `KeyboardRadius` uniforms, `KeyboardD/H/V` textures and passes, `Track` counts `Keyboard.z`, `Composite` blends it; native allows `Keyboard` / `KeyboardRadius`. Its blur steps use the rect span like the status area.

- [ ] **Step 1: Write the failing tests:** a frame without the keyboard element still measures (keyboard all zero) and frosts; the backend accepts an all-zero keyboard rectangle and rejects all-zero for any other area; opening the keyboard keeps the same allocation and shader key; Home frost draws no surface for an empty keyboard; the shader source contains the keyboard passes and `Keyboard.z <= 0` in `Track`; `pack_uniform('Keyboard', …)` works; adding the keyboard element mid-opening sends an update, no cancel.
- [ ] **Step 2:** Run `npx vitest run tests/menu/frost` and `.venv/bin/pytest tests/py`. Expected: FAIL.
- [ ] **Step 3:** Implement, following the `status` area's pattern from `103a42b` and `ea3a345`.
- [ ] **Step 4:** Run both suites. Expected: PASS.
- [ ] **Step 5:** Commit `Frost: the menu keyboard is an optional fifth area`.

### Task 8: Whole suite, build and Ally check

- [ ] **Step 1:** `npx tsc --noEmit`, `npx vitest run`, `.venv/bin/pytest tests/py`, `npm run build`. Expected: all pass.
- [ ] **Step 2:** With Michael: install with the menu closed (frontend and backend files, then stop the frost worker so the next opening starts a fresh one), then in a game: type and send a Spanish message with accents by stick and by touch; hold a top-row key for its digit; drag the keyboard and cycle its spots; leave Social by each route (tab, Notifications, back, another friend, close); check the frost under the keyboard. Record the result in the spec's status line.
- [ ] **Step 3:** Commit `Menu keyboard: Ally check`.
