import { describe, expect, it } from 'vitest';
import { formatHours } from '../../src/logic/format';
import { tr } from '../../src/i18n/steamText';
import { HLTB_COLUMNS, hltbFoundView, hltbNotFoundView, hltbTrack } from '../../src/logic/hltbCardView';
import { beyondCaption, HltbTimes, towardCaption } from '../../src/logic/progress';

const W3: HltbTimes = { main: 51.7, mainExtras: 103.8, completionist: 175.3 };
const h = (hours: number) => formatHours(hours, 'en-US');

describe('hltbFoundView', () => {
    it('three columns in page order, keyed as the page and Home name them (Main is "hltb")', () => {
        expect(HLTB_COLUMNS.map((c) => [c.key, c.label])).toEqual([['hltb', 'Main'], ['mainExtras', '+ Extras'], ['completionist', '100%']]);
        const v = hltbFoundView(W3, 40.1 * 60, 'en-US', true);
        expect(v.columns.map((c) => [c.key, c.label, c.value])).toEqual([
            ['hltb', 'Main', h(51.7)],
            ['mainExtras', '+ Extras', h(103.8)],
            ['completionist', '100%', h(175.3)],
        ]);
    });

    it('a missing time reads "—"', () => {
        const v = hltbFoundView({ main: 10, mainExtras: null, completionist: null }, 60, 'en-US', true);
        expect(v.columns.map((c) => c.value)).toEqual([h(10), '—', '—']);
    });

    it('restyled: the caption follows the main story, no column is the goal', () => {
        const v = hltbFoundView(W3, 40.1 * 60, 'en-US', true);
        expect(v.caption).toBe(towardCaption(40.1, 51.7, 'main', 'en-US'));
        expect(v.columns.some((c) => c.goal)).toBe(false);
    });

    it('restyled: the bar is the whole game, Main, + Extras and 100% as stretches to scale, your hours along all of it', () => {
        const v = hltbFoundView(W3, 40.1 * 60, 'en-US', true);
        expect(v.track?.ends.map(Math.round)).toEqual([29, 59, 100]);
        expect(v.bar).toBe(Math.round((40.1 / 175.3) * 100));
        expect(hltbFoundView(W3, 400 * 60, 'en-US', true).bar).toBe(100);
    });

    it("restyled: HowLongToBeat's rating after the caption", () => {
        expect(hltbFoundView(W3, 60 * 60, 'en-US', true, 73).caption).toBe('Main story complete · rated 73%');
        expect(hltbFoundView(W3, 0, 'en-US', true, 73).caption).toBe('Not played yet · rated 73%');
        expect(hltbFoundView(W3, 0, 'en-US', true, null).caption).toBe('Not played yet');
        expect(hltbFoundView({ main: null, mainExtras: null, completionist: null }, 0, 'en-US', true, 80).caption).toBe('rated 80%');
    });

    it('not played: the stretches alone, no fill', () => {
        const v = hltbFoundView(W3, 0, 'en-US', true);
        expect(v.track).not.toBeNull();
        expect(v.bar).toBe(0);
        expect(v.caption).toBe('Not played yet');
    });

    it('only one time known, or times out of order: the plain bar', () => {
        expect(hltbTrack({ main: 10, mainExtras: null, completionist: null })).toBeNull();
        expect(hltbFoundView({ main: 10, mainExtras: null, completionist: null }, 60, 'en-US', true).track).toBeNull();
        // A longer time listed before a shorter one ends no stretch.
        expect(hltbTrack({ main: 20, mainExtras: 15, completionist: 40 })?.ends).toEqual([50, 100]);
    });

    it('not restyled: no track, no rating', () => {
        const v = hltbFoundView(W3, 40.1 * 60, 'en-US', false, 73);
        expect(v.track).toBeNull();
        expect(v.caption).not.toContain('rated');
    });

    it('not restyled: the goal column is the tier being worked toward', () => {
        const v = hltbFoundView(W3, 68.4 * 60, 'en-US', false);
        expect(v.columns.map((c) => c.goal)).toEqual([false, true, false]);
        expect(v.bar).toBe(65);
        expect(v.caption).toBe(towardCaption(68.4, 103.8, 'mainExtras', 'en-US'));
    });

    it('not restyled, beyond the last tier: a full bar and the beyond caption', () => {
        const v = hltbFoundView(W3, 200 * 60, 'en-US', false);
        expect(v.bar).toBe(100);
        expect(v.caption).toBe(beyondCaption('completionist'));
    });

    it('no times at all: no bar and no caption', () => {
        const v = hltbFoundView({ main: null, mainExtras: null, completionist: null }, 600, 'en-US', true);
        expect(v.bar).toBeNull();
        expect(v.caption).toBeNull();
    });
});

describe('hltbNotFoundView', () => {
    it("the no-match card's two lines, the page's and Home's copy alike: no matches, and where to set the right game", () => {
        expect(hltbNotFoundView()).toEqual({ muted: tr('noMatches'), caption: 'Set the right game in Quick Access → Game Glance' });
    });
    it('with an override: its id, and where to check or remove it', () => {
        expect(hltbNotFoundView(12345)).toEqual({ muted: `#12345 · ${tr('noMatches')}`, caption: 'Check or remove the override in Quick Access → Game Glance' });
    });
});
