import { describe, expect, it } from 'vitest';
import { FEED_TAB_IDS, FEED_TABS_DEFAULT, feedTabsOf, shownTabs } from '../../src/home/feedTabs';

describe('feedTabsOf', () => {
    it('defaults every tab on', () => expect(feedTabsOf(undefined)).toEqual({ news: true, friends: true, recommended: true }));
    it('reads each field on its own', () => expect(feedTabsOf({ news: false, friends: 'no' })).toEqual({ news: false, friends: true, recommended: true }));
    it('ignores arrays, strings and null', () => {
        for (const v of [[false], 'off', null, 0]) expect(feedTabsOf(v)).toEqual(FEED_TABS_DEFAULT);
    });
});

describe('shownTabs', () => {
    it('keeps the order What\'s new, Friends, Recommended', () => {
        expect(FEED_TAB_IDS).toEqual(['news', 'friends', 'recommended']);
        expect(shownTabs({ news: true, friends: true, recommended: true })).toEqual(['news', 'friends', 'recommended']);
    });
    it('drops tabs that are off', () => expect(shownTabs({ news: false, friends: true, recommended: false })).toEqual(['friends']));
    it('is empty with all off', () => expect(shownTabs({ news: false, friends: false, recommended: false })).toEqual([]));
});
