import type { Settings } from '../data/settings';

/**
 * Spotlight Home's settings, in display order. With Home off only its main toggle is shown.
 * Wishlist deals depend on Recommended, and the profile picture depends on Status bar.
 * Shared Game logo and Hero art controls live in the separate Appearance section.
 */
export type SpotlightRow =
    | 'spotlightHome'
    | 'gamesRow'
    | 'rowSort'
    | 'rowStyle'
    | 'grayUninstalled'
    | 'news'
    | 'friends'
    | 'recommended'
    | 'wishlistDeals'
    | 'statusBar'
    | 'statusAvatar';

/** A collection Games row has a sort order; the recent games do not. */
export function spotlightRows(s: Pick<Settings, 'spotlightHome' | 'homeStatusBar' | 'feedTabs'>, collectionRow: boolean): SpotlightRow[] {
    const rows: SpotlightRow[] = ['spotlightHome'];
    if (!s.spotlightHome) return rows;
    rows.push('gamesRow');
    if (collectionRow) rows.push('rowSort');
    rows.push('rowStyle', 'grayUninstalled', 'news', 'friends', 'recommended');
    if (s.feedTabs.recommended) rows.push('wishlistDeals');
    rows.push('statusBar');
    if (s.homeStatusBar) rows.push('statusAvatar');
    return rows;
}
