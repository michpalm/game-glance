# Plugins Section Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The menu's Plugins section lists every installed Decky plugin, and Game Glance opens inside our menu with its settings grouped in six categories (drill-in), the same grouping Decky's panel gets.

**Architecture:** Pure modules decide everything (which plugins, in which order; which rows each category shows; each card's summary; where focus returns after B). Pure view components draw from plain values and callbacks, so tests call them as functions. One container component (`PluginsSection`) holds every hook and store and passes values and callbacks down. `MenuShell` renders the container for the `plugins` section.

**Tech Stack:** TypeScript, React 18 (Steam's), `@decky/ui` (`Focusable`, `DialogButton`, `ToggleField`), `react-icons/lu`, Vitest (node, no DOM rendering).

**Spec:** `docs/superpowers/specs/2026-11-03-plugins-settings-design.md` (read it first). Mockups: https://claude.ai/artifact/Fqep53QY5eNze2SB3EKvZg

**Written for a smaller model (Michael's choice: Haiku).** Every file is given in full or as an exact replacement. Copy the code exactly; do not redesign. If something in the repo does not match what a step says (a name, an import path), stop and report it instead of guessing.

## How to work in this repo

- Repo root (run every command from here): `~/.codex/worktrees/social-chat/game-glance-2.1`. Branch: `feature/plugins-settings`. Never switch branches.
- Run one test file: `npx vitest run tests/menu/views.test.ts`
- Run all tests: `npx vitest run` (2,620+ tests). One known flaky test: `homeKeyboardRuntime` "hides navigation…" can fail under full-suite load and passes alone; rerun it alone with `npx vitest run tests/home/homeKeyboardRuntime.test.ts` before treating it as a failure.
- Typecheck: `npx tsc --noEmit` (must print nothing).
- Build: `npx rollup -c` (must end without errors).
- Commit (copy exactly; only the message changes):

```bash
git -c user.name="Michael Palma" -c user.email="18511803+michpalm@users.noreply.github.com" commit --author="Michael Palma <18511803+michpalm@users.noreply.github.com>" -m "<message>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- Never push. Never touch a device. Never call Steam functions in tests.
- Code style: match the file you edit. 4-space indents. Single quotes. Semicolons. Comments are rare and say why, not what.
- Tests never render React. They call a component as a plain function and walk the returned element tree with a `tree()` helper (given in each test). That only works for components **without hooks**, which is why views are pure.

## Global Constraints

- No setting is added, removed or renamed in storage (`src/data/settings.ts` and `src/menu/preferences.ts` keep their keys and setters).
- The only call into Decky is `DeckyPluginLoader.deckyState.setActivePlugin(name)`. Everything else read from `DeckyPluginLoader` is a plain property read, guarded against missing or wrong types.
- View ids on the menu stack: `game-glance`, `gg:<category>`, `gg:home:row`. Focus keys: `plugins:<plugin name>`, `gg:card:<category>`, `gg:<category>:<row>`.
- Category ids, in this order: `home`, `game-page`, `status-bar`, `menu`, `screensaver`, `general`. Labels: Home, Game page, Status bar & footer, Menu, Screensaver, General.
- User-visible copy is exactly as written in this plan.

## Review Focus

1. Decky's order list has duplicates and names of plugins that are not loaded (seen on the Ally: "Animation Changer" three times, "Deck Shelves" disabled). Expect each loaded plugin once. Pinned by Task 3 tests.
2. A plugin whose `icon` is not a React element (a plain object) must not crash the list. Pinned by a Task 3 test (`icon` becomes `null`).
3. After B from a category page, focus lands on that category's card, not the first card. Pinned by Task 1 tests.
4. With Spotlight Home off, the Status bar & footer page shows only its explanation line, and the Home page shows only the Spotlight Home toggle. Pinned by Task 2 and Task 6 tests.
5. Turning off "Game Glance" or "Game Glance menu" from inside the menu closes the menu. This needs no code: `startMenu.ts` already releases the menu when either value turns off (line `if (... !masterSettings.get().enabled || !preferences.get().enabled) { release(); return; }`). Checked on the device in Task 9.

## File map

| File | Task | What it holds |
|---|---|---|
| `src/menu/views.ts` (new) | 1 | View ids and the focus key B returns to |
| `src/menu/model.ts` (edit) | 1 | `back` restores that focus key |
| `src/data/settingsCategories.ts` (new) | 2 | Categories, rows per category, summaries, HowLongToBeat match line |
| `src/menu/steam/deckyPlugins.ts` (new) | 3 | Plugin list from Decky; open one plugin |
| `src/menu/components/SettingRows.tsx` (new) | 4 | `Crumb`, `ToggleRow`, `SegmentRow` |
| `src/home/heroFit.ts` (edit) | 4 | `HERO_FIT_COPY` moves here from `SettingsPanel.tsx` |
| `src/menu/components/gameGlanceTypes.ts` (new) | 5 | `GgValues`, `GgActions`, `PageProps` |
| `src/menu/components/PluginsList.tsx` (new) | 5 | The Plugins page |
| `src/menu/components/GameGlanceViews.tsx` (new) | 5 | The six-card grid |
| `src/menu/components/GameGlancePages.tsx` (new) | 6 | The six category pages and the Games row picker |
| `src/components/UpdatesSection.tsx` (edit) | 7 | Export `updateLine` |
| `src/menu/components/PluginsSection.tsx` (new) | 7 | The container: hooks, stores, callbacks |
| `src/menu/pluginStyles.ts` (new) | 7 | CSS for the new views |
| `src/menu/components/MenuShell.tsx` (edit) | 7 | Render `PluginsSection`, add the CSS |
| `src/components/SettingsPanel.tsx` (edit) | 8 | Decky panel regrouped in the same six sections |
| `src/menu/components/MenuPreferences.tsx` (edit) | 8 | Section title "Menu" |
| `src/components/settingsRows.ts`, `tests/components/settingsRows.test.ts` (delete) | 8 | Replaced by `settingsCategories.ts` |

---

### Task 1: View ids and focus return after B

**Files:**
- Create: `src/menu/views.ts`
- Modify: `src/menu/model.ts` (the `case 'back':` branch of `reduceMenu`)
- Test: `tests/menu/views.test.ts` (new)

**Interfaces:**
- Produces: `GAME_GLANCE_VIEW = 'game-glance'`, `HOME_ROW_VIEW = 'gg:home:row'`, `categoryView(id: string): string`, `pluginFocusKey(name: string): string`, `returnFocusKey(viewId: string | undefined): string | null`.

- [ ] **Step 1: Write the failing test** `tests/menu/views.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { categoryView, GAME_GLANCE_VIEW, HOME_ROW_VIEW, pluginFocusKey, returnFocusKey } from '../../src/menu/views';
import { defaultMenuState, reduceMenu, type MenuState } from '../../src/menu/model';

function openOnPlugins(): MenuState {
    let state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
    state = reduceMenu(state, { type: 'open', entry: 'home' });
    return reduceMenu(state, { type: 'select', section: 'plugins' });
}

describe('menu views for the Plugins section', () => {
    it('names the views', () => {
        expect(GAME_GLANCE_VIEW).toBe('game-glance');
        expect(HOME_ROW_VIEW).toBe('gg:home:row');
        expect(categoryView('status-bar')).toBe('gg:status-bar');
        expect(pluginFocusKey('Game Glance')).toBe('plugins:Game Glance');
    });
    it('returns focus to the row, card or plugin that opened a view', () => {
        expect(returnFocusKey('game-glance')).toBe('plugins:Game Glance');
        expect(returnFocusKey('gg:home')).toBe('gg:card:home');
        expect(returnFocusKey('gg:game-page')).toBe('gg:card:game-page');
        expect(returnFocusKey('gg:home:row')).toBe('gg:home:games');
    });
    it('leaves other views alone', () => {
        expect(returnFocusKey('configure-menu')).toBeNull();
        expect(returnFocusKey('notifications')).toBeNull();
        expect(returnFocusKey(undefined)).toBeNull();
    });
});

describe('back inside the Plugins section', () => {
    it('pops the view and focuses the card it came from', () => {
        let state = openOnPlugins();
        state = reduceMenu(state, { type: 'push', viewId: 'game-glance' });
        state = reduceMenu(state, { type: 'push', viewId: 'gg:screensaver' });
        state = reduceMenu(state, { type: 'focus', section: 'plugins', key: 'gg:screensaver:enabled' });
        state = reduceMenu(state, { type: 'back' });
        expect(state.stack).toEqual(['game-glance']);
        expect(state.focus.plugins).toBe('gg:card:screensaver');
        state = reduceMenu(state, { type: 'back' });
        expect(state.stack).toEqual([]);
        expect(state.focus.plugins).toBe('plugins:Game Glance');
        expect(state.phase).toBe('custom-open');
    });
    it('keeps the remembered focus when the popped view has no return key', () => {
        let state = openOnPlugins();
        state = reduceMenu(state, { type: 'push', viewId: 'other-view' });
        state = reduceMenu(state, { type: 'focus', section: 'plugins', key: 'plugins:Unifideck' });
        state = reduceMenu(state, { type: 'back' });
        expect(state.focus.plugins).toBe('plugins:Unifideck');
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/menu/views.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/menu/views".

- [ ] **Step 3: Create `src/menu/views.ts`**:

```ts
/** View ids the Plugins section pushes on the menu stack, and where focus returns when B leaves each one. */
export const GAME_GLANCE_VIEW = 'game-glance';
export const HOME_ROW_VIEW = 'gg:home:row';

export function categoryView(id: string): string {
    return `gg:${id}`;
}

export function pluginFocusKey(name: string): string {
    return `plugins:${name}`;
}

/** The focus key B returns to after leaving `viewId`, or null to keep the one the menu remembered. */
export function returnFocusKey(viewId: string | undefined): string | null {
    if (viewId === GAME_GLANCE_VIEW) return pluginFocusKey('Game Glance');
    if (viewId === HOME_ROW_VIEW) return 'gg:home:games';
    const category = /^gg:([a-z-]+)$/.exec(viewId ?? '');
    return category ? `gg:card:${category[1]}` : null;
}
```

- [ ] **Step 4: Edit `src/menu/model.ts`**

Add this import as the first line of the file:

```ts
import { returnFocusKey } from './views';
```

Replace exactly this line inside `case 'back':`

```ts
            if (state.stack.length) return { ...state, stack: state.stack.slice(0, -1) };
```

with:

```ts
            if (state.stack.length) {
                const key = returnFocusKey(state.stack[state.stack.length - 1]);
                return { ...state, stack: state.stack.slice(0, -1), ...(key ? { focus: { ...state.focus, [state.section]: key } } : {}) };
            }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/menu/views.test.ts tests/menu/model.test.ts`
Expected: PASS, both files.

- [ ] **Step 6: Commit**

```bash
git add src/menu/views.ts src/menu/model.ts tests/menu/views.test.ts
```
Commit message: `menu: view ids for the Plugins section; B returns focus to the card or plugin that opened a view`

---

### Task 2: Categories, rows and summaries

**Files:**
- Create: `src/data/settingsCategories.ts`
- Test: `tests/data/settingsCategories.test.ts` (new)

**Interfaces:**
- Consumes: `Settings` from `src/data/settings.ts`; `RowStyle` from `src/home/recentsLayout.ts`; `HltbResult` from `src/data/hltb.ts`; `SocialKeyboardMode` from `src/menu/preferences.ts`.
- Produces:
  - `type CategoryId = 'home' | 'game-page' | 'status-bar' | 'menu' | 'screensaver' | 'general'`
  - `CATEGORY_IDS: readonly CategoryId[]`, `CATEGORY_LABELS: Record<CategoryId, string>`
  - `type HomeRow`, `homeRows(s, collectionRow): HomeRow[]`
  - `type StatusRow`, `statusRows(s): StatusRow[]`
  - `everyPageAvailable(s): boolean`
  - `ROW_STYLE_LABELS: Record<RowStyle, string>`
  - `interface SummaryContext { rowName: string; screensaverAvailable: boolean; menuEnabled: boolean; socialKeyboard: SocialKeyboardMode }`
  - `categorySummary(id, s, context): string`
  - `matchLine(overrideId: number | null, hltb: HltbResult | undefined): string`

First check that `src/data/hltb.ts` exports `HltbResult` with `status: 'found'` carrying `gameId: number`, and `status: 'notFound'`: run `grep -n "export type HltbResult\|export interface HltbResult" -A6 src/data/hltb.ts`. If it does not, stop and report.

- [ ] **Step 1: Write the failing test** `tests/data/settingsCategories.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, CATEGORY_LABELS, categorySummary, everyPageAvailable, homeRows, matchLine, statusRows, type SummaryContext } from '../../src/data/settingsCategories';
import type { Settings } from '../../src/data/settings';

const on: Settings = {
    enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: false, cleanPage: false, homeStatusBar: true,
    homeExpandedControls: true, chromeEveryPage: false, statusAvatar: false, gameLogo: false, homeRow: 'recent',
    homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', pageShading: 'bottom',
    feedTabs: { news: true, friends: true, recommended: true },
    screensaver: { enabled: false, logo: true, statusBar: true, stats: true } as Settings['screensaver'],
};
const context: SummaryContext = { rowName: 'Recent games', screensaverAvailable: true, menuEnabled: true, socialKeyboard: 'compact' };

describe('categories', () => {
    it('lists the six categories in order with their labels', () => {
        expect(CATEGORY_IDS).toEqual(['home', 'game-page', 'status-bar', 'menu', 'screensaver', 'general']);
        expect(CATEGORY_IDS.map(id => CATEGORY_LABELS[id])).toEqual(['Home', 'Game page', 'Status bar & footer', 'Menu', 'Screensaver', 'General']);
    });
});

describe('homeRows (a row shows while the row it depends on is on)', () => {
    it('lists every row in order with everything on and a collection row', () =>
        expect(homeRows(on, true)).toEqual(['spotlightHome', 'gamesRow', 'rowSort', 'rowStyle', 'grayUninstalled', 'news', 'friends', 'recommended', 'wishlistDeals']));
    it('has no sort for the recent games row', () => expect(homeRows(on, false)).not.toContain('rowSort'));
    it('shows only the main toggle with Spotlight Home off', () => expect(homeRows({ ...on, spotlightHome: false }, true)).toEqual(['spotlightHome']));
    it('hides wishlist deals with Recommended off', () =>
        expect(homeRows({ ...on, feedTabs: { ...on.feedTabs, recommended: false } }, false)).not.toContain('wishlistDeals'));
    it('keeps the tab switches with all tabs off', () =>
        expect(homeRows({ ...on, feedTabs: { news: false, friends: false, recommended: false } }, false)).toEqual(expect.arrayContaining(['news', 'friends', 'recommended'])));
});

describe('statusRows', () => {
    it('lists every row with the status bar on', () => expect(statusRows(on)).toEqual(['statusBar', 'statusAvatar', 'expandedControls', 'everyPage']));
    it('shows only the status bar switch with the status bar off', () => expect(statusRows({ ...on, homeStatusBar: false })).toEqual(['statusBar']));
    it('shows nothing with Spotlight Home off', () => expect(statusRows({ ...on, spotlightHome: false })).toEqual([]));
    it('enables On every page only with Game Glance, Spotlight Home, the status bar and expanded controls on', () => {
        expect(everyPageAvailable(on)).toBe(true);
        expect(everyPageAvailable({ ...on, homeExpandedControls: false })).toBe(false);
        expect(everyPageAvailable({ ...on, enabled: false })).toBe(false);
    });
});

describe('categorySummary', () => {
    it('summarises Home', () => {
        expect(categorySummary('home', on, context)).toBe('On · Recent games · Steam row');
        expect(categorySummary('home', { ...on, homeRowStyle: 'minimal' }, { ...context, rowName: 'Backlog' })).toBe('On · Backlog · Minimal row');
        expect(categorySummary('home', { ...on, spotlightHome: false }, context)).toBe('Off');
    });
    it('summarises the game page', () => {
        expect(categorySummary('game-page', on, context)).toBe('Full look');
        expect(categorySummary('game-page', { ...on, cleanPage: true }, context)).toBe('Clean look');
    });
    it('summarises the status bar and footer', () => {
        expect(categorySummary('status-bar', on, context)).toBe('Status bar on');
        expect(categorySummary('status-bar', { ...on, chromeEveryPage: true }, context)).toBe('Status bar on · Every page');
        expect(categorySummary('status-bar', { ...on, homeStatusBar: false, chromeEveryPage: true }, context)).toBe('Status bar off');
        expect(categorySummary('status-bar', { ...on, spotlightHome: false }, context)).toBe('Needs Spotlight Home');
    });
    it('summarises the menu', () => {
        expect(categorySummary('menu', on, context)).toBe('Game Glance menu on · Compact keyboard');
        expect(categorySummary('menu', on, { ...context, socialKeyboard: 'radial' })).toBe('Game Glance menu on · Radial keyboard');
        expect(categorySummary('menu', on, { ...context, menuEnabled: false })).toBe('Game Glance menu off');
    });
    it('summarises the screensaver', () => {
        expect(categorySummary('screensaver', on, context)).toBe('Off');
        expect(categorySummary('screensaver', { ...on, screensaver: { ...on.screensaver, enabled: true } }, context)).toBe('On');
        expect(categorySummary('screensaver', on, { ...context, screensaverAvailable: false })).toBe('Needs a newer Steam');
    });
    it('summarises General', () => expect(categorySummary('general', on, context)).toBe('Look, data and updates'));
});

describe('matchLine', () => {
    it('names the override, the automatic match, no match, or nothing yet', () => {
        expect(matchLine(123, undefined)).toBe('Override: HowLongToBeat #123');
        expect(matchLine(null, { status: 'found', gameId: 456 } as never)).toBe('Automatic: HowLongToBeat #456');
        expect(matchLine(null, { status: 'notFound' } as never)).toBe('Automatic: no match');
        expect(matchLine(null, undefined)).toBe('Automatic');
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/data/settingsCategories.test.ts`
Expected: FAIL, cannot resolve `../../src/data/settingsCategories`.

- [ ] **Step 3: Create `src/data/settingsCategories.ts`**:

```ts
import type { RowStyle } from '../home/recentsLayout';
import type { SocialKeyboardMode } from '../menu/preferences';
import type { HltbResult } from './hltb';
import type { Settings } from './settings';

/** Game Glance's settings grouped by the place they change, shared by our menu and Decky's panel. */
export type CategoryId = 'home' | 'game-page' | 'status-bar' | 'menu' | 'screensaver' | 'general';
export const CATEGORY_IDS: readonly CategoryId[] = ['home', 'game-page', 'status-bar', 'menu', 'screensaver', 'general'];
export const CATEGORY_LABELS: Record<CategoryId, string> = {
    home: 'Home', 'game-page': 'Game page', 'status-bar': 'Status bar & footer', menu: 'Menu', screensaver: 'Screensaver', general: 'General',
};

export type HomeRow = 'spotlightHome' | 'gamesRow' | 'rowSort' | 'rowStyle' | 'grayUninstalled' | 'news' | 'friends' | 'recommended' | 'wishlistDeals';

/** Home's rows in display order; with Spotlight Home off only its toggle. A collection row has a sort order; wishlist deals depend on Recommended. */
export function homeRows(s: Pick<Settings, 'spotlightHome' | 'feedTabs'>, collectionRow: boolean): HomeRow[] {
    const rows: HomeRow[] = ['spotlightHome'];
    if (!s.spotlightHome) return rows;
    rows.push('gamesRow');
    if (collectionRow) rows.push('rowSort');
    rows.push('rowStyle', 'grayUninstalled', 'news', 'friends', 'recommended');
    if (s.feedTabs.recommended) rows.push('wishlistDeals');
    return rows;
}

export type StatusRow = 'statusBar' | 'statusAvatar' | 'expandedControls' | 'everyPage';

/** The status bar and footer need Spotlight Home; the rest need the status bar. */
export function statusRows(s: Pick<Settings, 'spotlightHome' | 'homeStatusBar'>): StatusRow[] {
    if (!s.spotlightHome) return [];
    return s.homeStatusBar ? ['statusBar', 'statusAvatar', 'expandedControls', 'everyPage'] : ['statusBar'];
}

/** On every page can be switched only while everything it builds on is on (its saved value is kept otherwise). */
export function everyPageAvailable(s: Pick<Settings, 'enabled' | 'spotlightHome' | 'homeStatusBar' | 'homeExpandedControls'>): boolean {
    return s.enabled && s.spotlightHome && s.homeStatusBar && s.homeExpandedControls;
}

export const ROW_STYLE_LABELS: Record<RowStyle, string> = { steam: 'Steam', spotlight: 'Spotlight', minimal: 'Minimal' };

export interface SummaryContext {
    rowName: string;
    screensaverAvailable: boolean;
    menuEnabled: boolean;
    socialKeyboard: SocialKeyboardMode;
}

/** The one line under a category's card: what that place shows now. */
export function categorySummary(id: CategoryId, s: Settings, c: SummaryContext): string {
    switch (id) {
        case 'home': return s.spotlightHome ? `On · ${c.rowName} · ${ROW_STYLE_LABELS[s.homeRowStyle]} row` : 'Off';
        case 'game-page': return s.cleanPage ? 'Clean look' : 'Full look';
        case 'status-bar':
            if (!s.spotlightHome) return 'Needs Spotlight Home';
            return `Status bar ${s.homeStatusBar ? 'on' : 'off'}${s.homeStatusBar && s.chromeEveryPage ? ' · Every page' : ''}`;
        case 'menu': return c.menuEnabled ? `Game Glance menu on · ${c.socialKeyboard === 'radial' ? 'Radial' : 'Compact'} keyboard` : 'Game Glance menu off';
        case 'screensaver':
            if (!c.screensaverAvailable) return 'Needs a newer Steam';
            return s.screensaver.enabled ? 'On' : 'Off';
        case 'general': return 'Look, data and updates';
    }
}

/** The HowLongToBeat match line for the current game. */
export function matchLine(overrideId: number | null, hltb: HltbResult | undefined): string {
    if (overrideId !== null) return `Override: HowLongToBeat #${overrideId}`;
    if (hltb?.status === 'found') return `Automatic: HowLongToBeat #${hltb.gameId}`;
    if (hltb?.status === 'notFound') return 'Automatic: no match';
    return 'Automatic';
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run tests/data/settingsCategories.test.ts && npx tsc --noEmit`
Expected: PASS, and tsc prints nothing. If tsc says `screensaver` in the test literal is missing fields, open `src/screensaver/options.ts`, copy the real `SCREENSAVER_DEFAULTS` fields into the test's `screensaver` object instead of the `as` cast, and rerun.

- [ ] **Step 5: Commit**

```bash
git add src/data/settingsCategories.ts tests/data/settingsCategories.test.ts
```
Commit message: `settings: six categories by place, their rows and one-line summaries`

---

### Task 3: Decky's plugin list

**Files:**
- Create: `src/menu/steam/deckyPlugins.ts`
- Test: `tests/menu/deckyPlugins.test.ts` (new)

**Interfaces:**
- Produces: `interface DeckyPlugin { name: string; version: string; icon: ReactElement | null }`, `interface DeckyLoaderLike`, `deckyLoader(): DeckyLoaderLike | null`, `listDeckyPlugins(loader?): DeckyPlugin[] | null`, `activateDeckyPlugin(name, loader?): void`.

Facts read on the Ally (2026-11-03): `DeckyPluginLoader.plugins` is an array of `{ name, version, icon, content, titleView, ... }`; `DeckyPluginLoader.deckyState._pluginOrder` is a string array that can hold duplicates and names that are not loaded; `deckyState._hiddenPlugins` is a string array; `deckyState.setActivePlugin(name)` does `this._activePlugin = this._plugins.find(p => p.name === name) ?? null; this.notifyUpdate();`.

- [ ] **Step 1: Write the failing test** `tests/menu/deckyPlugins.test.ts`:

```ts
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { activateDeckyPlugin, listDeckyPlugins } from '../../src/menu/steam/deckyPlugins';

const icon = createElement('svg');
const plugin = (name: string, extra: Record<string, unknown> = {}) => ({ name, version: '1.0', icon, ...extra });

describe('listDeckyPlugins', () => {
    it('orders loaded plugins by Decky’s order, once each, then the rest in load order', () => {
        const loader = { plugins: [plugin('Ambideck'), plugin('Game Glance'), plugin('Unifideck'), plugin('Animation Changer')],
            deckyState: { _pluginOrder: ['Unifideck', 'Animation Changer', 'Animation Changer', 'Deck Shelves', 'Game Glance'], _hiddenPlugins: [] } };
        expect(listDeckyPlugins(loader)!.map(p => p.name)).toEqual(['Unifideck', 'Animation Changer', 'Game Glance', 'Ambideck']);
    });
    it('leaves out hidden plugins', () => {
        const loader = { plugins: [plugin('A'), plugin('B')], deckyState: { _pluginOrder: ['A', 'B'], _hiddenPlugins: ['A'] } };
        expect(listDeckyPlugins(loader)!.map(p => p.name)).toEqual(['B']);
    });
    it('keeps name, version and a React icon; drops an icon that is not an element', () => {
        const loader = { plugins: [plugin('A'), plugin('B', { icon: { not: 'an element' }, version: 7 })], deckyState: {} };
        const [a, b] = listDeckyPlugins(loader)!;
        expect(a).toEqual({ name: 'A', version: '1.0', icon });
        expect(b).toEqual({ name: 'B', version: '', icon: null });
    });
    it('skips entries without a name and tolerates a missing state', () => {
        const loader = { plugins: [null, { version: '1' }, plugin('A')] };
        expect(listDeckyPlugins(loader)!.map(p => p.name)).toEqual(['A']);
    });
    it('returns null when the loader or its list cannot be read', () => {
        expect(listDeckyPlugins(null)).toBeNull();
        expect(listDeckyPlugins({ plugins: 'nope' })).toBeNull();
    });
});

describe('activateDeckyPlugin', () => {
    it('sets Decky’s active plugin by name, with the state as this', () => {
        const state = { _activePlugin: null as unknown, setActivePlugin: vi.fn(function (this: { _activePlugin: unknown }, name: string) { this._activePlugin = name; }) };
        activateDeckyPlugin('Unifideck', { plugins: [], deckyState: state });
        expect(state.setActivePlugin).toHaveBeenCalledWith('Unifideck');
        expect(state._activePlugin).toBe('Unifideck');
    });
    it('does nothing without a setter, and never throws', () => {
        expect(() => activateDeckyPlugin('A', null)).not.toThrow();
        expect(() => activateDeckyPlugin('A', { deckyState: {} })).not.toThrow();
        expect(() => activateDeckyPlugin('A', { deckyState: { setActivePlugin: () => { throw Error('x'); } } })).not.toThrow();
    });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/menu/deckyPlugins.test.ts`
Expected: FAIL, cannot resolve `../../src/menu/steam/deckyPlugins`.

- [ ] **Step 3: Create `src/menu/steam/deckyPlugins.ts`**:

```ts
import { isValidElement, type ReactElement } from 'react';

/** A loaded Decky plugin as the menu's Plugins page lists it. */
export interface DeckyPlugin {
    name: string;
    version: string;
    icon: ReactElement | null;
}
export interface DeckyLoaderLike {
    plugins?: unknown;
    deckyState?: { _pluginOrder?: unknown; _hiddenPlugins?: unknown; setActivePlugin?: unknown };
}

export function deckyLoader(): DeckyLoaderLike | null {
    const loader = (globalThis as { DeckyPluginLoader?: unknown }).DeckyPluginLoader;
    return loader && typeof loader === 'object' ? loader as DeckyLoaderLike : null;
}

const names = (value: unknown): string[] => Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string') : [];

/**
 * Loaded plugins in Decky's own order: its order list first (it can repeat names and hold plugins that are not
 * loaded), then any loaded plugin it does not name, in load order. Hidden plugins are left out, as Decky's list does.
 * Null when the loader's list cannot be read.
 */
export function listDeckyPlugins(loader: DeckyLoaderLike | null = deckyLoader()): DeckyPlugin[] | null {
    if (!loader || !Array.isArray(loader.plugins)) return null;
    const loaded = loader.plugins.filter((p): p is { name: string; version?: unknown; icon?: unknown } =>
        !!p && typeof p === 'object' && typeof (p as { name?: unknown }).name === 'string');
    const byName = new Map(loaded.map(p => [p.name, p]));
    const hidden = new Set(names(loader.deckyState?._hiddenPlugins));
    const shown: string[] = [];
    for (const name of [...names(loader.deckyState?._pluginOrder), ...loaded.map(p => p.name)]) {
        if (byName.has(name) && !hidden.has(name) && !shown.includes(name)) shown.push(name);
    }
    return shown.map(name => {
        const p = byName.get(name)!;
        return { name, version: typeof p.version === 'string' ? p.version : '', icon: isValidElement(p.icon) ? p.icon : null };
    });
}

/** Decky's panel opens on this plugin next time its tab shows (a plain state setter in Decky's DeckyState). */
export function activateDeckyPlugin(name: string, loader: DeckyLoaderLike | null = deckyLoader()): void {
    const state = loader?.deckyState;
    if (!state || typeof state.setActivePlugin !== 'function') return;
    try { (state.setActivePlugin as (name: string) => void).call(state, name); } catch { /* Decky's list still opens. */ }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/menu/deckyPlugins.test.ts && npx tsc --noEmit`
Expected: PASS; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/menu/steam/deckyPlugins.ts tests/menu/deckyPlugins.test.ts
```
Commit message: `menu: read Decky's plugin list in its own order, and open one plugin's panel`

---

### Task 4: Row building blocks

**Files:**
- Create: `src/menu/components/SettingRows.tsx`
- Modify: `src/home/heroFit.ts` (add `HERO_FIT_COPY`), `src/components/SettingsPanel.tsx` (import it instead of its own copy)
- Test: `tests/menu/settingRows.test.ts` (new)

**Interfaces:**
- Produces:
  - `Crumb({ parent, title, aside? }: { parent: string; title: string; aside?: ReactNode })`
  - `ToggleRow({ id, label, description?, checked, disabled?, onChange })`
  - `SegmentRow<T extends string>({ id, label, description?, options, labels, value, onSelect })`
  - `HERO_FIT_COPY: Record<HeroFit, string>` in `src/home/heroFit.ts`

- [ ] **Step 1: Write the failing test** `tests/menu/settingRows.test.ts`:

```ts
import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { Crumb, SegmentRow, ToggleRow } from '../../src/menu/components/SettingRows';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', ToggleField: 'toggle-field', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}

it('draws a crumb: parent, chevron and the title as the heading', () => {
    const nodes = tree(Crumb({ parent: 'Game Glance', title: 'Home', aside: 'x' }));
    expect(nodes[0].props.className).toBe('gg-menu-heading gg-plugin-crumb');
    expect(nodes.find(n => n.type === 'h2')!.props.children).toBe('Home');
    expect(nodes.find(n => n.type === 'span')!.props.children).toBe('Game Glance');
});

it('wraps a Steam toggle in a menu setting row with its focus key', () => {
    const onChange = vi.fn();
    const row = ToggleRow({ id: 'gg:home:spotlightHome', label: 'Spotlight Home', description: 'Text.', checked: true, onChange });
    expect(row.props.className).toBe('gg-menu-setting gg-menu-setting-toggle');
    expect(row.props['data-gg-focus']).toBe('gg:home:spotlightHome');
    const toggle = tree(row).find(n => n.type === 'toggle-field')!;
    expect(toggle.props).toMatchObject({ label: 'Spotlight Home', description: 'Text.', checked: true, disabled: false, highlightOnFocus: false });
    toggle.props.onChange(false);
    expect(onChange).toHaveBeenCalledWith(false);
});

it('marks a disabled toggle row', () => {
    const row = ToggleRow({ id: 'a', label: 'A', checked: false, disabled: true, onChange: vi.fn() });
    expect(row.props.className).toBe('gg-menu-setting gg-menu-setting-toggle gg-menu-setting-disabled');
});

it('draws segments under a header, with an optional note', () => {
    const onSelect = vi.fn();
    const row = SegmentRow({ id: 'gg:general:heroFit', label: 'Hero art', description: 'Fills.', options: ['fill', 'fit'] as const, labels: { fill: 'Fill', fit: 'Fit' }, value: 'fill', onSelect });
    expect(row.props.className).toBe('gg-menu-setting gg-menu-setting-segments');
    expect(row.props['data-gg-focus']).toBe('gg:general:heroFit');
    const nodes = tree(row);
    expect(nodes.find(n => n.props.className === 'gg-menu-setting-header')!.props.children).toBe('Hero art');
    const segments = nodes.find(n => n.props.options)!;
    expect(segments.props).toMatchObject({ id: 'gg:general:heroFit', label: 'Hero art', options: ['fill', 'fit'], value: 'fill' });
    segments.props.onSelect('fit');
    expect(onSelect).toHaveBeenCalledWith('fit');
    expect(nodes.find(n => n.props.className === 'gg-plugin-note')!.props.children).toBe('Fills.');
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/menu/settingRows.test.ts`
Expected: FAIL, cannot resolve `SettingRows`.

- [ ] **Step 3: Create `src/menu/components/SettingRows.tsx`**:

```tsx
import { ToggleField } from '@decky/ui';
import type { ReactNode } from 'react';
import { LuChevronRight } from 'react-icons/lu';
import { SettingSegments } from './SettingSegments';

/** "Parent › Title" heading of a Plugins view, with an optional item at the right. */
export function Crumb({ parent, title, aside }: { parent: string; title: string; aside?: ReactNode }) {
    return <div className="gg-menu-heading gg-plugin-crumb">
        <div className="gg-plugin-crumb-path"><span>{parent}</span><LuChevronRight aria-hidden="true" /><h2>{title}</h2></div>
        {aside}
    </div>;
}

/** A Game Glance switch in the menu's setting row, as Quick settings draws Steam's. */
export function ToggleRow({ id, label, description, checked, disabled = false, onChange }: {
    id: string; label: string; description?: string; checked: boolean; disabled?: boolean; onChange(value: boolean): void;
}) {
    return <div className={`gg-menu-setting gg-menu-setting-toggle${disabled ? ' gg-menu-setting-disabled' : ''}`} data-gg-focus={id}>
        <ToggleField highlightOnFocus={false} label={label} description={description} checked={checked} disabled={disabled} onChange={onChange} />
    </div>;
}

/** Two or three choices as segments under their label, as Performance draws Steam's. */
export function SegmentRow<T extends string>({ id, label, description, options, labels, value, onSelect }: {
    id: string; label: string; description?: string; options: readonly T[]; labels: Record<T, string>; value: T; onSelect(value: T): void;
}) {
    return <div className="gg-menu-setting gg-menu-setting-segments" data-gg-focus={id}>
        <div className="gg-menu-setting-header">{label}</div>
        <SettingSegments id={id} label={label} options={options} value={value} labels={labels} onSelect={choice => onSelect(choice as T)} />
        {description && <p className="gg-plugin-note">{description}</p>}
    </div>;
}
```

- [ ] **Step 4: Move `HERO_FIT_COPY`**

In `src/home/heroFit.ts`, right after the line `export const HERO_FITS: readonly HeroFit[] = ['fill', 'fit'];`, add:

```ts

/** The hero art setting's description, for the selected option. */
export const HERO_FIT_COPY: Record<HeroFit, string> = {
    fill: 'Fills the screen; the sides of wide art are cut off.',
    fit: 'Shows the whole art at the top, with a blurred copy behind it.',
};
```

In `src/components/SettingsPanel.tsx`:
- change the import line `import { HERO_FITS, HeroFit } from '../home/heroFit';` to `import { HERO_FIT_COPY, HERO_FITS, HeroFit } from '../home/heroFit';`
- delete these five lines (the old local copy):

```ts
/** The hero art setting's description, for the selected option. */
const HERO_FIT_COPY: Record<HeroFit, string> = {
    fill: 'Fills the screen; the sides of wide art are cut off.',
    fit: 'Shows the whole art at the top, with a blurred copy behind it.',
};
```

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npx vitest run tests/menu/settingRows.test.ts tests/menu/settingSegments.test.ts && npx tsc --noEmit`
Expected: PASS; tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/menu/components/SettingRows.tsx src/home/heroFit.ts src/components/SettingsPanel.tsx tests/menu/settingRows.test.ts
```
Commit message: `menu: crumb, toggle and segment rows for Game Glance's settings`

---

### Task 5: Plugins list and the six-card grid

**Files:**
- Create: `src/menu/components/gameGlanceTypes.ts`, `src/menu/components/PluginsList.tsx`, `src/menu/components/GameGlanceViews.tsx`
- Test: `tests/menu/pluginsList.test.ts` (new), `tests/menu/gameGlanceViews.test.ts` (new)

**Interfaces:**
- Consumes: `DeckyPlugin` (Task 3); `CATEGORY_IDS`, `CATEGORY_LABELS`, `CategoryId` (Task 2); `categoryView` (Task 1); `Crumb` (Task 4); `MenuAction` (exists); `PLUGIN_NAME` from `src/constants.ts` (`'Game Glance'`).
- Produces:
  - `gameGlanceTypes.ts`: `SettingsActions`, `GgValues`, `GgActions`, `PageProps` (exact shapes below; Tasks 6 and 7 use them).
  - `PluginsList({ plugins, openGameGlance, openOther, openDecky })`
  - `GameGlanceGrid({ v, a }: PageProps)`

- [ ] **Step 1: Create `src/menu/components/gameGlanceTypes.ts`** (types only, no test):

```ts
import type { CategoryId } from '../../data/settingsCategories';
import type { createSettingsStore, Settings } from '../../data/settings';
import type { SocialKeyboardMode } from '../preferences';

/** The settings store's setters. */
export type SettingsActions = Omit<ReturnType<typeof createSettingsStore>, 'load' | 'get' | 'subscribe'>;

/** Everything the Game Glance views show, read by PluginsSection from the stores. */
export interface GgValues {
    settings: Settings;
    menuEnabled: boolean;
    menuReady: boolean;
    socialKeyboard: SocialKeyboardMode;
    rowChosen: string;
    rowName: string;
    collectionRow: boolean;
    /** Recent games first, then Steam's collections, as the Games row picker lists them. */
    rowChoices: { id: string; label: string }[];
    summaries: Record<CategoryId, string>;
    screensaverAvailable: boolean;
    game: { name: string; match: string; matched: boolean; override: boolean } | null;
    fetching: { running: boolean; found: number; done: number; total: number };
    update: { line: string; available: string | null; checking: boolean; installing: boolean };
    version: string;
    error: string;
}

/** What the views can ask for. Every setting change goes through run(), which shows the menu's error line on failure. */
export interface GgActions {
    store: SettingsActions;
    setMenuEnabled(value: boolean): Promise<void>;
    setSocialKeyboard(mode: SocialKeyboardMode): Promise<void>;
    run(change: Promise<unknown>): void;
    open(viewId: string): void;
    back(): void;
    changeMatch(): void;
    openHltb(): void;
    removeOverride(): void;
    preview(): void;
    togglePreload(): void;
    clearCache(): void;
    checkUpdate(): void;
    installUpdate(): void;
    chooseVersion(): void;
}

export interface PageProps { v: GgValues; a: GgActions }
```

- [ ] **Step 2: Write the failing tests**

`tests/menu/pluginsList.test.ts`:

```ts
import { createElement, type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { PluginsList } from '../../src/menu/components/PluginsList';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const icon = createElement('svg', { id: 'own-icon' });
const plugins = [{ name: 'Unifideck', version: '0.7.6', icon }, { name: 'Game Glance', version: '4.0.0', icon: null }];

it('lists each plugin by name and version under Plugins, with Open in Steam in the heading', () => {
    const openDecky = vi.fn();
    const nodes = tree(PluginsList({ plugins, openGameGlance: vi.fn(), openOther: vi.fn(), openDecky }));
    expect(nodes.find(n => n.type === 'h2')!.props.children).toBe('Plugins');
    const ids = nodes.map(n => n.props.id).filter((id): id is string => typeof id === 'string');
    expect(ids).toEqual(['plugins:native', 'plugins:Unifideck', 'plugins:Game Glance']);
    nodes.find(n => n.props.id === 'plugins:native')!.props.onAction();
    expect(openDecky).toHaveBeenCalledTimes(1);
});

it('opens Game Glance inside the menu and any other plugin in Decky', () => {
    const openGameGlance = vi.fn(), openOther = vi.fn();
    const nodes = tree(PluginsList({ plugins, openGameGlance, openOther, openDecky: vi.fn() }));
    nodes.find(n => n.props.id === 'plugins:Game Glance')!.props.onAction();
    expect(openGameGlance).toHaveBeenCalledTimes(1);
    nodes.find(n => n.props.id === 'plugins:Unifideck')!.props.onAction();
    expect(openOther).toHaveBeenCalledWith('Unifideck');
});

it('says where each plugin opens and keeps the plugin’s own icon', () => {
    const nodes = tree(PluginsList({ plugins, openGameGlance: vi.fn(), openOther: vi.fn(), openDecky: vi.fn() }));
    const ends = nodes.filter(n => n.props.className === 'gg-plugin-end').map(n => n.props.children[0]);
    expect(ends).toEqual(['Opens in Steam', 'Settings']);
    expect(nodes.some(n => n.props.id === 'own-icon')).toBe(true);
});

it('says so when the list cannot be read', () => {
    const nodes = tree(PluginsList({ plugins: null, openGameGlance: vi.fn(), openOther: vi.fn(), openDecky: vi.fn() }));
    expect(nodes.find(n => n.props.className === 'gg-plugin-note')!.props.children).toBe('Plugins could not be listed.');
    expect(nodes.some(n => n.props.id === 'plugins:native')).toBe(true);
});
```

`tests/menu/gameGlanceViews.test.ts`:

```ts
import { type ReactElement, type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { GameGlanceGrid } from '../../src/menu/components/GameGlanceViews';
import type { GgActions, GgValues } from '../../src/menu/components/gameGlanceTypes';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const summaries = { home: 'On', 'game-page': 'Full look', 'status-bar': 'Status bar on', menu: 'Game Glance menu on · Compact keyboard', screensaver: 'Off', general: 'Look, data and updates' };

it('shows the six cards in order, each with its summary, and opens the category page', () => {
    const open = vi.fn();
    const v = { summaries, version: '4.0.0' } as unknown as GgValues;
    const a = { open } as unknown as GgActions;
    const nodes = tree(GameGlanceGrid({ v, a }));
    const cards = nodes.filter(n => typeof n.props.id === 'string');
    expect(cards.map(n => n.props.id)).toEqual(['gg:card:home', 'gg:card:game-page', 'gg:card:status-bar', 'gg:card:menu', 'gg:card:screensaver', 'gg:card:general']);
    expect(nodes.filter(n => n.props.className === 'gg-plugin-dim').map(n => n.props.children)).toEqual(Object.values(summaries));
    cards[2].props.onAction();
    expect(open).toHaveBeenCalledWith('gg:status-bar');
});

it('titles the grid Plugins › Game Glance with the version', () => {
    const nodes = tree(GameGlanceGrid({ v: { summaries, version: '4.0.0' } as unknown as GgValues, a: {} as GgActions }));
    const crumb = nodes.find(n => n.props.title === 'Game Glance')!;
    expect(crumb.props.parent).toBe('Plugins');
});
```

Note on the crumb test: `Crumb` is a function component, so `tree()` does not expand it; the test reads its props (`parent`, `title`).

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run tests/menu/pluginsList.test.ts tests/menu/gameGlanceViews.test.ts`
Expected: FAIL, cannot resolve the components.

- [ ] **Step 4: Create `src/menu/components/PluginsList.tsx`**:

```tsx
import { Focusable } from '@decky/ui';
import { LuArrowUpRight, LuChevronRight, LuPuzzle } from 'react-icons/lu';
import { PLUGIN_NAME } from '../../constants';
import type { DeckyPlugin } from '../steam/deckyPlugins';
import { pluginFocusKey } from '../views';
import { MenuAction } from './MenuAction';

/** The Plugins section: every loaded plugin; Game Glance opens here, the others in Decky. */
export function PluginsList({ plugins, openGameGlance, openOther, openDecky }: {
    plugins: DeckyPlugin[] | null; openGameGlance(): void; openOther(name: string): void; openDecky(): void;
}) {
    return <>
        <div className="gg-menu-heading"><h2>Plugins</h2><MenuAction id="plugins:native" onAction={openDecky}><LuArrowUpRight aria-hidden="true" />Open in Steam</MenuAction></div>
        {plugins === null ? <p className="gg-plugin-note">Plugins could not be listed.</p> :
            <Focusable className="gg-plugin-list" flow-children="column">{plugins.map(plugin => {
                const ours = plugin.name === PLUGIN_NAME;
                return <MenuAction key={plugin.name} id={pluginFocusKey(plugin.name)} className="gg-plugin-row" onAction={() => ours ? openGameGlance() : openOther(plugin.name)}>
                    <span className="gg-plugin-icon" aria-hidden="true">{plugin.icon ?? <LuPuzzle />}</span>
                    <span className="gg-plugin-name"><span>{plugin.name}</span><span className="gg-plugin-dim">{plugin.version}</span></span>
                    <span className="gg-plugin-end">{ours ? 'Settings' : 'Opens in Steam'}{ours ? <LuChevronRight aria-hidden="true" /> : <LuArrowUpRight aria-hidden="true" />}</span>
                </MenuAction>;
            })}</Focusable>}
    </>;
}
```

- [ ] **Step 5: Create `src/menu/components/GameGlanceViews.tsx`**:

```tsx
import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import type { IconType } from 'react-icons';
import { LuGamepad2, LuHouse, LuImage, LuMenu, LuPanelTop, LuSettings2 } from 'react-icons/lu';
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from '../../data/settingsCategories';
import { categoryView } from '../views';
import type { PageProps } from './gameGlanceTypes';
import { MenuAction } from './MenuAction';
import { Crumb } from './SettingRows';

const ICONS: Record<CategoryId, IconType> = { home: LuHouse, 'game-page': LuGamepad2, 'status-bar': LuPanelTop, menu: LuMenu, screensaver: LuImage, general: LuSettings2 };

/** Game Glance's first view: one card per category, with what it shows now. */
export function GameGlanceGrid({ v, a }: PageProps) {
    return <>
        <Crumb parent="Plugins" title="Game Glance" aside={<span>{v.version}</span>} />
        <Focusable className="gg-menu-grid gg-plugin-cards" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
            {CATEGORY_IDS.map(id => {
                const Icon = ICONS[id];
                return <MenuAction key={id} id={`gg:card:${id}`} onAction={() => a.open(categoryView(id))}>
                    <span className="gg-plugin-card-name"><Icon aria-hidden="true" />{CATEGORY_LABELS[id]}</span>
                    <span className="gg-plugin-dim">{v.summaries[id]}</span>
                </MenuAction>;
            })}
        </Focusable>
    </>;
}
```

If `import type { IconType } from 'react-icons'` does not typecheck, use `import type { IconType } from 'react-icons/lib';`.

- [ ] **Step 6: Run the tests and the typecheck**

Run: `npx vitest run tests/menu/pluginsList.test.ts tests/menu/gameGlanceViews.test.ts && npx tsc --noEmit`
Expected: PASS; tsc prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/menu/components/gameGlanceTypes.ts src/menu/components/PluginsList.tsx src/menu/components/GameGlanceViews.tsx tests/menu/pluginsList.test.ts tests/menu/gameGlanceViews.test.ts
```
Commit message: `menu: Plugins list and Game Glance's six-card grid`

---

### Task 6: The category pages and the Games row picker

**Files:**
- Create: `src/menu/components/GameGlancePages.tsx`
- Test: `tests/menu/gameGlancePages.test.ts` (new)

**Interfaces:**
- Consumes: Tasks 1, 2, 4, 5; `ROW_SORTS`, `rowSortLabel`, `sortByLabel` from `src/home/collections.ts`; `ROW_STYLES` from `src/home/recentsLayout.ts`; `HERO_FITS`, `HERO_FIT_COPY` from `src/home/heroFit.ts`; `PAGE_SHADINGS`, `PAGE_SHADING_COPY` from `src/home/pageShading.ts`.
- Produces: `HomePage`, `GamePage`, `StatusBarPage`, `MenuPage`, `ScreensaverPage`, `GeneralPage`, `HomeRowPicker`, all `(props: PageProps) => JSX.Element`, and `CATEGORY_PAGES: Record<CategoryId, (props: PageProps) => JSX.Element>`.

Focus key of every row: `gg:<category>:<row>`, exactly as written in the code below.

- [ ] **Step 1: Write the failing test** `tests/menu/gameGlancePages.test.ts`:

```ts
import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CATEGORY_PAGES, GamePage, GeneralPage, HomePage, HomeRowPicker, MenuPage, ScreensaverPage, StatusBarPage } from '../../src/menu/components/GameGlancePages';
import type { GgActions, GgValues } from '../../src/menu/components/gameGlanceTypes';
import type { Settings } from '../../src/data/settings';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', ToggleField: 'toggle-field', NavEntryPositionPreferences: {} }));
// Also walks `aside`: the Screensaver page puts its Preview button in the crumb's aside prop.
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children), ...tree(element.props.aside)];
}
const settings: Settings = {
    enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: false, cleanPage: false, homeStatusBar: true,
    homeExpandedControls: false, chromeEveryPage: false, statusAvatar: false, gameLogo: false, homeRow: 'recent',
    homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', pageShading: 'bottom',
    feedTabs: { news: true, friends: true, recommended: true },
    screensaver: { enabled: true, logo: true, statusBar: true, stats: false } as Settings['screensaver'],
};
function values(change: Partial<GgValues> = {}): GgValues {
    return {
        settings, menuEnabled: true, menuReady: true, socialKeyboard: 'compact', rowChosen: 'recent', rowName: 'Recent games', collectionRow: false,
        rowChoices: [{ id: 'recent', label: 'Recent games' }, { id: 'c1', label: 'Backlog (12)' }],
        summaries: {} as GgValues['summaries'], screensaverAvailable: true,
        game: { name: 'Monster Hunter Rise', match: 'Automatic: HowLongToBeat #1', matched: true, override: false },
        fetching: { running: false, found: 0, done: 0, total: 0 },
        update: { line: 'Version 4.0.0 · up to date', available: null, checking: false, installing: false },
        version: '4.0.0', error: '', ...change,
    };
}
function actions() {
    const store = new Proxy({}, { get: (target: Record<string, any>, key: string) => target[key] ??= vi.fn(() => Promise.resolve()) });
    const a = { store, setMenuEnabled: vi.fn(() => Promise.resolve()), setSocialKeyboard: vi.fn(() => Promise.resolve()), run: vi.fn(), open: vi.fn(), back: vi.fn(),
        changeMatch: vi.fn(), openHltb: vi.fn(), removeOverride: vi.fn(), preview: vi.fn(), togglePreload: vi.fn(), clearCache: vi.fn(),
        checkUpdate: vi.fn(), installUpdate: vi.fn(), chooseVersion: vi.fn() };
    return a as unknown as GgActions & { store: Record<string, ReturnType<typeof vi.fn>> };
}
const ids = (node: ReactNode) => tree(node).map(n => n.props.id).filter((id): id is string => typeof id === 'string');
const byId = (node: ReactNode, id: string) => tree(node).find(n => n.props.id === id)!;

describe('Home', () => {
    it('shows every row with Spotlight Home on, in order', () => {
        expect(ids(HomePage({ v: values(), a: actions() }))).toEqual(['gg:home:spotlightHome', 'gg:home:games', 'gg:home:rowStyle', 'gg:home:grayUninstalled', 'gg:home:news', 'gg:home:friends', 'gg:home:recommended', 'gg:home:wishlistDeals']);
    });
    it('adds the sort for a collection row', () => {
        expect(ids(HomePage({ v: values({ collectionRow: true }), a: actions() }))).toContain('gg:home:sort');
    });
    it('shows only the main toggle with Spotlight Home off', () => {
        expect(ids(HomePage({ v: values({ settings: { ...settings, spotlightHome: false } }), a: actions() }))).toEqual(['gg:home:spotlightHome']);
    });
    it('writes through the settings store', () => {
        const a = actions();
        const page = HomePage({ v: values(), a });
        byId(page, 'gg:home:spotlightHome').props.onChange(false);
        expect(a.store.setSpotlightHome).toHaveBeenCalledWith(false);
        expect(a.run).toHaveBeenCalledTimes(1);
        byId(page, 'gg:home:news').props.onChange(false);
        expect(a.store.setFeedTab).toHaveBeenCalledWith('news', false);
        byId(page, 'gg:home:rowStyle').props.onSelect('minimal');
        expect(a.store.setHomeRowStyle).toHaveBeenCalledWith('minimal');
    });
    it('opens the Games row picker', () => {
        const a = actions();
        byId(HomePage({ v: values(), a }), 'gg:home:games').props.onAction();
        expect(a.open).toHaveBeenCalledWith('gg:home:row');
    });
});

it('Games row picker sets the row and goes back', () => {
    const a = actions();
    const page = HomeRowPicker({ v: values(), a });
    expect(ids(page)).toEqual(['gg:home:row:recent', 'gg:home:row:c1']);
    expect(byId(page, 'gg:home:row:recent').props.selected).toBe(true);
    byId(page, 'gg:home:row:c1').props.onAction();
    expect(a.store.setHomeRow).toHaveBeenCalledWith('c1');
    expect(a.back).toHaveBeenCalledTimes(1);
});

describe('Game page', () => {
    it('picks Full or Clean', () => {
        const a = actions();
        const look = byId(GamePage({ v: values(), a }), 'gg:game-page:look');
        expect(look.props.value).toBe('full');
        look.props.onSelect('clean');
        expect(a.store.setCleanPage).toHaveBeenCalledWith(true);
    });
    it('shows the match card with its buttons', () => {
        const a = actions();
        const page = GamePage({ v: values(), a });
        expect(ids(page)).toEqual(['gg:game-page:look', 'gg:game-page:change', 'gg:game-page:open']);
        byId(page, 'gg:game-page:change').props.onAction();
        expect(a.changeMatch).toHaveBeenCalledTimes(1);
    });
    it('offers Remove override while one is set, and nothing to open without a match', () => {
        const v = values({ game: { name: 'X', match: 'Override: HowLongToBeat #5', matched: false, override: true } });
        expect(ids(GamePage({ v, a: actions() }))).toEqual(['gg:game-page:look', 'gg:game-page:change', 'gg:game-page:remove']);
    });
    it('asks for a game page first without a current game', () => {
        const nodes = tree(GamePage({ v: values({ game: null }), a: actions() }));
        expect(nodes.some(n => n.props.children === 'Open a game page first.')).toBe(true);
    });
});

describe('Status bar & footer', () => {
    it('lists the status bar rows, On every page disabled until expanded controls are on', () => {
        const page = StatusBarPage({ v: values(), a: actions() });
        expect(ids(page)).toEqual(['gg:status-bar:statusBar', 'gg:status-bar:statusAvatar', 'gg:status-bar:expandedControls', 'gg:status-bar:everyPage']);
        expect(byId(page, 'gg:status-bar:everyPage').props.disabled).toBe(true);
    });
    it('explains itself with Spotlight Home off', () => {
        const page = StatusBarPage({ v: values({ settings: { ...settings, spotlightHome: false } }), a: actions() });
        expect(ids(page)).toEqual([]);
        expect(tree(page).some(n => n.props.children === 'Turn on Spotlight Home to use the status bar and footer.')).toBe(true);
    });
});

it('Menu switches our menu and the social keyboard', () => {
    const a = actions();
    const page = MenuPage({ v: values(), a });
    expect(ids(page)).toEqual(['gg:menu:enabled', 'gg:menu:keyboard']);
    byId(page, 'gg:menu:enabled').props.onChange(false);
    expect(a.setMenuEnabled).toHaveBeenCalledWith(false);
    byId(page, 'gg:menu:keyboard').props.onSelect('radial');
    expect(a.setSocialKeyboard).toHaveBeenCalledWith('radial');
});

describe('Screensaver', () => {
    it('shows Preview and the three parts while on', () => {
        const a = actions();
        const page = ScreensaverPage({ v: values(), a });
        expect(ids(page)).toEqual(['gg:screensaver:preview', 'gg:screensaver:enabled', 'gg:screensaver:logo', 'gg:screensaver:statusBar', 'gg:screensaver:stats']);
        byId(page, 'gg:screensaver:stats').props.onChange(true);
        expect(a.store.setScreensaver).toHaveBeenCalledWith({ stats: true });
        byId(page, 'gg:screensaver:preview').props.onAction();
        expect(a.preview).toHaveBeenCalledTimes(1);
    });
    it('shows only the switch while off, and a note when Steam has no screensaver', () => {
        const off = values({ settings: { ...settings, screensaver: { ...settings.screensaver, enabled: false } } });
        expect(ids(ScreensaverPage({ v: off, a: actions() }))).toEqual(['gg:screensaver:enabled']);
        expect(ids(ScreensaverPage({ v: values({ screensaverAvailable: false }), a: actions() }))).toEqual([]);
    });
});

describe('General', () => {
    it('lists Game Glance, the look, data and updates', () => {
        const page = GeneralPage({ v: values(), a: actions() });
        expect(ids(page)).toEqual(['gg:general:enabled', 'gg:general:gameLogo', 'gg:general:heroFit', 'gg:general:pageShading', 'gg:general:autoPreload', 'gg:general:preload', 'gg:general:clearCache', 'gg:general:check', 'gg:general:versions']);
    });
    it('offers the update when one is available', () => {
        const a = actions();
        const page = GeneralPage({ v: values({ update: { line: 'Version 4.0.0 · 4.0.1 is available', available: '4.0.1', checking: false, installing: false } }), a });
        const update = byId(page, 'gg:general:update');
        expect(update.props.children).toBe('Update to 4.0.1');
        update.props.onAction();
        expect(a.installUpdate).toHaveBeenCalledTimes(1);
    });
    it('shows pre-load progress as a Stop button', () => {
        const page = GeneralPage({ v: values({ fetching: { running: true, found: 3, done: 4, total: 10 } }), a: actions() });
        expect(byId(page, 'gg:general:preload').props.children).toBe('Stop (4 / 10)');
    });
});

it('maps every category to its page', () => {
    expect(Object.keys(CATEGORY_PAGES)).toEqual(['home', 'game-page', 'status-bar', 'menu', 'screensaver', 'general']);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/menu/gameGlancePages.test.ts`
Expected: FAIL, cannot resolve `GameGlancePages`.

- [ ] **Step 3: Create `src/menu/components/GameGlancePages.tsx`**:

```tsx
import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import { LuArrowUpRight, LuChevronRight, LuPlay } from 'react-icons/lu';
import { everyPageAvailable, homeRows, ROW_STYLE_LABELS, statusRows, type CategoryId } from '../../data/settingsCategories';
import { ROW_SORTS, rowSortLabel, sortByLabel, type RowSort } from '../../home/collections';
import { HERO_FIT_COPY, HERO_FITS, type HeroFit } from '../../home/heroFit';
import { PAGE_SHADING_COPY, PAGE_SHADINGS, type PageShading } from '../../home/pageShading';
import { ROW_STYLES, type RowStyle } from '../../home/recentsLayout';
import { HOME_ROW_VIEW } from '../views';
import type { PageProps } from './gameGlanceTypes';
import { MenuAction } from './MenuAction';
import { Crumb, SegmentRow, ToggleRow } from './SettingRows';

const rows = (children: JSX.Element[] | JSX.Element) => <Focusable className="gg-plugin-rows" flow-children="column">{children}</Focusable>;
const error = (text: string) => text ? <p className="gg-menu-error" role="alert">{text}</p> : null;

export function HomePage({ v, a }: PageProps) {
    const s = v.settings;
    const shown = homeRows(s, v.collectionRow);
    const has = (row: (typeof shown)[number]) => shown.includes(row);
    return <>
        <Crumb parent="Game Glance" title="Home" />
        {rows(<>
            <ToggleRow id="gg:home:spotlightHome" label="Spotlight Home" description="Replaces Steam's Home screen. Off returns Steam's own Home."
                checked={s.spotlightHome} onChange={value => a.run(a.store.setSpotlightHome(value))} />
            {has('gamesRow') && <h3>Games row</h3>}
            {has('gamesRow') && <MenuAction id="gg:home:games" className="gg-plugin-picker" onAction={() => a.open(HOME_ROW_VIEW)}>
                <span>Games</span><span className="gg-plugin-value">{v.rowName}<LuChevronRight aria-hidden="true" /></span>
            </MenuAction>}
            {has('rowSort') && <SegmentRow<RowSort> id="gg:home:sort" label={sortByLabel()} options={ROW_SORTS}
                labels={Object.fromEntries(ROW_SORTS.map(sort => [sort, rowSortLabel(sort)])) as Record<RowSort, string>}
                value={s.homeRowSort} onSelect={value => a.run(a.store.setHomeRowSort(value))} />}
            {has('rowStyle') && <SegmentRow<RowStyle> id="gg:home:rowStyle" label="Style" options={ROW_STYLES} labels={ROW_STYLE_LABELS}
                description="Steam: the first game stays wide. Spotlight: the selected game stays wide at the left. Minimal: all cards stay small."
                value={s.homeRowStyle} onSelect={value => a.run(a.store.setHomeRowStyle(value))} />}
            {has('grayUninstalled') && <ToggleRow id="gg:home:grayUninstalled" label="Gray out uninstalled games"
                description="Shows uninstalled Steam games in gray until selected." checked={s.homeGrayUninstalled}
                onChange={value => a.run(a.store.setHomeGrayUninstalled(value))} />}
            {has('news') && <h3>Feed</h3>}
            {has('news') && <ToggleRow id="gg:home:news" label="What's new" description="News and events from your games, and recently updated games."
                checked={s.feedTabs.news} onChange={value => a.run(a.store.setFeedTab('news', value))} />}
            {has('friends') && <ToggleRow id="gg:home:friends" label="Friends" description="What your friends are playing, and what is trending among them."
                checked={s.feedTabs.friends} onChange={value => a.run(a.store.setFeedTab('friends', value))} />}
            {has('recommended') && <ToggleRow id="gg:home:recommended" label="Recommended" description="Games from your library to play next."
                checked={s.feedTabs.recommended} onChange={value => a.run(a.store.setFeedTab('recommended', value))} />}
            {has('wishlistDeals') && <ToggleRow id="gg:home:wishlistDeals" label="Show wishlist deals"
                description="Sends your Steam ID to Steam's public store to find games on sale from your wishlist. Off by default."
                checked={s.wishlistDeals} onChange={value => a.run(a.store.setWishlistDeals(value))} />}
        </>)}
        {error(v.error)}
    </>;
}

export function HomeRowPicker({ v, a }: PageProps) {
    return <>
        <Crumb parent="Home" title="Games row" />
        <Focusable className="gg-plugin-list" flow-children="column">{v.rowChoices.map(choice =>
            <MenuAction key={choice.id} id={`gg:home:row:${choice.id}`} className="gg-plugin-picker" selected={choice.id === v.rowChosen}
                onAction={() => { a.run(a.store.setHomeRow(choice.id)); a.back(); }}>{choice.label}</MenuAction>)}
        </Focusable>
    </>;
}

export function GamePage({ v, a }: PageProps) {
    const game = v.game;
    return <>
        <Crumb parent="Game Glance" title="Game page" />
        {rows(<>
            <SegmentRow<'full' | 'clean'> id="gg:game-page:look" label="Look" options={['full', 'clean']} labels={{ full: 'Full', clean: 'Clean' }}
                description="Full: description and HowLongToBeat cards. Clean: one row at the bottom over the full art."
                value={v.settings.cleanPage ? 'clean' : 'full'} onSelect={value => a.run(a.store.setCleanPage(value === 'clean'))} />
            <h3>HowLongToBeat match</h3>
            {game ? <div className="gg-plugin-card">
                <div className="gg-plugin-card-title"><span>{game.name}</span><span className="gg-plugin-dim">{game.match}</span></div>
                <Focusable className="gg-plugin-buttons" flow-children="row">
                    <MenuAction id="gg:game-page:change" onAction={a.changeMatch}>Change match</MenuAction>
                    {game.matched && <MenuAction id="gg:game-page:open" onAction={a.openHltb}><LuArrowUpRight aria-hidden="true" />Open on HowLongToBeat</MenuAction>}
                    {game.override && <MenuAction id="gg:game-page:remove" onAction={a.removeOverride}>Remove override</MenuAction>}
                </Focusable>
            </div> : <p className="gg-plugin-note">Open a game page first.</p>}
        </>)}
        {error(v.error)}
    </>;
}

export function StatusBarPage({ v, a }: PageProps) {
    const s = v.settings;
    const shown = statusRows(s);
    return <>
        <Crumb parent="Game Glance" title="Status bar & footer" />
        {shown.length === 0 ? <p className="gg-plugin-note">Turn on Spotlight Home to use the status bar and footer.</p> : rows(<>
            <ToggleRow id="gg:status-bar:statusBar" label="Status bar" description="Clock, battery and connection at the top-right of Home."
                checked={s.homeStatusBar} onChange={value => a.run(a.store.setHomeStatusBar(value))} />
            {shown.includes('statusAvatar') && <ToggleRow id="gg:status-bar:statusAvatar" label="Profile picture"
                description="Your avatar, ringed in your online colour, instead of the dot." checked={s.statusAvatar}
                onChange={value => a.run(a.store.setStatusAvatar(value))} />}
            {shown.includes('expandedControls') && <h3>Controls</h3>}
            {shown.includes('expandedControls') && <ToggleRow id="gg:status-bar:expandedControls" label="Expanded Home controls"
                description="Matching controller prompts and individually selectable status items." checked={s.homeExpandedControls}
                onChange={value => a.run(a.store.setHomeExpandedControls(value))} />}
            {shown.includes('everyPage') && <ToggleRow id="gg:status-bar:everyPage" label="On every page"
                description="The status bar and footer on every Steam page, not only Home." checked={s.chromeEveryPage}
                disabled={!everyPageAvailable(s)} onChange={value => a.run(a.store.setChromeEveryPage(value))} />}
        </>)}
        {error(v.error)}
    </>;
}

export function MenuPage({ v, a }: PageProps) {
    return <>
        <Crumb parent="Game Glance" title="Menu" />
        {rows(<>
            <ToggleRow id="gg:menu:enabled" label="Game Glance menu" description="Replaces the Home and quick access menus. Off closes this menu and returns Steam's own."
                checked={v.menuEnabled} disabled={!v.menuReady} onChange={value => a.run(a.setMenuEnabled(value))} />
            <h3>Social</h3>
            <SegmentRow<'compact' | 'radial'> id="gg:menu:keyboard" label="Keyboard" description="The keyboard for the message field."
                options={['compact', 'radial']} labels={{ compact: 'Compact', radial: 'Radial' }} value={v.socialKeyboard}
                onSelect={value => a.run(a.setSocialKeyboard(value))} />
        </>)}
        {error(v.error)}
    </>;
}

export function ScreensaverPage({ v, a }: PageProps) {
    const saver = v.settings.screensaver;
    const preview = saver.enabled && v.screensaverAvailable
        ? <MenuAction id="gg:screensaver:preview" onAction={a.preview}><LuPlay aria-hidden="true" />Preview</MenuAction> : undefined;
    return <>
        <Crumb parent="Game Glance" title="Screensaver" aside={preview} />
        {!v.screensaverAvailable ? <p className="gg-plugin-note">Needs a newer Steam client, one with the screensaver (Settings → Customization → Screensaver).</p> : rows(<>
            <ToggleRow id="gg:screensaver:enabled" label="Game Glance screensaver"
                description="Steam's Game Slideshow with the games of your Games row and their custom art. Off returns Steam's own."
                checked={saver.enabled} onChange={value => a.run(a.store.setScreensaver({ enabled: value }))} />
            {saver.enabled && <h3>Show over the art</h3>}
            {saver.enabled && <Focusable className="gg-plugin-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
                <ToggleRow id="gg:screensaver:logo" label="Logo" checked={saver.logo} onChange={value => a.run(a.store.setScreensaver({ logo: value }))} />
                <ToggleRow id="gg:screensaver:statusBar" label="Status bar" checked={saver.statusBar} onChange={value => a.run(a.store.setScreensaver({ statusBar: value }))} />
                <ToggleRow id="gg:screensaver:stats" label="Stats" checked={saver.stats} onChange={value => a.run(a.store.setScreensaver({ stats: value }))} />
            </Focusable>}
            {saver.enabled && <p className="gg-plugin-note">Logo at the bottom-left, status bar at the top-right, and a stats card with play time, HowLongToBeat and achievements. Turn all three off for only the art.</p>}
        </>)}
        {error(v.error)}
    </>;
}

export function GeneralPage({ v, a }: PageProps) {
    const s = v.settings;
    const f = v.fetching;
    return <>
        <Crumb parent="Game Glance" title="General" />
        {rows(<>
            <ToggleRow id="gg:general:enabled" label="Game Glance" description="Off turns Game Glance off everywhere: game page, Home, menu and screensaver."
                checked={s.enabled} onChange={value => a.run(a.store.setEnabled(value))} />
            <h3>Look on Home and the game page</h3>
            <ToggleRow id="gg:general:gameLogo" label="Game logo" description="The game's logo instead of its name. A game without one keeps its name."
                checked={s.gameLogo} onChange={value => a.run(a.store.setGameLogo(value))} />
            <SegmentRow<HeroFit> id="gg:general:heroFit" label="Hero art" description={HERO_FIT_COPY[s.heroFit]} options={HERO_FITS}
                labels={{ fill: 'Fill', fit: 'Fit' }} value={s.heroFit} onSelect={value => a.run(a.store.setHeroFit(value))} />
            <SegmentRow<PageShading> id="gg:general:pageShading" label="Page shading" description={PAGE_SHADING_COPY[s.pageShading].description}
                options={PAGE_SHADINGS} labels={{ bottom: PAGE_SHADING_COPY.bottom.label, none: PAGE_SHADING_COPY.none.label }}
                value={s.pageShading} onSelect={value => a.run(a.store.setPageShading(value))} />
            <h3>Data</h3>
            <ToggleRow id="gg:general:autoPreload" label="Pre-load new games automatically" description="Checks for new installs every 30 minutes and fetches their game info."
                checked={s.autoPreload} onChange={value => a.run(a.store.setAutoPreload(value))} />
            <p className="gg-plugin-note">{f.running ? `${f.found} found so far. You can close this menu.` : 'Fills in times and descriptions for every installed game, about one per second.'}</p>
            <Focusable className="gg-plugin-buttons" flow-children="row">
                <MenuAction id="gg:general:preload" onAction={a.togglePreload}>{f.running ? `Stop (${f.done} / ${f.total || '…'})` : 'Pre-load installed games'}</MenuAction>
                <MenuAction id="gg:general:clearCache" onAction={a.clearCache}>Clear cached data</MenuAction>
            </Focusable>
            <h3>Updates</h3>
            <p className="gg-plugin-note">{v.update.line}</p>
            <Focusable className="gg-plugin-buttons" flow-children="row">
                {v.update.available && <MenuAction id="gg:general:update" disabled={v.update.installing} onAction={a.installUpdate}>{`Update to ${v.update.available}`}</MenuAction>}
                <MenuAction id="gg:general:check" disabled={v.update.checking} onAction={a.checkUpdate}>Check for updates</MenuAction>
                <MenuAction id="gg:general:versions" onAction={a.chooseVersion}>Choose version</MenuAction>
            </Focusable>
        </>)}
        {error(v.error)}
    </>;
}

export const CATEGORY_PAGES: Record<CategoryId, (props: PageProps) => JSX.Element> = {
    home: HomePage, 'game-page': GamePage, 'status-bar': StatusBarPage, menu: MenuPage, screensaver: ScreensaverPage, general: GeneralPage,
};
```

Notes for this step:
- `JSX.Element` is used the same way elsewhere in this repo; if tsc says `JSX` is not found, replace `JSX.Element` with `ReactElement` and add `import type { ReactElement } from 'react';`.
- The General page test expects `gg:general:update` to be absent while no update is available; the code renders it only when `v.update.available` is set, so the order in the first General test has no `update` id.

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npx vitest run tests/menu/gameGlancePages.test.ts && npx tsc --noEmit`
Expected: PASS; tsc prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/menu/components/GameGlancePages.tsx tests/menu/gameGlancePages.test.ts
```
Commit message: `menu: Game Glance's six category pages and the Games row picker`

---

### Task 7: Wire it into the menu

**Files:**
- Modify: `src/components/UpdatesSection.tsx` (export `updateLine`)
- Create: `src/menu/pluginStyles.ts`, `src/menu/components/PluginsSection.tsx`
- Modify: `src/menu/components/MenuShell.tsx`
- Test: `tests/menu/pluginStyles.test.ts` (new)

**Interfaces:**
- Consumes: everything from Tasks 1–6; `useSettings`, `settings` (`src/data/settings.ts`); `menuPreferences` (`src/menu/startMenu.ts` re-exports it; `MenuPreferences.tsx` imports it from `'../startMenu'`, do the same); `useCurrentGame` (`src/data/currentGame.ts`); `overrides`, `cache` (`src/data/cache.ts`); `useFetchAll`, `fetchAll` (`src/data/fetchAll.ts`); `useUpdate`, `createInstallGate`, `installUpdate` (`src/data/update.ts`); `steamHomeCollections`, `RECENT_ROW` (`src/home/collections.ts`); `tr` (`src/i18n/steamText.ts`); `screensaverAvailable`, `previewScreensaver` (`src/screensaver/steamScreensaver.ts`); `toaster` (`@decky/api`); `Navigation` (`@decky/ui`).
- Produces: `PluginsSection({ state, dispatch, handoff, close })`, `pluginStyles: string`.

- [ ] **Step 1: Export `updateLine`**

In `src/components/UpdatesSection.tsx` change `function updateLine(state: UpdateState): string {` to `export function updateLine(state: UpdateState): string {`.

- [ ] **Step 2: Write the failing styles test** `tests/menu/pluginStyles.test.ts`:

```ts
import { expect, it } from 'vitest';
import { pluginStyles } from '../../src/menu/pluginStyles';

const rule = (selector: string) => pluginStyles.split('\n').find(line => line.startsWith(selector + '{')) ?? '';

it('lays the Game Glance cards out two across', () => {
    expect(rule('.gg-menu .gg-menu-grid.gg-plugin-cards')).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
});
it('draws plugin rows and the match card in the menu glass', () => {
    expect(rule('.gg-menu-native-host .gg-menu button.gg-menu-action.gg-plugin-row.DialogButton')).toContain('background:var(--gg-glass)');
    expect(rule('.gg-menu .gg-plugin-card')).toContain('background:var(--gg-glass)');
});
```

Run: `npx vitest run tests/menu/pluginStyles.test.ts` — expected FAIL (no module).

- [ ] **Step 3: Create `src/menu/pluginStyles.ts`** (each rule on its own line; the test reads lines):

```ts
// The Plugins section: plugin rows, Game Glance's cards, crumbs, pickers and the match card, on the menu's tokens.
export const pluginStyles = `
.gg-menu .gg-plugin-crumb-path{display:flex;align-items:center;gap:8px;min-width:0}
.gg-menu .gg-plugin-crumb-path>span{color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body)}
.gg-menu .gg-plugin-crumb-path svg{width:18px;height:18px;flex:none;color:var(--gg-text-dim)}
.gg-menu .gg-plugin-crumb-path h2{margin:0}
.gg-menu .gg-plugin-list,.gg-menu .gg-plugin-rows{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-plugin-row.DialogButton{display:flex;align-items:center;justify-content:flex-start;gap:16px;width:100%;min-height:72px;padding:12px 20px;text-align:left;border-radius:var(--gg-r-card);border:1px solid var(--gg-edge);background:var(--gg-glass)}
.gg-menu .gg-plugin-icon{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,.1)}
.gg-menu .gg-plugin-icon svg{width:24px;height:24px}
.gg-menu .gg-plugin-name{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.gg-menu .gg-plugin-dim{color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);line-height:1.4}
.gg-menu .gg-plugin-end{display:flex;align-items:center;gap:8px;flex:none;color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body)}
.gg-menu .gg-plugin-end svg{width:20px;height:20px}
.gg-menu .gg-menu-grid.gg-plugin-cards{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:12px}
.gg-menu-native-host .gg-menu .gg-menu-grid.gg-plugin-cards button.gg-menu-action.DialogButton{min-height:128px;height:auto;align-items:flex-start;justify-content:flex-start;text-align:left;padding:20px}
.gg-menu .gg-plugin-card-name{display:flex;align-items:center;gap:12px}
.gg-menu-native-host .gg-menu button.gg-menu-action.gg-plugin-picker.DialogButton{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:56px;padding:8px 12px;text-align:left}
.gg-menu .gg-plugin-value{display:flex;align-items:center;gap:6px;color:var(--gg-text-dim)}
.gg-menu .gg-plugin-note{margin:4px 8px 0;color:var(--gg-text-dim);font-size:var(--gg-type-label);font-weight:var(--gg-weight-body);line-height:1.4}
.gg-menu .gg-plugin-card{display:flex;flex-direction:column;gap:12px;padding:16px 20px;border-radius:var(--gg-r-card);border:1px solid var(--gg-edge);background:var(--gg-glass)}
.gg-menu .gg-plugin-card-title{display:flex;flex-direction:column;gap:4px}
.gg-menu .gg-plugin-buttons{display:flex;flex-wrap:wrap;gap:12px}
.gg-menu .gg-plugin-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
`;
```

- [ ] **Step 4: Create `src/menu/components/PluginsSection.tsx`**:

```tsx
import { toaster } from '@decky/api';
import { Navigation } from '@decky/ui';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { updateLine } from '../../components/UpdatesSection';
import { PLUGIN_NAME } from '../../constants';
import { cache, overrides } from '../../data/cache';
import { useCurrentGame } from '../../data/currentGame';
import { fetchAll, useFetchAll } from '../../data/fetchAll';
import { settings, useSettings } from '../../data/settings';
import { CATEGORY_IDS, categorySummary, matchLine, type CategoryId } from '../../data/settingsCategories';
import { createInstallGate, installUpdate, useUpdate } from '../../data/update';
import { RECENT_ROW, steamHomeCollections } from '../../home/collections';
import { tr } from '../../i18n/steamText';
import { previewScreensaver, screensaverAvailable } from '../../screensaver/steamScreensaver';
import type { MenuEvent, MenuState } from '../model';
import { menuPreferences } from '../startMenu';
import { activateDeckyPlugin, listDeckyPlugins } from '../steam/deckyPlugins';
import type { NativeRequest } from '../steam/runtime';
import { GAME_GLANCE_VIEW, HOME_ROW_VIEW } from '../views';
import { CATEGORY_PAGES, HomeRowPicker } from './GameGlancePages';
import type { GgActions, GgValues } from './gameGlanceTypes';
import { GameGlanceGrid } from './GameGlanceViews';
import { PluginsList } from './PluginsList';

interface SectionProps { state: MenuState; dispatch(event: MenuEvent): void; handoff(request: NativeRequest): void; close(): void }

/** The menu's Plugins section: the plugin list, then Game Glance's own views by the menu stack's top view. */
export function PluginsSection({ state, dispatch, handoff, close }: SectionProps) {
    // Read once when the section opens, as Decky's own list is.
    const [plugins] = useState(listDeckyPlugins);
    const top = state.stack[state.stack.length - 1];
    const openDecky = () => handoff({ kind: 'qam', tab: 'decky' });
    const openPlugin = (name: string) => { activateDeckyPlugin(name); openDecky(); };
    if (top === undefined) return <PluginsList plugins={plugins} openGameGlance={() => dispatch({ type: 'push', viewId: GAME_GLANCE_VIEW })} openOther={openPlugin} openDecky={openDecky} />;
    return <GameGlanceSettings top={top} dispatch={dispatch} openPlugin={openPlugin} close={close} />;
}

function GameGlanceSettings({ top, dispatch, openPlugin, close }: { top: string; dispatch(event: MenuEvent): void; openPlugin(name: string): void; close(): void }) {
    const s = useSettings();
    const prefs = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.get);
    const prefsState = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.loadState);
    const collections = useMemo(steamHomeCollections, []);
    const saverAvailable = useMemo(screensaverAvailable, []);
    const { game, hltb } = useCurrentGame();
    const [overrideId, setOverrideId] = useState<number | null>(null);
    useEffect(() => {
        if (!game) return;
        let alive = true;
        overrides.get(game.appId).then(id => { if (alive) setOverrideId(id); }, () => { if (alive) setOverrideId(null); });
        return () => { alive = false; };
    }, [game?.appId]);
    const fetching = useFetchAll();
    const { state: update, recheck } = useUpdate();
    const [installing, setInstalling] = useState(false);
    const [gate] = useState(() => createInstallGate(setInstalling));
    const [error, setError] = useState('');

    const rowChosen = collections.some(c => c.id === s.homeRow) ? s.homeRow : RECENT_ROW;
    const recent = tr('recentGames');
    const rowName = rowChosen === RECENT_ROW ? recent : collections.find(c => c.id === rowChosen)?.name ?? recent;
    const summaryContext = { rowName, screensaverAvailable: saverAvailable, menuEnabled: prefs.enabled, socialKeyboard: prefs.socialKeyboard };
    const v: GgValues = {
        settings: s,
        menuEnabled: prefs.enabled,
        menuReady: prefsState === 'ready',
        socialKeyboard: prefs.socialKeyboard,
        rowChosen,
        rowName,
        collectionRow: rowChosen !== RECENT_ROW,
        rowChoices: [{ id: RECENT_ROW, label: recent }, ...collections.map(c => ({ id: c.id, label: `${c.name} (${c.count})` }))],
        summaries: Object.fromEntries(CATEGORY_IDS.map(id => [id, categorySummary(id, s, summaryContext)])) as Record<CategoryId, string>,
        screensaverAvailable: saverAvailable,
        game: game ? { name: game.name, match: matchLine(overrideId, hltb), matched: hltb?.status === 'found', override: overrideId !== null } : null,
        fetching: { running: fetching.running, found: fetching.found, done: fetching.done, total: fetching.total },
        update: { line: updateLine(update), available: update.status === 'available' ? update.release.version : null, checking: update.status === 'checking', installing },
        version: update.current ?? '',
        error,
    };
    const a: GgActions = {
        store: settings,
        setMenuEnabled: value => menuPreferences.setEnabled(value),
        setSocialKeyboard: mode => menuPreferences.setSocialKeyboard(mode),
        run: change => { setError(''); void change.catch(() => setError('Could not save this setting. Try again.')); },
        open: viewId => dispatch({ type: 'push', viewId }),
        back: () => dispatch({ type: 'back' }),
        changeMatch: () => openPlugin(PLUGIN_NAME),
        openHltb: () => {
            if (hltb?.status !== 'found') return;
            close();
            Navigation.NavigateToExternalWeb(`https://howlongtobeat.com/game/${hltb.gameId}`);
        },
        removeOverride: () => {
            if (!game) return;
            void overrides.remove(game.appId).then(() => setOverrideId(null), () => setError('Could not remove the override. Try again.'));
        },
        preview: () => { close(); previewScreensaver(); },
        togglePreload: () => { if (fetching.running) fetchAll.stop(); else void fetchAll.start(); },
        clearCache: () => { void cache.clear().then(() => toaster.toast({ title: PLUGIN_NAME, body: 'Cached data cleared.' }), () => setError('Could not clear cached data. Try again.')); },
        checkUpdate: recheck,
        installUpdate: () => {
            if (update.status !== 'available') return;
            const release = update.release;
            close();
            void gate.run(() => installUpdate(release)).then(started => {
                if (started === false) toaster.toast({ title: PLUGIN_NAME, body: 'Could not start the install. Try again or use the release page.' });
            });
        },
        chooseVersion: () => openPlugin(PLUGIN_NAME),
    };
    if (top === HOME_ROW_VIEW) return <HomeRowPicker v={v} a={a} />;
    const category = /^gg:([a-z-]+)$/.exec(top)?.[1] as CategoryId | undefined;
    const Page = category && CATEGORY_PAGES[category];
    return Page ? <Page v={v} a={a} /> : <GameGlanceGrid v={v} a={a} />;
}
```

Checks for this step, before moving on (run each, fix only if it fails):
- `grep -n "export.*menuPreferences" src/menu/startMenu.ts` must show an export. If `menuPreferences` is not exported from `startMenu.ts`, import it from `'../preferences'` instead.
- `grep -n "fetchAll.start\|fetchAll.stop\|running\|found\|done\|total" src/data/fetchAll.ts | head` must show those names (they are used the same way in `SettingsPanel.tsx`).
- `grep -n "count" src/home/collections.ts | head -3` must show `count` on `HomeCollection`.

- [ ] **Step 5: Edit `src/menu/components/MenuShell.tsx`**

1. Add two imports below `import { NotificationsPanel } from './NotificationsPanel';`:

```ts
import { PluginsSection } from './PluginsSection';
import { pluginStyles } from '../pluginStyles';
```

2. Directly above the line `if (state.section === 'more' && !showingNotifications) content = <MorePanel ...`, add:

```tsx
    if (content === undefined && state.section === 'plugins') content = <PluginsSection state={state} dispatch={dispatch} handoff={enterNative} close={close} />;
```

3. Replace `<style>{menuStyles}</style>` with `<style>{menuStyles + pluginStyles}</style>`.

Leave `NATIVE_TABS.plugins = 'decky'` as it is (the fallback heading no longer shows for Plugins, but the entry stays harmless).

- [ ] **Step 6: Run all tests, typecheck and build**

Run: `npx vitest run && npx tsc --noEmit && npx rollup -c`
Expected: every test passes (see the flaky-test note), tsc prints nothing, rollup finishes without errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/UpdatesSection.tsx src/menu/pluginStyles.ts src/menu/components/PluginsSection.tsx src/menu/components/MenuShell.tsx tests/menu/pluginStyles.test.ts
```
Commit message: `menu: the Plugins section lists plugins and opens Game Glance's settings inside the menu`

---

### Task 8: Decky's panel in the same six groups

**Files:**
- Modify: `src/components/SettingsPanel.tsx`, `src/menu/components/MenuPreferences.tsx`
- Delete: `src/components/settingsRows.ts`, `tests/components/settingsRows.test.ts`

**Interfaces:**
- Consumes: `homeRows`, `statusRows`, `everyPageAvailable`, `matchLine`, `HomeRow`, `StatusRow` (Task 2).

No new test: `SettingsPanel` uses hooks and cannot be called as a function. The rows it shows are pinned by Task 2's tests; tsc and the build check the rest, and Michael checks it by eye in Task 9.

- [ ] **Step 1: Imports in `SettingsPanel.tsx`**

Replace `import { SpotlightRow, spotlightRows } from './settingsRows';` with:

```ts
import { everyPageAvailable, homeRows, HomeRow, matchLine, StatusRow, statusRows } from '../data/settingsCategories';
```

- [ ] **Step 2: Replace the match line**

Replace this block:

```ts
    const match = overrideId !== null
        ? `Override: HowLongToBeat #${overrideId}`
        : hltb?.status === 'found'
            ? `Automatic: HowLongToBeat #${hltb.gameId}`
            : hltb?.status === 'notFound'
                ? 'Automatic: no match'
                : 'Automatic';
```

with:

```ts
    const match = matchLine(overrideId, hltb);
```

- [ ] **Step 3: Split the row record in two**

The record starts at the comment `// Spotlight Home's rows, shown in settingsRows' order: each only while the row it depends on is on.` and ends at the `};` before `return (`. In it:

1. Change the comment and first line from

```ts
    // Spotlight Home's rows, shown in settingsRows' order: each only while the row it depends on is on.
    const spotlightRow: Record<SpotlightRow, ReactElement> = {
```

to

```ts
    // Home's and the status bar's rows, in settingsCategories' order: each only while the row it depends on is on.
    const homeRow: Record<HomeRow, ReactElement> = {
```

2. Cut the four entries `statusBar: (...)`, `expandedControls: (...)`, and `statusAvatar: (...)` out of that record (they are between `wishlistDeals` and `news`). Keep `spotlightHome`, `gamesRow`, `rowSort`, `rowStyle`, `grayUninstalled`, `wishlistDeals`, `news`, `friends`, `recommended` in `homeRow`.

3. Directly after the closing `};` of `homeRow`, add the status record (the same controls, with On every page split into its own row and its rule from `everyPageAvailable`):

```tsx
    const statusRow: Record<StatusRow, ReactElement> = {
        statusBar: (
            <ToggleField
                label="Status bar"
                description="Clock, battery and connection at the top-right. Moving up to Steam's own top bar hides it."
                checked={homeStatusBar}
                onChange={(value) => settings.setHomeStatusBar(value)}
            />
        ),
        statusAvatar: (
            <ToggleField
                label="Profile picture in the status bar"
                description="Shows your avatar, round and ringed in your online colour, instead of the dot."
                checked={statusAvatar}
                onChange={(value) => settings.setStatusAvatar(value)}
            />
        ),
        expandedControls: (
            <ToggleField label="Expanded Home controls" description="Matching controller prompts and individually selectable status items."
                checked={homeExpandedControls} onChange={value => settings.setHomeExpandedControls(value)} />
        ),
        everyPage: (
            <ToggleField label="On every page" description="Use the status bar and footer on every Steam page, not only Home."
                disabled={!everyPageAvailable({ enabled, spotlightHome, homeStatusBar, homeExpandedControls })}
                checked={chromeEveryPage} onChange={value => settings.setChromeEveryPage(value)} />
        ),
    };
```

- [ ] **Step 4: Replace the sections in `return (...)`**

The current order is: Game page, Home page, Appearance, Screensaver, HowLongToBeat match, Data, `<MenuPreferences />`, `<UpdatesSection />`. Rearrange to the new order below. Every inner control is moved unchanged unless shown here; only the `PanelSection` wrappers, their titles and their order change.

```tsx
    return (
        <>
            <PanelSection title="Home">
                {homeRows({ spotlightHome, feedTabs }, rowChosen !== RECENT_ROW).map((row) => (
                    <PanelSectionRow key={row}>{homeRow[row]}</PanelSectionRow>
                ))}
            </PanelSection>
            <PanelSection title="Game page">
                {/* the Clean look row, exactly as it is today, still inside {enabled && (...)} */}
                {/* then the whole content of today's "HowLongToBeat match" section: {game ? (<>...</>) : (<PanelSectionRow>Open a game page first.</PanelSectionRow>)} */}
            </PanelSection>
            <PanelSection title="Status bar & footer">
                {statusRows({ spotlightHome, homeStatusBar }).length === 0
                    ? <PanelSectionRow>Turn on Spotlight Home to use the status bar and footer.</PanelSectionRow>
                    : statusRows({ spotlightHome, homeStatusBar }).map((row) => <PanelSectionRow key={row}>{statusRow[row]}</PanelSectionRow>)}
            </PanelSection>
            <MenuPreferences />
            <PanelSection title="Screensaver">
                {/* today's Screensaver section content, unchanged */}
            </PanelSection>
            <PanelSection title="General">
                <PanelSectionRow>
                    <ToggleField label="Game Glance" checked={enabled} onChange={(value) => settings.setEnabled(value)} />
                </PanelSectionRow>
                {/* then today's three Appearance rows, unchanged: Game logo, Hero art, Page shading */}
            </PanelSection>
            <PanelSection title="Data">
                {/* today's Data section content, unchanged */}
            </PanelSection>
            <UpdatesSection />
        </>
    );
```

Replace each `{/* ... */}` comment with the real JSX it names, moved from the old sections. When done, no `{/* */}` comments from this step may remain, the old "Appearance" and "HowLongToBeat match" sections must be gone, and `ToggleField label="Game Glance"` must appear exactly once.

- [ ] **Step 5: Rename the menu section in Decky**

In `src/menu/components/MenuPreferences.tsx` change `<PanelSection title="Floating menu · local preview">` to `<PanelSection title="Menu">`.

- [ ] **Step 6: Delete the old rows module**

```bash
git rm src/components/settingsRows.ts tests/components/settingsRows.test.ts
```

Then `grep -rn "settingsRows\|spotlightRows\|SpotlightRow" src tests` must print nothing.

- [ ] **Step 7: Run all tests, typecheck and build**

Run: `npx vitest run && npx tsc --noEmit && npx rollup -c`
Expected: all pass; tsc prints nothing; the build ends without errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/SettingsPanel.tsx src/menu/components/MenuPreferences.tsx
```
Commit message: `settings: Decky's panel in the same six groups as the menu`

---

### Task 9: Ally check (controller session only; not for the implementer)

Done by the controller with Michael, on the ROG Xbox Ally (ssh host `ally`). Rules: install only while the in-game menu is closed (`IsAnySideMenuVisible()` false); back up the current `dist/index.js` on the device first; copy with scp and compare md5; reload the plugin with the IIFE (`(()=>{const g=DeckyPluginLoader.plugins.find(x=>x.name==="Game Glance");DeckyPluginLoader.importPlugin(g.name,g.version);return "reloaded"})()`) or restart Steam; CEF probes stay read-only.

Michael checks, menu open on Home and in a game:
- Plugins list: every plugin in Decky's order, icons, "Settings ›" on Game Glance, "Opens in Steam ↗" on others.
- Another plugin opens Decky straight on its panel.
- Game Glance grid → each page → B back lands on the card it came from → B back lands on Game Glance in the list.
- Change a value in our menu, see it in Decky's panel, and the other way round.
- Turning off "Game Glance menu" or "Game Glance" closes our menu.
- Preview, Change match, Choose version and Update close our menu first.
