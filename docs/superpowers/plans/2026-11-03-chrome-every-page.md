# Status Bar and Footer on Every Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One persistent `ChromeHost` in Steam's main window owns the Game Glance status bar, Search, status focus and footer on every Big Picture page, replacing Home's and the game page's own leases.

**Architecture:** A global component (`routerHook.addGlobalComponent`) runs a controller that takes the existing header and footer leases and status focus. Pages register *claims* in a small store (Home: feed sheet, return target, Up entry; game page: presence). A pure policy decides on/off/suspended from settings, claims and Steam's UI state. Focus enters our bar by redirecting Steam's own focus when it lands in its (now opacity-hidden) header.

**Tech Stack:** TypeScript, React 18, @decky/api `routerHook`, @decky/ui, Vitest + linkedom.

**Spec:** `docs/superpowers/specs/2026-11-03-chrome-every-page-design.md`

## Global Constraints

- Opt-in chain: Game Glance enabled, Spotlight Home, Status bar, Expanded Home controls (`footerOptedIn`), plus new `chromeEveryPage` (default `false`) for pages beyond Home and the game page.
- Only marker attributes and our CSS on Steam's nodes; never replace nodes, handlers, labels or glyphs; never call Steam functions.
- Steam's top bar is hidden with `opacity:0` and `pointer-events:none` only. No `inert`, `aria-hidden`, `tabindex=-1` or `visibility:hidden`.
- Step aside (release header and footer, fade our bar) while: a side menu is open, Steam not in front, launch screen up, screensaver on, disconnected or hidden.
- Works the same with or without a game running.
- Commits: Michael's identity, copied exactly: `git -c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com" commit --author="Michael Palma <18511803+michpalm@users.noreply.github.com>"`; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit only once Michael has said this work may be committed; stage only the task's files (the tree holds other uncommitted work). Never push.
- Install on the Ally only with no side menu open; frontend-only changes need a plugin reload (IIFE), backend none here.

## Review Focus

1. **Steam remounts `#Footer` or its top bar on a route change** (new nodes, same structure): markers must be back before the next paint, not a frame of Steam's look. Test in Task 5.
2. **Up pressed while focus is already in our bar:** must not bounce focus into Steam's header and back in a loop; it stays put. Test in Task 4.
3. **Search keyboard open** (focus in `.gh-keyboard-surface`): Steam focusing its header must not steal focus into our bar. Test in Task 4.
4. **Plugin unload or toggle off while on Library:** every marker gone, Steam's bar fully visible and focusable again, focus not stranded in a hidden element. Test in Task 5.
5. **Down/B after the remembered element was removed** (page changed while in our bar): focus lands somewhere visible, never on a detached node. Test in Task 4.

---

### Task 1: The `chromeEveryPage` setting

**Files:**
- Modify: `src/data/settings.ts` (interface `Settings`, `DEFAULTS`, the `pick` list, a setter)
- Modify: `src/components/SettingsPanel.tsx` (toggle below Expanded Home controls, ~line 134)
- Test: `tests/data/settings.test.ts`

