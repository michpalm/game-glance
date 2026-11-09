# Home, Game Page and Screensaver Grammar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Home, the game page and the screensaver the in-game menu's grammar: soft action buttons, one white focus ring, the feed tabs as shaded slices on a glass strip, one frost on every glass surface, and readable 90% labels.

**Architecture:** New recipes in `src/styles/tokens.ts` (radius proportions, two more focus-ring kinds, a frost surface with an optional calm filter, a label style) are the only source of the new looks. Home (`homeCss.ts`), the game page (`themeCss.ts`), the shared pills (`sourcePill.ts`, `homeGlass.ts`) and the screensaver (`screensaverCss.ts`) call them. The calm filter ships behind `CALM_IN_CSS = false` until the Ally shows Steam's browser applies an SVG filter inside `backdrop-filter`.

**Tech Stack:** TypeScript, React (Decky), CSS-in-TS string builders, Vitest.

**Spec:** `/Users/micpaal/Documents/Claude/Bazzite/game-glance-visual-language/docs/superpowers/specs/2026-10-20-visual-language-design.md`, Section 7 (Q37–Q42), at 1e961e8 on `design/visual-language`. Section 6 (already built here, 7e90aa5) is the grammar it carries over.

## Global Constraints

- Branch `codex/social-chat`, worktree `/Users/micpaal/.codex/worktrees/social-chat/game-glance-2.1`. No push, pull request or release.
- Commit identity copied, never retyped: `-c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com"` with `--author="Michael Palma <18511803+michpalm@users.noreply.github.com>"`, and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `r-action` = round(0.36 × button height); `r-action-icon` = round(0.30 × button height). Home (54 units): 19 and 16. Game page (60 `d`): 22 and 18.
- Focus on buttons, tiles and pills: 2 px white ring, 2 px outside, no glow, no `scale`. Glass tiles step up to `glass-strong` (`rgba(12,16,22,.55)`); Play keeps its accent fill.
- Feed cards and the game page's info cards: the ring, `translateY(-4px)`, shadow `0 14px 28px -12px rgba(0,0,0,.75)`. Recents capsules: the ring and that shadow, no lift. No accent glow and no accent bar anywhere.
- Feed tabs: a glass strip (`r-card` 12, `edge` `rgba(255,255,255,.12)`), slices with `selected` `rgba(255,255,255,.14)` and `selected-edge` (inset `0 -2px 0`, accent at 55%); idle tabs `rgba(255,255,255,.80)`; focused tab ring inset (`outline-offset: -2px`).
- Frost: `glass` `rgba(12,16,22,.40)`, blur 16 in the surface's unit; with `CALM_IN_CSS` the same `backdrop-filter` adds `url(#gg-calm)`: a `feComponentTransfer` table of 21 steps, identity to 0.45, then rising at 0.35, `color-interpolation-filters="sRGB"`.
- Labels: `rgba(255,255,255,.90)` with `text-shadow: 0 1px 2px #0009`; size, weight and spacing unchanged. Eyebrows ("Last played") keep their accent colour and gain the shadow.
- Mouse mode keeps today's hover rings; focus looks stay behind `NOT_MOUSE`.
- `art-fill`, `art-fill-dim` and the feed's blurred backdrops are not glass and do not change.
- Install on the Ally only with the in-game menu closed. CEF probes are read-only; never call unknown Steam functions.

## Review Focus

