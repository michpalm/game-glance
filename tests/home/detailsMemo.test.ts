import { afterEach, describe, expect, it } from 'vitest';
import { DETAILS_MEMO_MAX, memoAchievements, memoDetails, noteDetails, resetDetailsMemo } from '../../src/home/detailsMemo';

describe('detailsMemo', () => {
    afterEach(resetDetailsMemo);

    it("keeps the hero and header file names from Steam's details callback, the latest winning", () => {
        noteDetails(7, { libraryAssets: { strHeroImage: 'h1.jpg', strHeaderImage: 'x.jpg', logoPosition: {} }, strDisplayName: 'G' });
        expect(memoDetails(7)).toEqual({ strHeroImage: 'h1.jpg', strHeaderImage: 'x.jpg' });
        noteDetails(7, { libraryAssets: { strHeroImage: 'h2.jpg' } });
        expect(memoDetails(7)).toEqual({ strHeroImage: 'h2.jpg' });
    });
    it('ignores details without assets, broken ids and junk', () => {
        for (const junk of [undefined, null, 5, 'x', {}, { libraryAssets: null }, { libraryAssets: 'x' }]) noteDetails(8, junk);
        expect(memoDetails(8)).toBeUndefined();
        noteDetails(0, { libraryAssets: { strHeroImage: 'a' } });
        noteDetails(Number.NaN, { libraryAssets: { strHeroImage: 'a' } });
        expect(memoDetails(0)).toBeUndefined();
    });
    it('is bounded: the oldest game goes first', () => {
        for (let id = 1; id <= DETAILS_MEMO_MAX + 2; id++) noteDetails(id, { libraryAssets: { strHeroImage: `${id}.jpg` } });
        expect(memoDetails(1)).toBeUndefined();
        expect(memoDetails(2)).toBeUndefined();
        expect(memoDetails(3)).toEqual({ strHeroImage: '3.jpg' });
        expect(memoDetails(DETAILS_MEMO_MAX + 2)).toEqual({ strHeroImage: `${DETAILS_MEMO_MAX + 2}.jpg` });
    });
});

describe('detailsMemo achievements', () => {
    afterEach(() => resetDetailsMemo());
    it('keeps the achievement counts the callback carries, even without library assets', () => {
        noteDetails(292030, { achievements: { nTotal: 78, nAchieved: 13 } });
        expect(memoAchievements(292030)).toEqual({ achieved: 13, total: 78 });
        noteDetails(292030, { achievements: { nTotal: 78, nAchieved: 14 }, libraryAssets: { strHeroImage: 'h.jpg' } });
        expect(memoAchievements(292030)).toEqual({ achieved: 14, total: 78 });
        expect(memoDetails(292030)?.strHeroImage).toBe('h.jpg');
    });
    it('ignores a game with none (0 total) or junk, and keeps the last good counts', () => {
        noteDetails(5, { achievements: { nTotal: 10, nAchieved: 2 } });
        noteDetails(5, { achievements: { nTotal: 0, nAchieved: 0 } });
        noteDetails(5, { achievements: 'x' });
        noteDetails(5, null);
        expect(memoAchievements(5)).toEqual({ achieved: 2, total: 10 });
        expect(memoAchievements(6)).toBeUndefined();
    });
});
