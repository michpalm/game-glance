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
