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
