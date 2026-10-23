import { describe, expect, it } from 'vitest';
import { FEED_TAB_IDS, FEED_TABS_DEFAULT, feedTabsOf, nextTabId, refocusAfterMenu, restoreTabId, restoreZoneFor, shownTabs } from '../../src/home/feedTabs';

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

describe('restoreTabId', () => {
    it('keeps a remembered tab that is shown', () => expect(restoreTabId('friends', ['news', 'friends'])).toBe('friends'));
    it('falls back to the first shown tab for a tab now off', () => expect(restoreTabId('news', ['friends', 'recommended'])).toBe('friends'));
    it('uses the first shown tab with nothing remembered', () => expect(restoreTabId(null, ['recommended'])).toBe('recommended'));
    it('is null with no tab shown', () => expect(restoreTabId('news', [])).toBeNull());
});

describe('nextTabId', () => {
    it('keeps the selected tab while it is shown', () => expect(nextTabId('recommended', ['news', 'recommended'])).toBe('recommended'));
    it('moves to the first shown tab when the selected one is turned off', () => expect(nextTabId('news', ['friends', 'recommended'])).toBe('friends'));
    it('is null when the last tab is turned off', () => expect(nextTabId('friends', [])).toBeNull());
});

describe('restoreZoneFor', () => {
    it('keeps the remembered zone while the feed has a tab', () => {
        expect(restoreZoneFor('feed', true)).toBe('feed');
        expect(restoreZoneFor('actions', false)).toBe('actions');
    });
    it('lands on the game cards for a feed zone when every tab is off', () => {
        expect(restoreZoneFor('feed', false)).toBe('recents');
        expect(restoreZoneFor('tabs', false)).toBe('recents');
    });
    it('lands on the game cards without a remembered zone', () => expect(restoreZoneFor(undefined, true)).toBe('recents'));
});

describe('refocusAfterMenu', () => {
    it('leaves focus alone when Steam put it back on Home', () => expect(refocusAfterMenu(true, true, true)).toBeNull());
    it('focuses the selected tab when the feed is still up', () => expect(refocusAfterMenu(false, true, true)).toBe('tab'));
    it('focuses the game cards when the feed is gone', () => expect(refocusAfterMenu(false, false, true)).toBe('recents'));
    it('focuses the game cards when the feed was down', () => expect(refocusAfterMenu(false, true, false)).toBe('recents'));
});