**Interfaces:**
- Produces: `Settings.chromeEveryPage: boolean` (default `false`); `settings.setChromeEveryPage(value: boolean): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

```ts
it('defaults On every page to off', () => { expect(settings.get().chromeEveryPage).toBe(false); });
it('saves On every page', async () => { await settings.setChromeEveryPage(true); expect(settings.get().chromeEveryPage).toBe(true); expect(persisted()).toMatchObject({ chromeEveryPage: true }); });
```

Use the file's existing helpers for `persisted()`.

- [ ] **Step 2: Run** `npx vitest run tests/data/settings.test.ts`. Expected: FAIL, `setChromeEveryPage` is not a function.
- [ ] **Step 3: Implement** following `homeExpandedControls` exactly (field, default, `pick`, setter). In `SettingsPanel`, a `ToggleField` labelled `On every page`, description `Use the status bar and footer on every Steam page, not only Home.`, `disabled` unless `enabled && spotlightHome && homeStatusBar && homeExpandedControls`.
- [ ] **Step 4: Run** `npx vitest run tests/data tests/components`. Expected: PASS.
- [ ] **Step 5: Commit** `src/data/settings.ts src/components/SettingsPanel.tsx tests/data/settings.test.ts`, message `Settings: On every page toggle for the status bar and footer`.

### Task 2: Claims store and policy

**Files:**
- Create: `src/chrome/claims.ts`
- Create: `src/chrome/policy.ts`
- Test: `tests/chrome/claims.test.ts`, `tests/chrome/policy.test.ts`

**Interfaces:**
- Produces:
  - `type ChromePage = 'home' | 'game'`
  - `interface ChromeClaim { page: ChromePage; statusHidden: boolean; launching: boolean; returnHome?(): void }`
  - `interface ChromeClaims { get(): readonly ChromeClaim[]; subscribe(listener: () => void): () => void; claim(value: ChromeClaim): { update(next: Partial<ChromeClaim>): void; release(): void } }`
  - `createChromeClaims(): ChromeClaims` and the shared instance `export const chromeClaims = createChromeClaims()`
  - `type ChromeMode = 'off' | 'suspended' | 'active'`
  - `chromeMode(p: { optedIn: boolean; everyPage: boolean; claims: readonly ChromeClaim[]; suspended: boolean }): ChromeMode`
  - `chromeLaunching(claims): boolean` (any claim launching), `chromeStatusHidden(claims): boolean` (any claim hiding), `chromeReturn(claims): (() => void) | undefined` (Home's, when Home has claimed)

- [ ] **Step 1: Write the failing tests**

```ts
// policy
expect(chromeMode({ optedIn: false, everyPage: true, claims: [], suspended: false })).toBe('off');
expect(chromeMode({ optedIn: true, everyPage: false, claims: [], suspended: false })).toBe('off');
expect(chromeMode({ optedIn: true, everyPage: false, claims: [home], suspended: false })).toBe('active');
expect(chromeMode({ optedIn: true, everyPage: true, claims: [], suspended: false })).toBe('active');
expect(chromeMode({ optedIn: true, everyPage: true, claims: [], suspended: true })).toBe('suspended');
// claims
const c = createChromeClaims(), seen = vi.fn(); c.subscribe(seen);
const h = c.claim(home); expect(c.get()).toEqual([home]);
h.update({ statusHidden: true }); expect(c.get()[0].statusHidden).toBe(true);
h.release(); h.release(); expect(c.get()).toEqual([]); expect(seen).toHaveBeenCalledTimes(3);
```

- [ ] **Step 2: Run** `npx vitest run tests/chrome`. Expected: FAIL, modules missing.
- [ ] **Step 3: Implement** both files. `get()` returns a stable array between changes (for `useSyncExternalStore`).
- [ ] **Step 4: Run** `npx vitest run tests/chrome`. Expected: PASS.
- [ ] **Step 5: Commit** both source files and tests, message `Chrome: page claims and the on/off policy`.

### Task 3: Header lease hides by opacity

**Files:**
- Modify: `src/home/homeHeaderDom.ts` (the marks in `update`, `homeHeaderCss`)
- Test: `tests/home/homeHeaderDom.test.ts`

**Interfaces:**
- Produces: `acquireHomeHeader` unchanged in signature; it marks only `data-gh-header="true"`. `homeHeaderCss` becomes `[data-gh-header=true]{opacity:0!important;pointer-events:none!important}` (descendants inherit).

- [ ] **Step 1: Update the tests** so they assert the bar gets `data-gh-header="true"` and does **not** get `inert`, `aria-hidden` or `tabindex` on itself or descendants, and that `homeHeaderCss` contains `opacity:0` and not `visibility`.
- [ ] **Step 2: Run** `npx vitest run tests/home/homeHeaderDom.test.ts`. Expected: FAIL on the `inert` assertion.
- [ ] **Step 3: Implement**: drop the `inert`, `aria-hidden` and per-node `tabindex` claims; change the CSS.
- [ ] **Step 4: Run** `npx vitest run tests/home`. Expected: PASS. Fix any Home test that relied on `inert` to mean "covered" by checking `data-gh-header` instead.
- [ ] **Step 5: Commit**, message `Header lease: hide Steam's bar by opacity so its focus targets stay`.

### Task 4: Header focus redirect

**Files:**
- Create: `src/chrome/headerRedirect.ts`
- Test: `tests/chrome/headerRedirect.test.ts`

**Interfaces:**
- Consumes: `findTopBar(doc, width)`, `focusInTopBar(bar, active)` from `src/home/topBar.ts`.
- Produces: `installHeaderRedirect(doc: Document, o: { enabled(): boolean; enter(): boolean; inOurBar(target: Element | null): boolean; busy(): boolean }): { leave(fallback?: () => void): void; dispose(): void }`
  - On `focusin` whose target is inside Steam's top bar while `enabled()` and not `busy()`: remember `event.relatedTarget` (when it's an element outside both bars) and call `enter()`.
  - `leave()`: focus the remembered element if it's still connected and visible; else call `fallback`; else do nothing. Clears the memory.

- [ ] **Step 1: Write the failing tests** (linkedom page with a top bar containing an `[class*=avatarHolder]` and an input, sized by stubbed rects as in `tests/home/topBar.test.ts`):

