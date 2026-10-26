import { beforeEach, describe, expect, it } from 'vitest';
import {
    DEFAULT_MEMORY, markLeaving, noteHome, recentIndexFor, recentRefFor, resetHomeMemory, RESTORE_MAX_AGE_MS, restoreStep, takeRestore,
} from '../../src/home/homeMemory';

describe('recent refs', () => {
    const ids = [10, 20, 30];
    it('maps a focus index to a game or the Library card', () => {
        expect(recentRefFor(1, ids)).toEqual({ kind: 'game', appId: 20 });
        expect(recentRefFor(3, ids)).toEqual({ kind: 'library' });
        expect(recentRefFor(99, ids)).toEqual({ kind: 'library' });
        expect(recentRefFor(-1, ids)).toEqual({ kind: 'game', appId: 10 });
        expect(recentRefFor(0, [])).toBeNull();
        expect(recentRefFor(NaN, ids)).toBeNull();
    });
    it('finds the game again even when the row was reordered, else the first', () => {
        expect(recentIndexFor({ kind: 'game', appId: 30 }, [30, 10, 20])).toBe(0);
        expect(recentIndexFor({ kind: 'game', appId: 20 }, ids)).toBe(1);
        expect(recentIndexFor({ kind: 'game', appId: 99 }, ids)).toBe(0);
        expect(recentIndexFor({ kind: 'library' }, ids)).toBe(3);
    });
});

describe('restoreStep', () => {
    it('selects the remembered card when it is there', () => {
        expect(restoreStep(['a', 'b', 'c'], 'b', false, false)).toEqual({ card: 1 });
    });
    it('goes to the tab when nothing was remembered', () => {
        expect(restoreStep(['a'], null, false, false)).toBe('tab');
    });
    it('waits for a late card, then settles for the tab', () => {
        expect(restoreStep([], 'deal:1', false, false)).toBe('wait');
        expect(restoreStep(['a'], 'deal:1', false, false)).toBe('wait');
        expect(restoreStep(['a'], 'deal:1', false, true)).toBe('tab');
    });
    it('does not wait on a tab whose cards are final', () => {
        expect(restoreStep(['a'], 'gone', true, false)).toBe('tab');
        expect(restoreStep([], 'gone', true, false)).toBe('tab');
    });
});

describe('session memory', () => {
    beforeEach(resetHomeMemory);
    it('restores nothing on a cold start', () => {
        expect(takeRestore(1000)).toBeNull();
        markLeaving(1000); // nothing noted yet
        expect(takeRestore(1001)).toBeNull();
    });
    it('restores what was noted after leaving for a page, once', () => {
        noteHome({ zone: 'feed', tab: 'recommended', feedKey: 'deal:5' });
        noteHome({ recent: { kind: 'game', appId: 7 }, action: 3 });
        markLeaving(1000);
        expect(takeRestore(2000)).toEqual({ zone: 'feed', recent: { kind: 'game', appId: 7 }, action: 3, tab: 'recommended', feedKey: 'deal:5' });
        expect(takeRestore(2001)).toBeNull();
    });
    it('does not restore a visit that did not leave for a page', () => {
        noteHome({ zone: 'tabs', tab: 'friends' });
        expect(takeRestore(2000)).toBeNull();
    });
    it('does not restore after a long absence or a clock that went backwards', () => {
        noteHome({ tab: 'friends' });
        markLeaving(1000);
        expect(takeRestore(1000 + RESTORE_MAX_AGE_MS + 1)).toBeNull();
        markLeaving(5000);
        expect(takeRestore(4000)).toBeNull();
    });
    it('the default restores focus on the action row (the recents row is display only), game 1 selected', () => {
        expect(DEFAULT_MEMORY.zone).toBe('recents');
        expect(DEFAULT_MEMORY.action).toBe(0);
    });
    it('restores the selected Library card with the zone and tab (bumper navigation)', () => {
        noteHome({ zone: 'actions', recent: { kind: 'library' }, action: 0, tab: 'friends' });
        markLeaving(100);
        const got = takeRestore(200)!;
        expect(got.zone).toBe('actions');
        expect(recentIndexFor(got.recent, [10, 20])).toBe(2);
        expect(got.tab).toBe('friends');
    });
    it('partial updates merge over the defaults and the returned copy is detached', () => {
        noteHome({ tab: 'friends' });
        markLeaving(10);
        const got = takeRestore(11);
        expect(got).toEqual({ ...DEFAULT_MEMORY, tab: 'friends' });
        got!.tab = 'news';
        markLeaving(12);
        expect(takeRestore(13)?.tab).toBe('friends');
    });
});

describe('the remembered tab', () => {
    it('starts with no tab remembered', () => expect(DEFAULT_MEMORY.tab).toBeNull());
});
