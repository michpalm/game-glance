import { afterEach, describe, expect, it } from 'vitest';
import { achievementsComplete, DETAILS_MEMO_MAX, keptUnlocked, knownAchievementFacts, memoAchievements, memoCloud, memoDetails, memoPlaytime, memoSpaceRequired, noteDetails, resetDetailsMemo, seedAchievements, spaceRequiredOf, setAchievementSink, withKnownAchievements } from '../../src/home/detailsMemo';

describe('detailsMemo', () => {
    afterEach(resetDetailsMemo);

    it("keeps the hero and header file names from Steam's details callback, the latest winning", () => {
        noteDetails(7, { libraryAssets: { strHeroImage: 'h1.jpg', strHeaderImage: 'x.jpg', logoPosition: {} }, strDisplayName: 'G' });
        expect(memoDetails(7)).toEqual({ strHeroImage: 'h1.jpg', strHeaderImage: 'x.jpg' });
        noteDetails(7, { libraryAssets: { strHeroImage: 'h2.jpg' } });
        expect(memoDetails(7)).toEqual({ strHeroImage: 'h2.jpg' });
    });
    it('keeps the logo file name too', () => {
        noteDetails(9, { libraryAssets: { strHeroImage: 'h.jpg', strLogoImage: 'abc/logo.png' } });
        expect(memoDetails(9)).toEqual({ strHeroImage: 'h.jpg', strLogoImage: 'abc/logo.png' });
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

describe('withKnownAchievements', () => {
    afterEach(resetDetailsMemo);
    it("fills a game's missing counts from the memo (the page's first frame, before Steam loads its details)", () => {
        noteDetails(268910, { achievements: { nTotal: 13, nAchieved: 4 } });
        expect(withKnownAchievements({ appId: 268910, isShortcut: false, achievements: null }).achievements).toEqual({ achieved: 4, total: 13 });
    });
    it("keeps Steam's own counts, and gives a shortcut or an unknown game nothing", () => {
        noteDetails(5, { achievements: { nTotal: 10, nAchieved: 2 } });
        const own = { appId: 5, isShortcut: false, achievements: { achieved: 3, total: 10 } };
        expect(withKnownAchievements(own)).toBe(own);
        expect(withKnownAchievements({ appId: 5, isShortcut: true, achievements: null }).achievements).toBeNull();
        expect(withKnownAchievements({ appId: 6, isShortcut: false, achievements: null }).achievements).toBeNull();
    });
});

describe('memoCloud', () => {
    afterEach(resetDetailsMemo);
    const cloud = (status: number) => ({ bCloudEnabledForApp: true, bCloudEnabledForAccount: true, bHasAnyLocalContent: true, eCloudStatus: status, nCloudProgressPercent: 0 });
    it("keeps the cloud fields Steam's details callback carries (its store has none for most games), the latest winning", () => {
        noteDetails(286690, { ...cloud(6), strDisplayName: 'x' });
        expect(memoCloud(286690)).toEqual(cloud(6));
        noteDetails(286690, cloud(3));
        expect(memoCloud(286690)?.eCloudStatus).toBe(3);
    });
    it('ignores details without them', () => {
        for (const junk of [undefined, null, 5, {}, { libraryAssets: { strHeroImage: 'h' } }, { bCloudEnabledForApp: 'yes' }]) noteDetails(8, junk);
        expect(memoCloud(8)).toBeUndefined();
    });
    it('is bounded like the art memo, and reset clears it', () => {
        for (let id = 1; id <= DETAILS_MEMO_MAX + 1; id++) noteDetails(id, cloud(3));
        expect(memoCloud(1)).toBeUndefined();
        expect(memoCloud(2)).toBeDefined();
        resetDetailsMemo();
        expect(memoCloud(2)).toBeUndefined();
    });
});

describe('the space a game needs (Steam: lDiskSpaceRequiredBytes)', () => {
    afterEach(resetDetailsMemo);
    it('keeps it from the details callback, and the latest one wins', () => {
        noteDetails(1455840, { lDiskSpaceRequiredBytes: 691079517 });
        expect(memoSpaceRequired(1455840)).toBe(691079517);
        noteDetails(1455840, { lDiskSpaceRequiredBytes: 700000000 });
        expect(memoSpaceRequired(1455840)).toBe(700000000);
    });
    it('ignores zero, junk and details without it', () => {
        noteDetails(2, { lDiskSpaceRequiredBytes: 0 });
        noteDetails(3, { lDiskSpaceRequiredBytes: '691079517' });
        noteDetails(4, { libraryAssets: {} });
        expect(memoSpaceRequired(2)).toBeUndefined();
        expect(memoSpaceRequired(3)).toBeUndefined();
        expect(memoSpaceRequired(4)).toBeUndefined();
    });
});

describe('details memo: play time', () => {
    it("keeps Steam's local play time from a game's details (a shortcut's lives only there), positive numbers only", () => {
        resetDetailsMemo();
        noteDetails(4203820957, { nPlaytimeForever: 21 });
        expect(memoPlaytime(4203820957)).toBe(21);
        noteDetails(4203820957, { nPlaytimeForever: 25 });
        expect(memoPlaytime(4203820957)).toBe(25);
        for (const junk of [0, -1, 'x', NaN, null]) noteDetails(5, { nPlaytimeForever: junk });
        expect(memoPlaytime(5)).toBeUndefined();
    });
});

describe('remembered achievements: the latest and rarest, kept and never erased by a thinner answer', () => {
    afterEach(() => resetDetailsMemo());
    const ach = (id: string, unlockedAt: number, pct: number) => ({ strID: id, strName: id.toUpperCase(), strImage: `${id}.jpg`, bAchieved: true, rtUnlocked: unlockedAt, flAchieved: pct });
    const full = { achievements: { nTotal: 115, nAchieved: 3, vecHighlight: [ach('a', 100, 50), ach('b', 300, 57.5), ach('c', 200, 4.2)], vecAchievedHidden: [] } };

    it('keeps the counts and only the two the card shows: the latest unlocked and the rarest', () => {
        noteDetails(475150, full);
        const known = memoAchievements(475150)!;
        expect(known.achieved).toBe(3);
        expect(known.unlocked!.map((u) => u.id)).toEqual(['b', 'c']);
        expect(achievementsComplete(475150)).toBe(true);
    });
    it('the latest and the rarest being the same one keeps one', () => {
        expect(keptUnlocked([{ id: 'x', name: 'X', image: '', unlockedAt: 9, globalPct: 1 }, { id: 'y', name: 'Y', image: '', unlockedAt: 1, globalPct: 9 }]).map((u) => u.id)).toEqual(['x']);
    });
    it('an answer with the counts but no list keeps the list already known', () => {
        noteDetails(475150, full);
        noteDetails(475150, { achievements: { nTotal: 115, nAchieved: 3 } });
        expect(memoAchievements(475150)!.unlocked!.map((u) => u.id)).toEqual(['b', 'c']);
    });
    it('counts only are not complete (the warm-up asks Steam once more); none unlocked is', () => {
        noteDetails(1, { achievements: { nTotal: 10, nAchieved: 2 } });
        expect(achievementsComplete(1)).toBe(false);
        noteDetails(2, { achievements: { nTotal: 10, nAchieved: 0 } });
        expect(achievementsComplete(2)).toBe(true);
        expect(achievementsComplete(3)).toBe(false);
    });
    it('persists the list, and only when something changed', () => {
        const writes: unknown[] = [];
        setAchievementSink((_id, known) => writes.push(known));
        noteDetails(475150, full);
        noteDetails(475150, full);
        noteDetails(475150, { achievements: { nTotal: 115, nAchieved: 3 } });
        expect(writes).toHaveLength(1);
        expect((writes[0] as { unlocked: unknown[] }).unlocked).toHaveLength(2);
    });
    it('seeds a persisted list (and an old entry with counts only), never over a fresher one', () => {
        seedAchievements(5, { achieved: 1, total: 4, unlocked: [{ id: 'q', name: 'Q', image: 'q.jpg', unlockedAt: 7, globalPct: 3 }, { junk: true }] });
        expect(memoAchievements(5)).toEqual({ achieved: 1, total: 4, unlocked: [{ id: 'q', name: 'Q', image: 'q.jpg', unlockedAt: 7, globalPct: 3 }] });
        seedAchievements(6, { achieved: 1, total: 4 });
        expect(memoAchievements(6)).toEqual({ achieved: 1, total: 4 });
        seedAchievements(5, { achieved: 0, total: 4, unlocked: [] });
        expect(memoAchievements(5)!.achieved).toBe(1);
    });
    it("the card: Steam's facts when complete, else the remembered ones; a thinner answer never replaces them", () => {
        noteDetails(475150, full);
        const remembered = knownAchievementFacts(475150, undefined)!;
        expect(remembered.unlocked.map((u) => u.id)).toEqual(['b', 'c']);
        // Steam has the details but not the record yet (it reads as "no achievements"): the remembered ones.
        expect(knownAchievementFacts(475150, { achieved: 0, total: 0, unlocked: [] })).toEqual(remembered);
        // Newer counts without the list: the counts from Steam, the list from memory.
        const newer = knownAchievementFacts(475150, { achieved: 4, total: 115, unlocked: [] })!;
        expect(newer.achieved).toBe(4);
        expect(newer.unlocked.map((u) => u.id)).toEqual(['b', 'c']);
        // A complete answer wins.
        const steam = { achieved: 4, total: 115, unlocked: [{ id: 'd', name: 'D', image: '', unlockedAt: 400, globalPct: 1 }] };
        expect(knownAchievementFacts(475150, steam)).toBe(steam);
        // Nothing remembered: Steam's, loading included.
        expect(knownAchievementFacts(9, undefined)).toBeUndefined();
    });
});

describe('spaceRequiredOf: the Install pill and the page read the same size', () => {
    afterEach(() => resetDetailsMemo());
    it("Steam's details first (Home had no size for games whose details callback it never got), else the noted one", () => {
        expect(spaceRequiredOf(1392820, { lDiskSpaceRequiredBytes: 331241105 })).toBe(331241105);
        expect(spaceRequiredOf(1392820, undefined)).toBeUndefined();
        noteDetails(1392820, { lDiskSpaceRequiredBytes: 300 });
        expect(spaceRequiredOf(1392820, undefined)).toBe(300);
        expect(spaceRequiredOf(1392820, { lDiskSpaceRequiredBytes: 0 })).toBe(300);
        expect(spaceRequiredOf(1392820, { lDiskSpaceRequiredBytes: 500 })).toBe(500);
    });
});