```ts
it('moves focus from Steam's header into ours and remembers where it came from', ...)      // enter called once; leave() focuses the card
it('does nothing while disabled', ...)                                                    // enter not called
it('does not take focus while the Search keyboard is open', ...)                          // busy() true → enter not called  (Review Focus 3)
it('does not bounce when focus comes from our own bar', ...)                              // relatedTarget in our bar → memory unchanged, enter called at most once per focusin, no loop (Review Focus 2)
it('falls back when the remembered element is gone', ...)                                 // remove the card, leave(fallback) → fallback called, no focus on a detached node (Review Focus 5)
it('removes its listener on dispose', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/chrome/headerRedirect.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** with one `focusin` listener on `doc` (capture). Visibility check: reuse `visibleHomeControl` from `src/home/useHomeControls.ts`.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit**, message `Chrome: redirect Steam's header focus into our bar and back`.

### Task 5: `ChromeHost` controller and component

**Files:**
- Create: `src/chrome/useChrome.ts` (the controller hook: leases, focus, Search, step-aside)
- Create: `src/chrome/ChromeHost.tsx` (global component: marker span for the window, renders bar, Search and CSS)
- Modify: `src/index.tsx` (add/remove global component `GameGlanceChrome`)
- Test: `tests/chrome/useChrome.test.ts`

**Interfaces:**
- Consumes: Task 1 setting; Task 2 `chromeClaims`, `chromeMode`, helpers; Task 3 `acquireHomeHeader`; Task 4 `installHeaderRedirect`; existing `acquireHomeFooter`, `createHomeStatusFocus`, `homeRuntimeSuspended` inputs (minus `opening`), `createHomeSearch`, `HomeSearch`, `GameStatusBar`, `homeControlsCss`, `subscribeSteamUiState`, `getSteamUiState`.
- Produces:
  - `useChrome(doc: Document | null): { mode: ChromeMode; controls: HomeStatusControls | undefined; actionUp(event: GamepadEvent): boolean; ownsInput(): boolean; search: HomeSearchSession; footer: boolean; statusHidden: boolean }` (`HomeSearchSession` from `src/home/homeSearch.ts`)
  - Suspension inputs are today's `homeRuntimeSuspended` inputs without `opening`, plus `screensaver`, read with `useScreensaverActive()` from `src/screensaver/steamScreensaver.ts`.
  - `export const chromeFocus: { actionUp(event: GamepadEvent): boolean }`, a module-level bridge that `useChrome` fills, for Home's Up-from-actions entry (Task 6).
  - `export function chromeOwnsBar(): boolean`, true while mode is `active` (read by Home, the game page and the menu holds).
  - `ChromeHost`: renders nothing while `off`; otherwise `<style>{homeControlsCss}</style>`, `GameStatusBar` with `controls`, `hidden={statusHidden}`, `replacement`, and `HomeSearch` bound to the host's search store.

Port from `useHomeControls` the parts that are not Home-specific (lease acquire/suspend/dispose, header after footer ready, `ready` gating, `focus.setActive`); drop `mounted`, `opening`, `carry`, `handover`, `footerShownIn`. The root for both leases is `doc.documentElement` (measured against the viewport, as `usePageFooter` does today).

- [ ] **Step 1: Write the failing tests** (render a tiny component calling `useChrome(doc)` against the `#Footer` + header fixture from `tests/home/pageFooter.test.ts`):

```ts
it('takes the footer and header on any page when On every page is on', ...)          // no claims, everyPage → marks present, footer true
it('only with a Home or game claim when it is off', ...)                              // no claims → none; claim('home') → marks
it('keeps them across a route change: no release, no re-acquire', ...)                // swap claims home→none with everyPage on → attribute never removed (MutationObserver spy records zero removals)
it('re-marks a remounted footer before paint', ...)                                   // replace #Footer with a fresh identical node → marked after one microtask flush (Review Focus 1)
it('steps aside with a side menu open and comes back', ...)                           // stub steam UI state menu:true → no marks; false → marks
it('steps aside while Steam's screensaver is on', ...)                                // stub useScreensaverActive true → no marks
it('gives everything back on unmount and when the toggle goes off', ...)              // unmount → no data-gh-* attributes anywhere, header opacity rule gone (Review Focus 4)
it('hides our bar while Home's feed sheet covers it', ...)                            // claim statusHidden:true → statusHidden true
```

