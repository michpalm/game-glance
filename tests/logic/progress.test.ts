import { describe, expect, it } from 'vitest';
import { beyondCaption, computeProgress, HltbTimes, towardCaption } from '../../src/logic/progress';

const W3: HltbTimes = { main: 51.7, mainExtras: 103.8, completionist: 175.3 };

describe('computeProgress', () => {
    it('measures against the first unreached tier', () => {
        expect(computeProgress(40.1, W3)).toEqual({ kind: 'toward', tier: 'main', goalHours: 51.7, percent: 77 });
        expect(computeProgress(68.4, W3)).toEqual({ kind: 'toward', tier: 'mainExtras', goalHours: 103.8, percent: 65 });
    });
    it('moves to the next tier at exact equality', () => {
        expect(computeProgress(51.7, W3)).toMatchObject({ kind: 'toward', tier: 'mainExtras' });
    });
    it('reports beyond the last available tier', () => {
        expect(computeProgress(200, W3)).toEqual({ kind: 'beyond', lastTier: 'completionist' });
        expect(computeProgress(60, { main: 50, mainExtras: null, completionist: null })).toEqual({ kind: 'beyond', lastTier: 'main' });
    });
    it('skips missing tiers', () => {
        expect(computeProgress(5, { main: null, mainExtras: 18, completionist: null })).toEqual({
            kind: 'toward', tier: 'mainExtras', goalHours: 18, percent: 27,
        });
    });
    it('handles not played and no times', () => {
        expect(computeProgress(0, W3)).toEqual({ kind: 'notPlayed' });
        expect(computeProgress(Number.NaN, W3)).toEqual({ kind: 'notPlayed' });
        expect(computeProgress(10, { main: null, mainExtras: null, completionist: null })).toEqual({ kind: 'noTimes' });
    });
});

describe('beyondCaption', () => {
    it('names the last tier that was actually passed', () => {
        expect(beyondCaption('completionist')).toBe('Past completionist time');
        expect(beyondCaption('mainExtras')).toBe('Past main + extras time');
        expect(beyondCaption('main')).toBe('Past main story time');
    });
    it('does not claim completionist when HLTB has no 100% time', () => {
        const progress = computeProgress(20, { main: 10, mainExtras: 15, completionist: null });
        expect(progress).toEqual({ kind: 'beyond', lastTier: 'mainExtras' });
    });
});

describe('towardCaption', () => {
    it('says how many hours are left to the next tier', () => {
        expect(towardCaption(2.2, 35.3, 'main', 'en-US')).toBe('33.1 h left in main story');
        expect(towardCaption(40, 45.3, 'mainExtras', 'en-US')).toBe('5.3 h left in main + extras');
        expect(towardCaption(50, 55.9, 'completionist', 'en-US')).toBe('5.9 h left to 100%');
    });
    it('uses the Steam language’s number format and never shows zero hours left', () => {
        expect(towardCaption(2.2, 35.3, 'main', 'sv-SE')).toBe('33,1 h left in main story');
        expect(towardCaption(35.29, 35.3, 'main', 'en-US')).toBe('< 0.1 h left in main story');
    });
});
