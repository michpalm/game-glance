import type { Settings } from '../data/settings';

/**
 * Quick Access → Game Glance → Spotlight Home: the rows shown, in order (docs/superpowers/specs/2026-10-23-feed-tabs-design.md).
 * A row shows only while the row it depends on is on: Home-only rows under Spotlight Home, the profile picture under
 * Status bar, wishlist deals under Recommended (they are its second row). Status bar, Game logo and Hero art also act on
 * the restyled game page, which Clean look turns on without Spotlight Home (home/mode.ts), so they always show; the
 * Games row and its sort also pick the Game Glance screensaver's games, so they show while it is on. Pure.
 */
export type SpotlightRow =
    | 'spotlightHome'
    | 'gamesRow'
    | 'rowSort'
    | 'rowStyle'
    | 'news'
    | 'friends'
    | 'recommended'
    | 'wishlistDeals'
    | 'statusBar'
    | 'statusAvatar'
    | 'gameLogo'
    | 'heroFit';

/**
 * `screensaverOn`: the Game Glance screensaver is on (and Steam has one). `collectionRow`: the Games row shows a
 * collection (which has a sort order; the recent games do not).
 */
export function spotlightRows(s: Pick<Settings, 'spotlightHome' | 'homeStatusBar' | 'feedTabs'> & { screensaverOn: boolean }, collectionRow: boolean): SpotlightRow[] {
    const rows: SpotlightRow[] = ['spotlightHome'];
    if (s.spotlightHome || s.screensaverOn) {
        rows.push('gamesRow');
        if (collectionRow) rows.push('rowSort');
    }
    if (s.spotlightHome) {
        rows.push('rowStyle', 'news', 'friends', 'recommended');
        if (s.feedTabs.recommended) rows.push('wishlistDeals');
    }
    rows.push('statusBar');
    if (s.homeStatusBar) rows.push('statusAvatar');
    rows.push('gameLogo', 'heroFit');
    return rows;
}