- [ ] **Step 2: Run** `npx vitest run tests/chrome/useChrome.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** `useChrome`, `ChromeHost` and the `index.tsx` registration (`routerHook.addGlobalComponent('GameGlanceChrome', ChromeHost)` after the screensaver line; `['chrome remove', () => routerHook.removeGlobalComponent('GameGlanceChrome')]` in `onDismount`). The redirect's `enter` calls the status focus's first entry (Search when present); `busy` is `search.get().phase === 'editing'`; `leave` runs on Down/B from the status focus, with `chromeReturn(claims)` as the fallback when Home has claimed.
- [ ] **Step 4: Run** `npx vitest run tests/chrome` then `npx tsc --noEmit -p .`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit**, message `Chrome: one host for the status bar, Search and footer on every page`.

### Task 6: Home and the game page claim instead of owning

**Files:**
- Modify: `src/home/SpotlightHome.tsx` (replace `useHomeControls` leases, `HomeSearch` and `GameStatusBar` rendering with a claim; Up entry via `chromeFocus.actionUp`)
- Modify: `src/home/useHomeControls.ts` (reduce to what Home still needs, or delete if nothing remains; keep exported pure helpers used elsewhere: `homeRuntimeSuspended`, `homeFooterSuspended`, `footerOptedIn`, `visibleHomeControl`, `homeReturnTarget`, `createHomeStatusFocus`)
- Modify: `src/components/GameHero.tsx` (claim `{ page: 'game' }` while mounted; drop `usePageFooter` and its `<style>`; skip its own `GameStatusBar` while `chromeOwnsBar()`)
- Delete: `src/home/usePageFooter.ts`; `footerHeld` in `src/home/homeControlsDom.ts` if unused
- Test: `tests/home/pageFooter.test.ts` (rewrite to the claim model), `tests/home/homeKeyboardRuntime.test.ts` and other Home tests as they break

**Interfaces:**
- Consumes: Task 2 `chromeClaims.claim`; Task 5 `chromeFocus`, `chromeOwnsBar`.
- Produces: nothing new.

- [ ] **Step 1: Rewrite the tests**:

```ts
it('Home claims while mounted, with its feed sheet state and return target', ...)    // claim page 'home', statusHidden follows sheetUp, returnHome focuses Play/recents
it('the game page claims while mounted and releases on unmount', ...)
it('Home with the host off still shows its read-only status bar as before', ...)     // Status bar on, Expanded off → Home renders GameStatusBar itself
```

- [ ] **Step 2: Run** `npx vitest run tests/home tests/components`. Expected: FAIL on the new claims.
- [ ] **Step 3: Implement.** Home keeps rendering `GameStatusBar` itself only when `!chromeOwnsBar()` (Status bar on, Expanded off: today's read-only bar).
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: all PASS.
- [ ] **Step 5: Commit**, message `Home and game page: claim the chrome host instead of holding leases`.

### Task 7: The custom menu's holds follow the host

**Files:**
- Modify: `src/menu/host.tsx` (`pageFooterEnabled`, the `holdPageFooter`/`holdPageStatus` calls)
- Modify: `src/menu/pageFooter.ts` (`pageFooterCanRestore`: true while `chromeOwnsBar()` instead of looking for `.gh-root,.gg-hero`)
- Test: `tests/menu/pageFooter.test.ts`, `tests/menu/host.test.ts`

**Interfaces:**
- Consumes: Task 5 `chromeOwnsBar`.

- [ ] **Step 1: Write the failing test**: with the host active on a Library-like page (no `.gh-root`), opening the menu holds the footer look and the page status, as on Home today; with the host off, the holds behave as before.
- [ ] **Step 2: Run** `npx vitest run tests/menu`. Expected: FAIL.
- [ ] **Step 3: Implement.** The hold applies wherever the host is active, not only `menuOverHome`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit**, message `Menu: hold the page's bar and footer wherever the chrome host is active`.

### Task 8: Ally check, every page

**Files:**
- Modify: the spec's status line and a new "Ally check" section listing results.

- [ ] **Step 1:** `npm run build`; back up the Ally's `index.js` as `~/gg-backup-index-<md5 prefix>-<date>.js`; confirm `IsAnySideMenuVisible()` is `false`; `scp`; compare md5; IIFE plugin reload.
- [ ] **Step 2:** Turn on On every page. Arm the footer recorder (records `#Footer` `data-gh-footer` and background per frame) and the header recorder (records `data-gh-header` and `nativeHeaderFocused`).
- [ ] **Step 3:** With Michael, for each page: Library and its tabs, Collections, Downloads, Media, Store, Settings, own profile, a friend's profile, a game page, Home. Each without and then with a game running. On each: arrive (recorder: no frame of Steam's footer look; header never visible), press Up (focus lands on our Search), Left/Right, Down/B (focus back where it was).
- [ ] **Step 4:** Record results in the spec: the pages where Up never reaches Steam's header, and anything else that did not behave.
- [ ] **Step 5:** Toggle On every page off and check Home and the game page still behave as before, and Library shows Steam's own bar and footer.
