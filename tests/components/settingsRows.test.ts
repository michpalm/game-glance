import { describe, expect, it } from 'vitest';
import { spotlightRows } from '../../src/components/settingsRows';

const on = { spotlightHome: true, homeStatusBar: true, feedTabs: { news: true, friends: true, recommended: true }, screensaverOn: false };

describe('spotlightRows (Quick Access: a row shows while the row it depends on is on)', () => {
    it('lists every row in order with everything on and a collection row', () =>
        expect(spotlightRows(on, true)).toEqual(['spotlightHome', 'gamesRow', 'rowSort', 'rowStyle', 'grayUninstalled', 'news', 'friends', 'recommended', 'wishlistDeals', 'statusBar', 'statusAvatar']));
    it('has no sort for the recent games row', () => expect(spotlightRows(on, false)).not.toContain('rowSort'));
    it('shows only the main toggle with Spotlight Home off', () =>
        expect(spotlightRows({ ...on, spotlightHome: false }, true)).toEqual(['spotlightHome']));
    it('hides all subordinate rows with Spotlight Home off even when the screensaver is on', () => {
        const screensaverOn = { ...on, spotlightHome: false, screensaverOn: true };
        expect(spotlightRows(screensaverOn, true)).toEqual(['spotlightHome']);
    });
    it('hides the profile picture with the status bar off', () => expect(spotlightRows({ ...on, homeStatusBar: false }, false)).not.toContain('statusAvatar'));
    it('hides wishlist deals with Recommended off', () =>
        expect(spotlightRows({ ...on, feedTabs: { ...on.feedTabs, recommended: false } }, false)).not.toContain('wishlistDeals'));
    it('keeps the tab switches with all tabs off', () =>
        expect(spotlightRows({ ...on, feedTabs: { news: false, friends: false, recommended: false } }, false)).toEqual(expect.arrayContaining(['news', 'friends', 'recommended'])));
});
