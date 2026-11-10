import { describe, expect, it } from 'vitest';
import { achievementsView, featuredProton, pageAchievementFacts, playTimeView, protonView, readAchievementFacts } from '../../src/logic/featuredViews';
import { formatLastPlayed } from '../../src/home/recents';

const DAY = 86400;
const NOW = 1793744695 + 7 * DAY;
const WOOD = {
    strID: 'WOOD', strName: 'Wood Riddance', strDescription: '', bAchieved: true, rtUnlocked: 1793744695, flAchieved: 91.3,
    strImage: 'https://shared.steamstatic.com/community_assets/images/apps/1127500/d6ac9e7d007702507c9ff7d673625032f0d7220d.jpg',
};
const BEIJING = { strID: 'BEIJING', strName: 'Beijing Tourist', strDescription: '', bAchieved: true, rtUnlocked: 1793744214, flAchieved: 74.8, strImage: 'https://example.test/b.jpg' };
const LOCKED = { strID: 'LOCKED', strName: 'Locked', strDescription: '', bAchieved: false, rtUnlocked: 0, flAchieved: 2, strImage: '' };
const details = { achievements: { nAchieved: 6, nTotal: 170, vecHighlight: [WOOD, LOCKED], vecAchievedHidden: [WOOD, BEIJING], vecUnachieved: [] } };

describe('protonView', () => {
    it('shows rating, reports and confidence', () => {
        const v = protonView({ status: 'found', tier: 'platinum', details: { total: 237, confidence: 'strong', trending: 'platinum', best: 'platinum' } });
        expect(v.title).toBe('ProtonDB');
        expect(v.columns).toEqual([
            { key: 'rating', label: 'Rating', value: 'Platinum', tone: 'platinum' },
            { key: 'reports', label: 'Reports', value: '237' },
            { key: 'confidence', label: 'Confidence', value: 'Strong' },
        ]);
        expect(v.caption).toBe('Trending Platinum · best reported Platinum');
    });
    it('keeps only the rating when an old cache entry has no details', () => {
        const v = protonView({ status: 'found', tier: 'gold' });
        expect(v.columns.map((c) => c.key)).toEqual(['rating']);
        expect(v.caption).toBeNull();
    });
    it('leaves out a column ProtonDB gave no value for (a summary without a report count or confidence)', () => {
        expect(protonView({ status: 'found', tier: 'gold', details: { total: null, confidence: 'good', trending: null, best: null } }).columns.map((c) => c.key)).toEqual(['rating', 'confidence']);
        expect(protonView({ status: 'found', tier: 'gold', details: { total: 12, confidence: null, trending: null, best: null } }).columns.map((c) => c.key)).toEqual(['rating', 'reports']);
        const bare = protonView({ status: 'found', tier: 'gold', details: { total: null, confidence: null, trending: 'gold', best: null } });
        expect(bare.columns.map((c) => c.key)).toEqual(['rating']);
        expect(bare.caption).toBe('Trending Gold');
    });
    it('says there is no rating', () => {
        expect(protonView({ status: 'none' }).empty).toBe('No ProtonDB rating yet');
        expect(protonView({ status: 'unavailable' }).empty).toBe('No ProtonDB rating yet');
    });
    it('is loading while unknown', () => {
        expect(protonView(undefined).loading).toBe(true);
    });
});

describe('readAchievementFacts', () => {
    it('keeps unlocked ones once each, newest first', () => {
        const f = readAchievementFacts(details)!;
        expect(f.achieved).toBe(6);
        expect(f.total).toBe(170);
        expect(f.unlocked.map((a) => a.id)).toEqual(['WOOD', 'BEIJING']);
        expect(f.unlocked[0]).toEqual({ id: 'WOOD', name: 'Wood Riddance', image: WOOD.strImage, unlockedAt: 1793744695, globalPct: 91.3 });
    });
    it('is undefined without achievements data', () => {
        expect(readAchievementFacts(undefined)).toBeUndefined();
        expect(readAchievementFacts({})).toBeUndefined();
        expect(readAchievementFacts({ achievements: { nAchieved: 'x' } })).toBeUndefined();
    });
});

