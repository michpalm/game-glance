import { afterEach, describe, expect, it } from 'vitest';
import { DETAILS_MEMO_MAX, memoDetails, noteDetails, resetDetailsMemo } from '../../src/home/detailsMemo';

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