1. **The open transition between Home and the game page.** Home's Play and circles scale into the page's; radii taken as the same proportion of height keep the hand-over seamless, but `.gh-open-shell` (blur 12, `.38`) and the text twins (`.gh-twin[data-role="label"]`) copy the page's look and must change with it. Test: Task 5 asserts the twin label and `.gh-open-shell` match the page (`.gg-label` colour and shadow, shell glass and blur).
2. **The stream segment on Play** (a game on more than one device): its `border-radius: 0 999px 999px 0` must follow Play's new radius, or the segment pokes out of the soft corner. Test in Task 2.
3. **A focused selected tab** keeps its slice shade and line under the ring (the menu's rule), and the tab strip keeps the tab row's height so `giveWay` numbers hold. Tests in Task 3.
4. **`CALM_IN_CSS` off means no calm reference at all.** An unresolved `url(#gg-calm)` could drop the whole backdrop filter, so with the flag off no `url(` may appear in any frost. Test in Task 1.
5. **Unifideck's page buttons and the store and copy pills** use the same `actionFocused` as the circles; all of them must lose the glow and scale, not only Steam's own buttons. Test in Task 4.

---

### Task 1: Tokens for Section 7

**Files:**
- Modify: `src/styles/tokens.ts`
- Test: `tests/styles/tokens.test.ts`

**Interfaces:**
- Consumes: `TOKENS`, `focusRing(kind)` from Section 6.
- Produces:
  - `actionRadius(height: number, kind: 'action' | 'icon'): number`
  - `focusRing(kind: 'compact' | 'card' | 'menu' | 'slice' | 'lift' | 'level', u?: (n: number) => string): string`; `u` defaults to `` n => `${n}px` `` and sizes the lift and shadow
  - `CALM_IN_CSS: boolean` (false), `CALM_FILTER_ID = 'gg-calm'`, `calmTable(): string` (21 space-separated values)
  - `frostSurface(blur: string, level?: 'glass' | 'strong'): string`: `background` and `backdrop-filter` only (borders stay each surface's own)
  - `installCalmFilter(document: Document): () => void`: one hidden `<svg>` holding the filter per document, reference-counted like `installTokenCss`; does nothing while `CALM_IN_CSS` is false
  - `labelText(): string`: `color:rgba(255,255,255,.90);text-shadow:0 1px 2px #0009`

- [ ] **Step 1: Write the failing tests**

```ts
it('action radii are proportions of the button height', () => {
    expect(actionRadius(54, 'action')).toBe(19); expect(actionRadius(54, 'icon')).toBe(16);
    expect(actionRadius(60, 'action')).toBe(22); expect(actionRadius(60, 'icon')).toBe(18);
});
it('lift and level focus: white ring, neutral shadow, no accent, lift only for lift', () => {
    const lift = focusRing('lift'), level = focusRing('level');
    for (const r of [lift, level]) {
        expect(r).toContain('outline:2px solid #fff'); expect(r).toContain('outline-offset:2px');
        expect(r).toContain('0 14px 28px -12px rgba(0,0,0,.75)'); expect(r).not.toMatch(/accent|scale\(/);
    }
    expect(lift).toContain('translateY(-4px)'); expect(level).toContain('transform:none');
    expect(focusRing('lift', (n) => `calc(var(--gg-d) * ${n})`)).toContain('translateY(calc(var(--gg-d) * -4))');
});
it('the calm table is the identity to 0.45, then rises at 0.35', () => {
    const v = calmTable().split(' ').map(Number);
    expect(v).toHaveLength(21); expect(v[0]).toBe(0); expect(v[9]).toBeCloseTo(.45); expect(v[20]).toBeCloseTo(.6425);
});
it('frost is .40 glass and one blur, with no filter reference while the calm is off', () => {
    expect(CALM_IN_CSS).toBe(false);
    expect(frostSurface('16px')).toBe('background:rgba(12,16,22,.40);backdrop-filter:blur(16px)');
    expect(frostSurface('16px', 'strong')).toContain('rgba(12,16,22,.55)');
    expect(frostSurface('16px')).not.toContain('url(');
});
it('labels are 90% white with the menu shadow', () => {
    expect(labelText()).toBe('color:rgba(255,255,255,.90);text-shadow:0 1px 2px #0009');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/styles/tokens.test.ts`
Expected: FAIL (`actionRadius` and the others are not exported).

- [ ] **Step 3: Implement in `src/styles/tokens.ts`**

`calmTable()`: for i in 0..20, x = i/20, value = x ≤ .45 ? x : .45 + (x − .45) × .35, each written with up to four decimals. `frostSurface` appends `` ` url(#${CALM_FILTER_ID})` `` to the blur only when `CALM_IN_CSS`. `installCalmFilter` inserts `<svg width="0" height="0" aria-hidden="true" style="position:absolute">` with `<filter id="gg-calm" color-interpolation-filters="sRGB"><feComponentTransfer>` and `feFuncR`, `feFuncG`, `feFuncB` of `type="table"` and `tableValues={calmTable()}`.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.ts tests/styles/tokens.test.ts
git commit -m "Tokens: action radii, lift and level focus, frost surface, labels"
```

### Task 2: Home's action row

**Files:**
- Modify: `src/home/homeCss.ts` (action rules near `.gh-btn`, `.gh-btn-circle`, `.gh-btn-play`, `.gh-btn-stream`, `.gh-btn-library`, `.gh-copy-choice`, `.gh-store-choice`)
- Modify: `src/styles/homeGlass.ts` (`blurPx` 12 → 16)
- Test: `tests/home/homeCss.test.ts`

**Interfaces:**
- Consumes: `actionRadius`, `focusRing('menu')`, `frostSurface` (Task 1); `TITLE_BLOCK`/layout `button` = 54.

- [ ] **Step 1: Write the failing tests**

```ts
describe('action row (VDL Section 7)', () => {
    const css = homeCss();
    it('Play and Library take r-action, circles become r-action-icon tiles', () => {
        expect(ruleFor(css, '.gh-btn')).toContain('border-radius: 19px');
        expect(ruleFor(css, '.gh-btn-circle')).toContain('border-radius: 16px');
    });
    it('the stream segment follows Play\'s corner', () => {
        expect(ruleFor(css, '.gh-actions > .gh-btn-stream')).toContain('border-radius: 0 19px 19px 0');
    });
    it('focused buttons get the white ring only', () => {
        const focus = rulesMatching(css, /\.gh-btn.*\.gh-focus|gh-btn-stream\.gh-focus\)|gh-(copy|store)-choice.*(gh-pill-focus|:focus)/);
        expect(focus.length).toBeGreaterThan(0);
        for (const r of focus) { expect(r).not.toMatch(/glance-accent|scale\(/); }
        expect(ruleFor(css, `${NOT_MOUSE} .gh-btn.gh-focus`)).toContain('outline:2px solid #fff');
    });
    it('glass buttons use the frost; focused tiles step up to glass-strong', () => {
        expect(ruleFor(css, '.gh-btn')).toContain('backdrop-filter:blur(16px)');
        expect(ruleFor(css, `${NOT_MOUSE} .gh-btn-circle.gh-focus`)).toContain('rgba(12,16,22,.55)');
    });
});
```

`ruleFor(css, selector)` returns the declaration block of the rule whose selector list contains exactly `selector`, and `rulesMatching(css, re)` returns every block whose selector matches `re`; add both beside `topLevelCommas` in this test file if they are not there. `NOT_MOUSE` is the exported mouse-mode guard; import it from where `homeCss.ts` takes it.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/home/homeCss.test.ts -t "action row"`
Expected: FAIL (radius is `var(--gh-r-pill)`, focus has the accent glow).

- [ ] **Step 3: Implement**

`.gh-btn` takes `border-radius: ${actionRadius(t.button, 'action')}px` and `frostSurface('16px')` instead of `HOME_BUTTON_GLASS.background` + its blur; `.gh-btn-circle` adds `border-radius: ${actionRadius(t.button, 'icon')}px`. Every focus rule of the row (`.gh-btn.gh-focus`, `.gh-btn-play.gh-focus`, the Play-with-focused-stream rule, the copy and store choices) becomes `focusRing('menu')`, with `background: rgba(12,16,22,.55)` on circles only; `pillFocus` scaling and `PAGE_LAYOUT.focusScale` are no longer used here. The stream segment's corner is `0 R R 0` with R = Play's radius.

- [ ] **Step 4: Run them to verify they pass, then the whole Home suite**

Run: `npx vitest run tests/home`
Expected: PASS. Fix any older assertion that pinned the glow or `999px` on these rules by updating it to the new value; leave unrelated assertions alone.

- [ ] **Step 5: Commit**

```bash
git add src/home/homeCss.ts src/styles/homeGlass.ts tests/home/homeCss.test.ts
git commit -m "Home: soft action buttons with the menu's focus ring"
```

### Task 3: Home's feed tabs on a strip

**Files:**
- Modify: `src/home/homeCss.ts` (`.gh-root` variables, `.gh-tabs`, `.gh-tab*`)
- Modify: `src/home/FeedSheet.tsx:298` (remove `<div className="gh-tab-line" />`)
- Test: `tests/home/homeCss.test.ts`, `tests/home/feedTabs.test.ts` if it renders the tab markup

**Interfaces:**
- Consumes: `selectedSlice()`, `focusRing('slice')`, `frostSurface` (Task 1); `FEED_SHEET.tabHeight`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('feed tabs (VDL Section 7)', () => {
    const css = homeCss();
    it('sit on a glass strip as full-height slices', () => {
        const strip = ruleFor(css, '.gh-tabs');
        expect(strip).toContain('backdrop-filter:blur(16px)'); expect(strip).toContain('border-radius: 12px');
        expect(strip).toContain('gap: 0'); expect(strip).toContain('overflow: hidden');
        expect(ruleFor(css, '.gh-tab')).toContain('color: rgba(255,255,255,.80)');
    });
    it('mark the current tab with the selected slice, never an underline', () => {
        expect(ruleFor(css, '.gh-tab.gh-tab-on')).toContain('background:var(--gg-selected)');
        expect(css).not.toContain('.gh-tab-line');
        expect(ruleFor(css, '.gh-root')).toContain('--gg-accent: var(--glance-accent)');
    });
    it('focus is the inset ring and keeps the selected shade', () => {
        const f = ruleFor(css, `${NOT_MOUSE} .gh-tab.gh-tab-focus`);
        expect(f).toContain('outline-offset:-2px'); expect(f).not.toContain('background');
    });
    it('keeps the tab row height', () => {
        expect(ruleFor(css, '.gh-tab')).toContain('padding: 8px 16px 10px');
        expect(FEED_SHEET.tabHeight).toBe(8 + 10 + 13 * 1.2);
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/home/homeCss.test.ts -t "feed tabs"`
Expected: FAIL.

- [ ] **Step 3: Implement**

`.gh-root` gains `--gg-accent: var(--glance-accent); --gg-text: #fff; --gg-selected: rgba(255,255,255,.14); --gg-selected-edge: inset 0 -2px 0 color-mix(in srgb, var(--gg-accent) 55%, transparent)`. `.gh-tabs` keeps its position but hugs its tabs (`right: auto; width: max-content`), with `gap: 0`, `border: 1px solid rgba(255,255,255,.12)`, `border-radius: 12px`, `overflow: hidden` and `frostSurface('16px')`. `.gh-tab` padding becomes `8px 16px 10px`, idle colour .80; `.gh-tab-on` takes `selectedSlice()`; the focus rule takes `focusRing('slice')`; hover keeps `.85` text. All `.gh-tab-line` rules and the element go.

- [ ] **Step 4: Run Home's tests and the stack test**

Run: `npx vitest run tests/home`
Expected: PASS, including `giveWay.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/home/homeCss.ts src/home/FeedSheet.tsx tests/home
git commit -m "Home: feed tabs as shaded slices on a glass strip"
```

### Task 4: Focus on cards, capsules and the game page

**Files:**
- Modify: `src/home/homeCss.ts` (`.gh-card.gh-card-focus`, `.gh-card-bar`, `.gh-cap.gh-cap-focus`, `.gh-recents-focus .gh-cap-sel`, `.gh-cap-bar`, `GLOW`, `capGlow`)
- Modify: `src/home/FeedCards.tsx:146`, `src/home/RecentsRow.tsx:112,234` (remove the bar elements)
- Modify: `src/styles/homeGlass.ts` (remove `homeCardFocusShadow` once unused)
- Modify: `src/styles/themeCss.ts` (Play radii at `:323` and `:441`, circles at `:333` and `:347`, `actionFocusShadow`/`actionFocused` and every user, `.gg-card-nav` focus at `:826`)
- Test: `tests/home/homeCss.test.ts`, `tests/styles/themeCss.test.ts`

**Interfaces:**
- Consumes: `actionRadius`, `focusRing('menu' | 'lift' | 'level', u)` (Task 1); `PAGE_LAYOUT.icon` = 60.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/home/homeCss.test.ts
it('feed cards lift with the ring and a neutral shadow; capsules stay level', () => {
    const css = homeCss();
    expect(ruleFor(css, '.gh-card.gh-card-focus')).toContain('translateY(-4px)');
    for (const sel of ['.gh-card.gh-card-focus', '.gh-cap.gh-cap-focus', '.gh-recents-focus .gh-cap-sel']) {
        const r = ruleFor(css, sel);
        expect(r).toContain('outline:2px solid #fff'); expect(r).toContain('rgba(0,0,0,.75)'); expect(r).not.toContain('glance-accent');
    }
    expect(ruleFor(css, '.gh-cap.gh-cap-focus')).not.toContain('translateY');
    expect(css).not.toMatch(/\.gh-(card|cap)-bar/);
});
// tests/styles/themeCss.test.ts
it('game page: soft Play and tiles, menu focus everywhere, info cards lift', () => {
    const css = buildThemeCss(full) + buildUnifideckCss(full);
    expect(css).toContain('border-radius: calc(var(--gg-d) * 22) !important');
    expect(css).toContain('border-radius: calc(var(--gg-d) * 18) !important');
    expect(css).not.toMatch(/border-radius: (999px|50%) !important; overflow: hidden !important; background: var\(--gg-accent\)/);
    // the page's action controls: Play, the circles, the cloud, Unifideck's buttons, the store and copy pills
    for (const r of rulesMatching(css, /(rt_|play|menu|cloud|unifideck|gg-store|gg-copy)[^{]*(gpfocus|:focus|gg-store-focus|gg-copy-focus)/i)) {
        expect(r).not.toMatch(/box-shadow:[^;]*var\(--glance-accent\)/); expect(r).not.toContain('scale(1.04)');
    }
    expect(css).toContain('translateY(calc(var(--gg-d) * -4))');
    expect(css).toContain('transform-style: preserve-3d');   // icon buttons keep blurring the art (57a522a)
});
```

Use the game page's own `d()` output form in the radius assertions; check what `d(22)` prints in `themeCss.ts` and match it exactly. Copy `rulesMatching` into the themeCss test file if it is not there.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/home/homeCss.test.ts tests/styles/themeCss.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Home: card focus `focusRing('lift')` with `--gh-edge: rgba(255,255,255,.3)` kept; both capsule focus rules `focusRing('level')` with the `--gh-edge` they set today; drop `GLOW`, `capGlow` and the bar rules and elements. Game page: Play's two radius rules take `d(actionRadius(PAGE_LAYOUT.icon, 'action'))`, the circles `d(actionRadius(PAGE_LAYOUT.icon, 'icon'))`; `actionFocused` becomes `focusRing('menu')` + `!important` on each declaration, with `background: rgba(12,16,22,.55)` for the circle, cloud and Unifideck icon rules; `.gg-card-nav` focus becomes `focusRing('lift', d)`. `pillFocusScale` and `PILL_FOCUS` stay only if something else still uses them; the open transition's `openTargets` reads `PAGE_LAYOUT.focusScale`, so leave that constant.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run > /tmp/gg-t4.txt 2>&1; tail -20 /tmp/gg-t4.txt`
Expected: all pass. Update older assertions that pinned the accent glow, `scale(1.04)` on focus or the bars; leave the rest alone.

- [ ] **Step 5: Commit**

```bash
git add src/home src/styles tests
git commit -m "Home and game page: one white focus ring; cards lift, capsules stay level"
```

### Task 5: One frost and readable labels

**Files:**
- Modify: `src/styles/sourcePill.ts` (status pill, source, family, store and copy pills: `background` + `blur` via `frostSurface`)
- Modify: `src/home/homeCss.ts` (`GLASS` .38/14 → frost; `.gh-card` glass; `.gh-lib-body` `frostSurface('16px', 'strong')`; `.gh-open-shell` glass and blur; labels: `.gh-chip-label`, `.gh-feed-row-title`, `.gh-card-sub`, `.gh-twin[data-role="label"]`, `.gh-x-label`; `.gh-eyebrow` shadow)
- Modify: `src/styles/themeCss.ts` (cards `:505`, clean panel `:531`, `menuButton` and cloud blur 12 → frost; `.gg-label`, clean panel label; `.gg-eyebrow` shadow)
- Modify: `src/screensaver/screensaverCss.ts` (`.ggs-card` .38 → frost; `.ggs-label` → `labelText()`)
- Modify: `src/home/SpotlightHome.tsx`, `src/styles/theme.ts`, `src/screensaver/ScreensaverView.tsx` (call `installCalmFilter(document)` where each installs its styles, release on cleanup)
- Test: `tests/home/homeCss.test.ts`, `tests/styles/themeCss.test.ts`, `tests/screensaver/*Css*.test.ts`, `tests/styles/tokens.test.ts`

**Interfaces:**
- Consumes: `frostSurface`, `labelText`, `installCalmFilter`, `CALM_IN_CSS` (Task 1).

- [ ] **Step 1: Write the failing tests**

```ts
// one test per surface file, same shape
it('every glass surface uses the frost and no other blur or tint', () => {
    const css = homeCss();                                       // themeCss: buildThemeCss(full) + buildCleanCss(full); screensaver: screensaverCss(null)
    expect(css).not.toMatch(/rgba\(12,\s*16,\s*22,\s*0?\.38\)/);
    expect(css).not.toMatch(/backdrop-filter:\s*blur\((10|12|14)px\)|backdrop-filter:\s*blur\(calc\(var\(--gg-d\) \* (10|12)\)\)/);
});
it('small labels are 90% white with the shadow', () => {
    const css = homeCss();
    for (const sel of ['.gh-chip-label', '.gh-feed-row-title', '.gh-card-sub']) expect(ruleFor(css, sel)).toContain(labelText());
    expect(ruleFor(css, '.gh-eyebrow')).toContain('text-shadow:0 1px 2px #0009');
});
it('the open transition copies the page: twin labels and the shell match', () => {
    const page = buildThemeCss(full), home = homeCss();
    expect(page).toContain(`.gg-label { ${pageType('label', unit)} ${labelText()}`);   // match the exact form the page writes
    expect(home).toMatch(/\.gh-twin\[data-role="label"\][^}]*rgba\(255,255,255,\.90\)[^}]*0 1px 2px #0009/);
    expect(ruleFor(home, '.gh-open-shell')).toContain('rgba(12,16,22,.40)');
});
it('installCalmFilter adds nothing while the calm is off', () => {
    const doc = document.implementation.createHTMLDocument('');
    const release = installCalmFilter(doc);
    expect(doc.getElementById('gg-calm')).toBeNull(); release();
});
```

Adjust the page label assertion to the exact string `themeCss.ts` writes once `labelText()` is in it; the point is that page and twin carry the same colour and shadow.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/home tests/styles tests/screensaver`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement**

Every listed glass rule swaps its own `background`/`backdrop-filter` for `frostSurface(<16 in its unit>)` (Home `'16px'`, the page `d(16)`, the screensaver `` `${CARD_BLUR}px` ``), keeping its border. `SOURCE_PILL.blur` becomes 16 and `sourcePillLook` writes `frostSurface(unit(16))` in place of its blur and background. Labels take `labelText()` in place of their `.62` colour; eyebrows add only the shadow. `.gh-open-shell` takes the page cards' new glass and blur so the shell still matches what it opens into.

- [ ] **Step 4: Run the full suite, typecheck and build**

Run: `npx vitest run > /tmp/gg-t5.txt 2>&1; tail -20 /tmp/gg-t5.txt; npx tsc --noEmit && npx rollup -c > /tmp/gg-build.txt 2>&1; tail -3 /tmp/gg-build.txt`
Expected: all tests pass, no type errors, `dist/index.js` written.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "One frost on every glass surface; small labels at 90% with a shadow"
```

### Task 6: Device check on the Ally

Manual; needs the Ally. Nothing here is a code change unless Step 3 says so.

- [ ] **Step 1: Calm filter support.** Build once with `CALM_IN_CSS = true` (a local, uncommitted change), install with the in-game menu closed, open a game page over bright art (TOEM or Dorfromantik). Take a Gamescope screenshot. Pass: the status bar and info card are still blurred, and bright areas behind them are toned down compared with the same frame on the committed build. Fail: any glass shows no blur.
- [ ] **Step 2: Looks.** On the committed build (or the flag build if Step 1 passed): Home at rest and with the feed open, Ori's page and a bright game's page, the screensaver, docked and handheld. Check: the white ring is visible over bright art; a focused current tab shows shade and ring; the Recently updated lines read over bright art; Home's Play opens into the page's Play with no jump in its corners; mouse hover still shows the old hover rings.
- [ ] **Step 3: Record.** If Step 1 passed, set `CALM_IN_CSS = true`, flip the `CALM_IN_CSS` assertions in `tests/styles/tokens.test.ts` and the `installCalmFilter` test (the filter element now exists, every frost contains `url(#gg-calm)`), run `npx vitest run`, and commit "Frost: calm bright art outside the menu too". Either way, add the result to the spec's Section 7 Testing list on `design/visual-language` and commit there.