describe('achievementsView', () => {
    const facts = readAchievementFacts(details)!;
    it('shows the latest, the bar and the rarest', () => {
        const v = achievementsView(facts, NOW, 'en-US');
        expect(v.icon).toEqual({ src: WOOD.strImage, label: `Latest · ${formatLastPlayed(1793744695, NOW, 'en-US')}`, value: 'Wood Riddance' });
        expect(v.icon!.label).toBe('Latest · 7 days ago');
        expect(v.bar).toBe(4);
        expect(v.caption).toBe('6 of 170 unlocked · rarest: Beijing Tourist (74.8% have it)');
    });
    it('ignores unknown rarity when picking the rarest', () => {
        const f = { ...facts, unlocked: [facts.unlocked[0], { ...facts.unlocked[1], globalPct: 0 }] };
        expect(achievementsView(f, NOW, 'en-US').caption).toBe('6 of 170 unlocked · rarest: Wood Riddance (91.3% have it)');
    });
    it('a rarest one fewer than 0.1% have says "<0.1%", not "0.0%"', () => {
        const f = { ...facts, unlocked: [facts.unlocked[0], { ...facts.unlocked[1], globalPct: 0.04 }] };
        expect(achievementsView(f, NOW, 'en-US').caption).toBe('6 of 170 unlocked · rarest: Beijing Tourist (<0.1% have it)');
        const tenth = { ...facts, unlocked: [facts.unlocked[0], { ...facts.unlocked[1], globalPct: 0.1 }] };
        expect(achievementsView(tenth, NOW, 'en-US').caption).toBe('6 of 170 unlocked · rarest: Beijing Tourist (0.1% have it)');
    });
    it('has no empty-total card', () => {
        expect(achievementsView({ achieved: 0, total: 0, unlocked: [] }, NOW, 'en-US').empty).toBe('No achievements');
    });
    it('shows how many to unlock when none are', () => {
        const v = achievementsView({ achieved: 0, total: 170, unlocked: [] }, NOW, 'en-US');
        expect(v.icon).toBeUndefined();
        expect(v.caption).toBe('170 to unlock');
        expect(v.bar).toBe(0);
    });
    it('keeps the count when Steam lists none of the unlocked ones', () => {
        const v = achievementsView({ achieved: 6, total: 170, unlocked: [] }, NOW, 'en-US');
        expect(v.icon).toBeUndefined();
        expect(v.caption).toBe('6 of 170 unlocked');
        expect(v.bar).toBe(4);
    });
    it('drops the time when the unlock time is unknown', () => {
        const f = { achieved: 1, total: 2, unlocked: [{ id: 'a', name: 'A', image: '', unlockedAt: 0, globalPct: 5 }] };
        expect(achievementsView(f, NOW, 'en-US').icon!.label).toBe('Latest');
    });
    it('is loading while unknown', () => {
        expect(achievementsView(undefined, NOW, 'en-US').loading).toBe(true);
    });
});

describe('playTimeView', () => {
    it('shows total in the accent, two weeks and last played', () => {
        const v = playTimeView({ minutes: 68, twoWeeks: 68, lastPlayed: NOW - 6 * DAY }, NOW, 'en-US');
        expect(v.columns).toEqual([
            { key: 'total', label: 'Total', value: '1.1 h', accent: true },
            { key: 'twoWeeks', label: 'Past 2 weeks', value: '1.1 h' },
            { key: 'lastPlayed', label: 'Last played', value: '6 days ago' },
        ]);
        expect(v.caption).toBe('All of it in the past two weeks');
    });
    it('says none in the past two weeks', () => {
        expect(playTimeView({ minutes: 600, twoWeeks: 0, lastPlayed: NOW - 30 * DAY }, NOW, 'en-US').caption).toBe('None in the past two weeks');
    });
    it('has no caption otherwise', () => {
        expect(playTimeView({ minutes: 600, twoWeeks: 60, lastPlayed: NOW - DAY }, NOW, 'en-US').caption).toBeNull();
    });
});

describe('featuredProton', () => {
    it('a non-Steam game has no rating to look up', () => {
        expect(featuredProton(true, undefined)).toEqual({ status: 'none' });
        expect(featuredProton(true, { status: 'found', tier: 'gold' })).toEqual({ status: 'none' });
    });
    it('a Steam game shows what was looked up, undefined while loading', () => {
        expect(featuredProton(false, undefined)).toBeUndefined();
        expect(featuredProton(false, { status: 'found', tier: 'gold' })).toEqual({ status: 'found', tier: 'gold' });
    });
});

describe('pageAchievementFacts', () => {
    const none = { achieved: 0, total: 0, unlocked: [] };
    it('loading until Steam has the details', () => {
        expect(pageAchievementFacts(undefined, false)).toBeUndefined();
        expect(pageAchievementFacts(null, false)).toBeUndefined();
    });
    it('details without achievements: none, so the card says "No achievements" instead of loading forever', () => {
        expect(pageAchievementFacts({ strDescription: 'x' }, false)).toEqual(none);
        expect(achievementsView(pageAchievementFacts({}, false), NOW, 'en-US').empty).toBe('No achievements');
    });
    it('a non-Steam game has none, details or not', () => {
        expect(pageAchievementFacts(undefined, true)).toEqual(none);
        expect(pageAchievementFacts({ achievements: { nAchieved: 1, nTotal: 2, vecHighlight: [WOOD] } }, true)).toEqual(none);
    });
    it("a Steam game's details: its facts", () => {
        const details = { achievements: { nAchieved: 1, nTotal: 2, vecHighlight: [WOOD] } };
        expect(pageAchievementFacts(details, false)).toEqual(readAchievementFacts(details));
        expect(pageAchievementFacts(details, false)?.achieved).toBe(1);
    });
});
