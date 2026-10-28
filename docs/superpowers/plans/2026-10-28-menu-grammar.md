# In-game Menu Grammar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the visual language's Section 6 (in-game menu grammar, Q31–Q36) to the floating in-game menu: cards and full-height slices, one white focus ring, selection as a soft shade with a faint accent line, page titles, one setting row, and choices that respond at once.

**Architecture:** Two new tokens and two recipe kinds in `src/styles/tokens.ts`; the menu's CSS strings (`src/menu/styles.ts`, `src/menu/socialStyles.ts`) are rewritten to use them; small markup changes in the menu panels; one pure helper (`shownChoice`) gives choice groups an immediate local selection while Steam applies a change. Nothing outside `src/menu` and `tokens.ts` changes, so Home, the game page and the screensaver look exactly as before.

**Tech Stack:** TypeScript, React (Decky `@decky/ui`), CSS in template strings, Vitest, `react-icons/lu`.

**Spec:** `/Users/micpaal/Documents/Claude/Bazzite/game-glance-visual-language/docs/superpowers/specs/2026-10-20-visual-language-design.md`, Section 6 (commit 64f4890 on `design/visual-language`). Visual reference: the four artifacts linked at the top of Section 6.

## Global Constraints

- Branch `codex/social-chat` in `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`. No push, pull request or release.
- Commit as Michael, copied from `git log` (never retyped): `git -c user.name='Michael Palma' -c user.email='18511803+michpalm@users.noreply.github.com' commit --author='Michael Palma <18511803+michpalm@users.noreply.github.com>'`; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `selected` = `rgba(255,255,255,.14)`; `selected-edge` = `inset 0 -2px 0 color-mix(in srgb,var(--gg-accent) 55%,transparent)` (an inset shadow, never a border).
- Focus in the menu: `outline:2px solid #fff`, offset `2px` outside a card, `-2px` inside a slice; fill `glass-strong` unless the item is selected; no `transform`, no `--gg-focus-shadow`.
- `r-pill` only for toggle switches, slider tracks and thumbs, progress bars, circles (avatars) and the status pill. Everything else in the menu is `r-card` (12) or a slice (radius 0 inside a clipping `r-card` track); bar and panel keep `r-panel`.
- Every focus rule keeps the `:where(html:not([data-gg-mouse]))` prefix (no focus look in mouse mode).
- The accent is never a selection fill in the menu. On toggles, slider fills, progress bars, the unread dot, the own message bubble and Send keep `accent` (Send is the page's one primary button; see the note at the end).
- Tile height 112 (design units, `--gg-d`), icon 24, gap 8.
- Copy: Navigate's button reads "Steam menu"; Social's title reads "Social" with the existing counts text ("1 in game · 1 online" / "Nobody online") on its right.
- Only the menu changes: `focusRing('compact'|'card')` and `currentUnderline()` keep their output for other callers.

## Review Focus

- Steam refuses a choice: the option shown returns to Steam's value and the setting's error line appears (Task 4 test `reverts to Steam's value when the change fails`).
- The game changes while a choice is pending: the adapter cancels without an error; the shown option must fall back to Steam's value with no spinner left turning (Task 4 test `drops the local choice when Steam cancels it`).
- Pressing the option that is already selected: no write and no spinner (Task 4 test `ignores the option that is already selected`).
- Mouse or touch mode: none of the new focus rules may apply without the mouse-mode guard (Task 2 test `keeps every focus rule out of mouse mode`).
- A long tab row (In game plus four pinned sections and More on a 16:10 screen): slices must not wrap or squash labels; the bar keeps horizontal scrolling (Task 2 test `keeps tab labels on one line and the bar scrollable`).

---

### Task 1: Selection tokens and menu focus kinds

**Files:**
- Modify: `src/styles/tokens.ts`
- Test: `tests/styles/tokens.test.ts`

**Interfaces:**
- Produces: `TOKENS.selected: 'rgba(255,255,255,.14)'`; CSS vars `--gg-selected`, `--gg-selected-edge` from `tokenCss()`; `selectedSlice(): string`; `focusRing(kind: 'compact' | 'card' | 'menu' | 'slice'): string`.

- [ ] **Step 1: Write the failing tests**

```ts
it('declares the selected shade and its faint accent edge', () => {
    expect(TOKENS.selected).toBe('rgba(255,255,255,.14)');
    const css = tokenCss('.x');
    expect(css).toContain('--gg-selected:rgba(255,255,255,.14)');
    expect(css).toContain('--gg-selected-edge:inset 0 -2px 0 color-mix(in srgb,var(--gg-accent) 55%,transparent)');
    expect(selectedSlice()).toBe('background:var(--gg-selected);color:var(--gg-text);box-shadow:var(--gg-selected-edge)');
});
it('gives the menu a ring that follows the shape, with no growth or glow', () => {
    expect(focusRing('menu')).toBe('outline:2px solid #fff;outline-offset:2px;transform:none');
    expect(focusRing('slice')).toBe('outline:2px solid #fff;outline-offset:-2px;transform:none');
    expect(focusRing()).toContain('scale(1.04)'); // other surfaces unchanged
});
```

(Add `TOKENS, tokenCss, selectedSlice, focusRing` to the file's import.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/styles/tokens.test.ts`
Expected: FAIL (`selectedSlice` is not exported; `TOKENS.selected` undefined).

- [ ] **Step 3: Implement in `src/styles/tokens.ts`**

Add `selected` to `TOKENS`, the two declarations to `tokenCss`, `export const selectedSlice = () => …`, and the two new `focusRing` kinds. The new kinds set no `background` or `box-shadow`, so a focused selected item keeps its fill and edge.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/styles/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** — `Tokens: selected shade and menu focus ring`

---

### Task 2: Menu shape, focus and selection CSS

**Files:**
- Modify: `src/menu/styles.ts`, `src/menu/socialStyles.ts`
- Test: `tests/menu/styles.test.ts`

**Interfaces:**
- Consumes: `selectedSlice()`, `focusRing('menu' | 'slice')` from Task 1.
- Produces: the class contract later tasks rely on: `.gg-menu-heading` (title row, `align-items:center`), `.gg-menu-pending` (spinner on an option), and `aria-pressed=true` on any `button.gg-menu-action` meaning selected.

- [ ] **Step 1: Write the failing tests** (in the existing `describe`; replace the old tab and Performance-category assertions that expect `currentUnderline`)

```ts
const all = [...menuStyles.split('\n'), ...socialStyles.split('\n')];
it('draws options in the bar and tracks as full-height slices in a card track', () => {
    expect(rule('.gg-menu-tabs')).toMatch(/padding:0.*gap:0|gap:0.*padding:0/);
    expect(rule('.gg-menu-tabs')).toContain('align-items:stretch');
    for (const track of ['.gg-menu-segmented', '.gg-menu-perf-tabs']) {
        expect(rule(track)).toContain('border-radius:var(--gg-r-card)');
        expect(rule(track)).toContain('overflow:hidden');
        expect(rule(track)).toMatch(/padding:0/);
    }
    for (const slice of ['.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton',
        '.gg-menu-native-host .gg-menu .gg-menu-segmented button.gg-menu-action.DialogButton',
        '.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton'])
        expect(rule(slice)).toContain('border-radius:0');
});
it('uses pills only where the round shape is the control', () => {
    const pills = all.filter(line => line.includes('--gg-r-pill'));
    for (const line of pills) expect(line, line.slice(0, 90)).toMatch(/SliderTrack|SliderHandle|role=checkbox|gg-ingame-bar|gg-ingame-progress|gg-social-avatar|gh-status-pill/);
});
it('marks every selected item with the shade and faint edge, never an accent fill', () => {
    const selected = all.flatMap(line => line.match(/[^{}]*\[aria-pressed=true\][^{}]*\{[^}]*\}/g) ?? [])
        .filter(css => !css.includes(':not([aria-pressed=true])'));
    expect(selected.length).toBeGreaterThanOrEqual(5); // tab, segment, category, friend, bell
    for (const css of selected) {
        expect(css, css.slice(0, 90)).not.toContain('background:var(--gg-accent)');
        if (!css.includes('::after')) expect(css, css.slice(0, 90)).toContain('var(--gg-selected-edge)');
    }
    expect(menuStyles + socialStyles).not.toContain('currentUnderline');
});
it('focuses with the white ring only: no growth, no glow', () => {
    expect(menuStyles + socialStyles).not.toContain('--gg-focus-shadow');
    expect(menuStyles + socialStyles).not.toContain('scale(1.04)');
    expect(menuStyles).toContain('outline-offset:-2px'); // slices
});
it('keeps every focus rule out of mouse mode', () => {
    for (const line of all.filter(l => /gpfocus|:focus-visible|:focus-within/.test(l)))
        expect(line, line.slice(0, 90)).toMatch(/^:where\(html:not\(\[data-gg-mouse\]\)\)/);
});
it('keeps tab labels on one line and the bar scrollable', () => {
    expect(rule('.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton')).toContain('white-space:nowrap');
    expect(rule('.gg-menu-tabs')).toContain('overflow-x:auto');
});
it('lets a slider without a partner take the full row', () => {
    expect(menuStyles).toContain('.gg-menu-quick-sliders>:only-child{grid-column:1/-1}');
});
it('gives tiles one height on every page', () => {
    expect(rule('.gg-menu-native-host .gg-menu .gg-menu-grid button.gg-menu-action.DialogButton')).toMatch(/height:112px/);
    expect(rule('.gg-menu .gg-ingame-grid')).not.toMatch(/flex:1/);
});
```

Keep the existing glass, idle-text, 90%-label and fade tests; update only assertions that name the old tab underline.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/menu/styles.test.ts`
Expected: FAIL on the slice, pill, selected and focus tests.

- [ ] **Step 3: Rewrite the rules**

In `styles.ts` (each item is one rule edit; the 2026-10-28 mockup CSS in the Shape and focus artifact is the visual reference):
- Buttons and the bell: `border-radius:var(--gg-r-card)`.
- `.gg-menu-tabs`: `padding:0;gap:0;align-items:stretch` (keep `overflow-x:auto`); tab: `flex:1 1 auto;border-radius:0;padding:0 12px;min-height:0`, no `::after`; selected tab `${selectedSlice()}`.
- `.gg-menu-segmented` and `.gg-menu-perf-tabs`: `border-radius:var(--gg-r-card);padding:0;gap:0;overflow:hidden` with glass and `edge`; their buttons `border-radius:0;border:0;min-height:44px`; a following slice gets `box-shadow:inset 1px 0 0 var(--gg-edge)` (the selected slice overrides it with its edge); selected `${selectedSlice()}`.
- Focus: one rule `focusRing('menu')` for cards (buttons, tiles, setting rows, the message field), one `focusRing('slice')` for `:is(.gg-menu-tabs,.gg-menu-segmented,.gg-menu-perf-tabs)` buttons, one `background:var(--gg-glass-strong)` for focused items without `aria-pressed=true`. Delete the old tab and category focus rules with the glow.
- Bell `[aria-pressed=true]`: `${selectedSlice()}`.
- `.gg-menu-quick-sliders>:only-child{grid-column:1/-1}` (a lone TDP or GPU clock slider takes the full row).
- Grid tiles `height:112px;min-height:112px;gap:8px`; `.gg-ingame-grid` drops `flex:1` and uses `grid-auto-rows:112px`.
- `.gg-menu-heading`: `align-items:center`; add `.gg-menu-pending::after` (0.8em ring, `border:2px solid rgba(255,255,255,.35);border-top-color:#fff`, `animation:gg-menu-spin .8s linear infinite`, `@keyframes gg-menu-spin{to{transform:rotate(360deg)}}`); the existing reduced-motion rule already stops it, which leaves a still ring.
- `.gg-menu-setting-header` and the profile header: setting label (`font-size:var(--gg-type-body);font-weight:var(--gg-weight-body);text-transform:none;letter-spacing:0;color:var(--gg-text);text-shadow:var(--gg-text-shadow);margin:0 0 8px`).

In `socialStyles.ts`: the selected friend row becomes `${selectedSlice()}` (drop its `::after` underline and the `currentUnderline` import); the message field's focus uses `focusRing('menu')`; the timeline's `:focus-visible` drops `--gg-focus-shadow`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/menu/styles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** — `Menu: cards and slices, one focus ring, shaded selection`

---

### Task 3: Setting rows and sliders

**Files:**
- Modify: `src/menu/components/PerformancePanel.tsx`
- Create: `tests/menu/performancePanel.test.ts`

**Interfaces:**
- Produces: `export function settingIcon(id: string): ComponentType | undefined` in `PerformancePanel.tsx`.

- [ ] **Step 1: Write the failing tests**

```ts
vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', SliderField: 'div', ToggleField: 'div', NavEntryPositionPreferences: {}, findModule: () => null }));
it('gives every Performance setting row an icon', () => {
    expect(settingIcon('frameLimit')).toBe(LuGauge);
    expect(settingIcon('overlayLevel')).toBe(LuLayers);
    expect(settingIcon('overlaySteam')).toBe(LuEye);
    expect(settingIcon('hdr')).toBe(LuImage);
});
it('shows a slider value beside its label, with no tick labels', () => {
    const source = readFileSync('src/menu/components/PerformancePanel.tsx', 'utf8');
    expect(source).not.toContain('notchLabels');
});
it('labels the performance profile with the setting label, not a section label', () => {
    const source = readFileSync('src/menu/components/PerformancePanel.tsx', 'utf8');
    expect(source).not.toContain('<h3>Performance profile</h3>');
    expect(source).toContain('<div className="gg-menu-setting-header">Performance profile</div>');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/menu/performancePanel.test.ts`
Expected: FAIL (`settingIcon` is not exported).

- [ ] **Step 3: Implement**

`settingIcon(id)`: `LuImage` for `hdr`, then `steamPerformanceIcon(id)`, then a fallback map `{ frameLimit: LuGauge, overlayLevel: LuLayers, overlaySteam: LuEye }`. `Control` uses it. Remove `notchLabels`, `notchCount` and `notchTicksVisible` from the `SliderField` (the `<output>` beside the label already shows the value). `ProfilePill`: replace the `h3` with the setting-label `div`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/menu/performancePanel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** — `Menu: one setting row with icons; sliders without tick labels`

---

### Task 4: Choices that respond at once

**Files:**
- Create: `src/menu/pendingChoice.ts`, `tests/menu/pendingChoice.test.ts`
- Modify: `src/menu/components/SettingSegments.tsx`, `src/menu/components/PerformancePanel.tsx`, `tests/menu/settingSegments.test.ts`

**Interfaces:**
- Produces: `export function shownChoice<T>(draft: T | null, s: { value: T | null; pending: boolean; error: string | null }): { value: T | null; spinning: boolean }` and `export function shouldClearDraft(s: { pending: boolean }): boolean`.
- `SettingSegments` gains `spinning?: boolean` (the selected option shows `gg-menu-pending` and `aria-busy="true"`); `disabled` now means only Steam reports the control unavailable.

- [ ] **Step 1: Write the failing tests**

`tests/menu/pendingChoice.test.ts`:

```ts
it('shows the pressed option at once, with a spinner, while Steam applies it', () => {
    expect(shownChoice(3, { value: 1, pending: true, error: null })).toEqual({ value: 3, spinning: true });
});
it('shows Steam’s value once the change has landed', () => {
    expect(shouldClearDraft({ pending: false })).toBe(true);
    expect(shownChoice(null, { value: 3, pending: false, error: null })).toEqual({ value: 3, spinning: false });
});
it('reverts to Steam’s value when the change fails', () => {
    expect(shouldClearDraft({ pending: false })).toBe(true);
    expect(shownChoice(null, { value: 1, pending: false, error: 'Steam could not apply this change' })).toEqual({ value: 1, spinning: false });
});
it('drops the local choice when Steam cancels it', () => {
    // A context change settles the receipt with no error: pending false, value unchanged.
    expect(shouldClearDraft({ pending: false })).toBe(true);
    expect(shownChoice(null, { value: 1, pending: false, error: null }).spinning).toBe(false);
});
```

`tests/menu/settingSegments.test.ts`: replace `keeps pending or unavailable choices inoperable…` with:

```ts
it('keeps every option usable and spins the chosen one while Steam applies it', () => {
    const set = vi.fn();
    const options = SettingSegments({ id: 'performance:scalingMode', label: 'Scaling mode', options: [1,2,3], value: 2, spinning: true,
        labels: { 1: 'Auto', 2: 'Integer', 3: 'Fit' }, onSelect: set }).props.children;
    expect(options.some(o => o.props.disabled)).toBe(false);
    expect(options[1].props.className).toContain('gg-menu-pending');
    options[2].props.onAction(); expect(set).toHaveBeenCalledWith(3);
});
it('ignores the option that is already selected', () => {
    const set = vi.fn();
    const options = SettingSegments({ id: 'p', label: 'P', options: [1,2], value: 2, labels: {}, onSelect: set }).props.children;
    options[1].props.onAction(); expect(set).not.toHaveBeenCalled();
});
it('keeps unavailable choices inoperable', () => {
    const set = vi.fn();
    const options = SettingSegments({ id: 'p', label: 'P', options: [1,2], value: 2, disabled: true, labels: {}, onSelect: set }).props.children;
    expect(options.every(o => o.props.disabled)).toBe(true); options[0].props.onAction(); expect(set).not.toHaveBeenCalled();
});
```

`MenuAction` must forward `aria-busy`; extend its props with `busy?: boolean` if needed.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/menu/pendingChoice.test.ts tests/menu/settingSegments.test.ts`
Expected: FAIL (module missing; options still disabled while pending).

- [ ] **Step 3: Implement**

`shownChoice`: `value: draft ?? s.value`, `spinning: draft !== null`. `shouldClearDraft`: `!s.pending`. In `Control` (choice branch) and `ProfilePill`: keep a `draft` state set on select, cleared by an effect on `[s.pending, s.value, s.error]` when `shouldClearDraft(s)`, the same pattern the sliders already use; pass `value={shown.value}`, `spinning={shown.spinning}`, `disabled={s.disabled}` (no longer `|| s.pending`). The error line under the setting is unchanged.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/menu/pendingChoice.test.ts tests/menu/settingSegments.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** — `Menu: choices select at once and spin while Steam applies them`

---

### Task 5: Page titles, page actions and the bell

**Files:**
- Modify: `src/menu/components/SocialPanel.tsx`, `src/menu/components/NavigatePanel.tsx`, `src/menu/components/NotificationsPanel.tsx`, `src/menu/components/MenuBar.tsx`, `src/menu/components/MenuShell.tsx`, `src/menu/model.ts`, `src/menu/styles.ts` (drop `.gg-notifications-heading` and `.gg-social-heading` if unused)
- Test: `tests/menu/socialPanel.test.ts`, `tests/menu/model.test.ts`, `tests/menu/notificationsPanel.test.ts`, create `tests/menu/navigatePanel.test.ts`

**Interfaces:**
- Produces: `export function barSelection(state: MenuState): SectionId | null` in `model.ts` (`null` while Notifications is on top of the stack, else `selectedBarSection(state)`).

- [ ] **Step 1: Write the failing tests**

```ts
// socialPanel.test.ts: replace the `gg-social-heading` assertion in 'lists friends in a game first…'
const heading = v.nodes.find(n => n.props.className === 'gg-menu-heading')!;
expect(strings(tree(heading))).toEqual(expect.arrayContaining(['Social', '1 in game · 1 online']));
expect(strings(tree(v.nodes.find(n => n.props.className === 'gg-social-list-heading')!))).toEqual(['Friends']);

// navigatePanel.test.ts (mock @decky/ui as in socialPanel.test.ts)
it('puts Steam menu in the title row as a card button with the arrow', () => {
    const nodes = tree(NavigatePanel({ handoff: vi.fn() }));
    const heading = nodes.find(n => n.props.className === 'gg-menu-heading')!;
    const button = tree(heading).find(n => n.props.id === 'navigate:native')!;
    expect(strings(tree(button))).toEqual(['Steam menu']);
    expect(tree(button).some(n => n.type === LuArrowUpRight)).toBe(true);
    expect(nodes.some(n => n.props.className === 'gg-menu-secondary')).toBe(false);
});

// model.test.ts
it('selects no tab while Notifications is open', () => {
    const state = reduceMenu(defaultMenuState(), { type: 'push', viewId: 'notifications' });
    expect(barSelection(state)).toBeNull();
    expect(barSelection(defaultMenuState())).toBe(selectedBarSection(defaultMenuState()));
});

// notificationsPanel.test.ts
it('uses the shared title row', () => { /* NotificationsContents' first child has className 'gg-menu-heading' */ });
```

(`strings` is the text-collecting helper already in `socialPanel.test.ts`; move it next to `tree` in a shared `tests/menu/tree.ts` if a second file needs it.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/menu/socialPanel.test.ts tests/menu/navigatePanel.test.ts tests/menu/model.test.ts tests/menu/notificationsPanel.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

- Social: `<div className="gg-menu-heading"><h2>Social</h2><span>{counts}</span></div>` as the first child of `.gg-social`; the list heading keeps only "Friends".
- Navigate: `<div className="gg-menu-heading"><h2>Navigate</h2><MenuAction id="navigate:native" …><LuArrowUpRight aria-hidden="true" />Steam menu</MenuAction></div>`, then the grid; no `.gg-menu-secondary`.
- Notifications: its heading div takes `gg-menu-heading`.
- `barSelection` in `model.ts`; `MenuBar` uses it for `selected`; `MenuShell` passes `selected={showingNotifications}` to the bell.
- `MenuShell`'s fallback page (sections without a panel): its "Open in Steam" button gets `<LuArrowUpRight aria-hidden="true" />`, and the title and button sit in one `gg-menu-heading`.
- Performance keeps its header as mocked: title with the power line under it, Per-game profile on the right.

- [ ] **Step 4: Run to verify they pass**

Run: the Step 2 command. Expected: PASS

- [ ] **Step 5: Commit** — `Menu: page titles with their action or status; the bell marks Notifications`

---

### Task 6: Whole check and device check

**Files:** none new.

- [ ] **Step 1: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npx rollup -c`
Expected: all tests pass, no type errors, `dist/index.js` built.

- [ ] **Step 2: Device check on the Ally** (when it is back; install only with the menu closed, through Decky's `install_plugin` with the zip server, never by setting the ReShade atom)

On a bright and a dark scene, open each menu page and check: the selected slice is visible on both; focus never looks like selection; a focused selected slice shows both; Scaling mode changes select at once with the spinner and nothing greys out; tiles on In game and Navigate are the same height; the bar's labels fit at the Ally's scale. Compare with the four Section 6 artifacts.

- [ ] **Step 3: Commit any device fixes** each with its own test, as above.

---

Open point for Michael before Task 2: Section 6 says the accent is "never a large fill" in the menu, but Social's own message bubbles and the Send button are accent fills today and were not in the mockups. This plan keeps them (Send is the page's one primary action; your own bubbles are the usual chat convention). If they should become shaded too, Task 2 adds them to the selected-rule test.
