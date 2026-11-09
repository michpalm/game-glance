import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CATEGORY_PAGES, GamePage, GeneralPage, HomePage, HomeRowPicker, MenuPage, ScreensaverPage, StatusBarPage, VersionPicker } from '../../src/menu/components/GameGlancePages';
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
        settings, menuEnabled: true, menuReady: true, restyleSteamSettings: true, socialKeyboard: 'compact', rowChosen: 'recent', rowName: 'Recent games', collectionRow: false,
        rowChoices: [{ id: 'recent', label: 'Recent games' }, { id: 'c1', label: 'Backlog (12)' }],
        summaries: {} as GgValues['summaries'], screensaverAvailable: true,
        game: { name: 'Monster Hunter Rise', match: 'Automatic: HowLongToBeat #1', matched: true, override: false },
        fetching: { running: false, found: 0, done: 0, total: 0 },
        update: { line: 'Version 4.0.0 · up to date', available: null, checking: false, installing: false },
        versions: { showPrereleases: false, note: 'Stable versions. Decky asks before installing.', loading: false, installing: false,
            choices: [{ version: '4.0.0', label: '4.0.0 · latest stable · installed', installed: true, prerelease: false }, { version: '3.6.1', label: '3.6.1', installed: false, prerelease: false }] },
        version: '4.0.0', error: '', ...change,
    };
}
function actions() {
    const store = new Proxy({}, { get: (target: Record<string, any>, key: string) => target[key] ??= vi.fn(() => Promise.resolve()) });
    const a = { store, setRestyleSteamSettings: vi.fn(() => Promise.resolve()), setMenuEnabled: vi.fn(() => Promise.resolve()), setSocialKeyboard: vi.fn(() => Promise.resolve()), run: vi.fn(), open: vi.fn(), back: vi.fn(),
        changeMatch: vi.fn(), openHltb: vi.fn(), removeOverride: vi.fn(), preview: vi.fn(), togglePreload: vi.fn(), clearCache: vi.fn(),
        checkUpdate: vi.fn(), installUpdate: vi.fn(), setShowPrereleases: vi.fn(), refreshVersions: vi.fn(), installVersion: vi.fn() };
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

it('Menu switches the menu, Steam Settings theme, and Social keyboard', () => {
    const a = actions();
    const page = MenuPage({ v: values(), a });
    expect(ids(page)).toEqual(['gg:menu:enabled', 'gg:menu:restyle-steam-settings', 'gg:menu:keyboard']);
    byId(page, 'gg:menu:enabled').props.onChange(false);
    expect(a.setMenuEnabled).toHaveBeenCalledWith(false);
    byId(page, 'gg:menu:restyle-steam-settings').props.onChange(false);
    expect(a.setRestyleSteamSettings).toHaveBeenCalledWith(false);
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
    it('opens Choose version inside the menu', () => {
        const a = actions();
        byId(GeneralPage({ v: values(), a }), 'gg:general:versions').props.onAction();
        expect(a.open).toHaveBeenCalledWith('gg:general:versions');
    });
    it('shows pre-load progress as a Stop button', () => {
        const page = GeneralPage({ v: values({ fetching: { running: true, found: 3, done: 4, total: 10 } }), a: actions() });
        expect(byId(page, 'gg:general:preload').props.children).toBe('Stop (4 / 10)');
    });
});

describe('Choose version', () => {
    it('lists the prerelease switch, each version, then Refresh', () => {
        expect(ids(VersionPicker({ v: values(), a: actions() }))).toEqual(['gg:versions:prereleases', 'gg:versions:v:4.0.0', 'gg:versions:v:3.6.1', 'gg:versions:refresh']);
    });
    it('marks the installed version and keeps it from reinstalling', () => {
        const installed = byId(VersionPicker({ v: values(), a: actions() }), 'gg:versions:v:4.0.0');
        expect(installed.props.selected).toBe(true);
        expect(installed.props.disabled).toBe(true);
    });
    it('installs a picked version and switches prereleases', () => {
        const a = actions();
        const page = VersionPicker({ v: values(), a });
        byId(page, 'gg:versions:v:3.6.1').props.onAction();
        expect(a.installVersion).toHaveBeenCalledWith('3.6.1');
        byId(page, 'gg:versions:prereleases').props.onChange(true);
        expect(a.setShowPrereleases).toHaveBeenCalledWith(true);
        byId(page, 'gg:versions:refresh').props.onAction();
        expect(a.refreshVersions).toHaveBeenCalledTimes(1);
    });
    it('disables every version while an install request is pending or loading', () => {
        for (const change of [{ installing: true }, { loading: true }]) {
            const page = VersionPicker({ v: values({ versions: { ...values().versions, ...change } }), a: actions() });
            expect(byId(page, 'gg:versions:v:3.6.1').props.disabled).toBe(true);
        }
    });
});

it('maps every category to its page', () => {
    expect(Object.keys(CATEGORY_PAGES)).toEqual(['home', 'game-page', 'status-bar', 'menu', 'screensaver', 'general']);
});
