import { describe, expect, it } from 'vitest';
import { achievementsView, pageAchievementFacts, playFactsOf, playTimeView, PROTON_LADDER, protonView, readAchievementFacts, steamCompatOf, steamIconUrl } from '../../src/logic/featuredViews';
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
    const found = { status: 'found', tier: 'platinum', details: { total: 230, confidence: 'strong', trending: 'platinum', best: 'platinum' } } as const;
    it('a tile row: the mark and the rating in its tone, the reports and confidence as its label', () => {
        const v = protonView(found);
        expect(v.title).toBe('ProtonDB');
        expect(v.icon).toEqual({ tone: 'platinum', label: '230 reports · strong confidence', value: 'Platinum' });
        expect(v.columns).toEqual([]);
        expect(v.bar).toBeNull();
    });
    it("the ladder: ProtonDB's scale worst first, the rating's step lit", () => {
        expect(protonView(found).ladder).toEqual({ steps: PROTON_LADDER, at: 4 });
        expect(PROTON_LADDER).toEqual(['borked', 'bronze', 'silver', 'gold', 'platinum']);
        expect(protonView({ status: 'found', tier: 'bronze' }).ladder?.at).toBe(1);
    });
    it("the caption is Steam's side: its Deck rating and the tool it runs the game with", () => {
        expect(protonView(found, { deck: 1, tool: 'Proton 11.0-2' }).caption).toBe('Unsupported on Steam Deck · runs with Proton 11.0-2');
        expect(protonView(found, { deck: 3, tool: null }).caption).toBe('Verified on Steam Deck');
        expect(protonView(found, { deck: 2, tool: null }).caption).toBe('Playable on Steam Deck');
        expect(protonView(found, { deck: null, tool: 'Proton Experimental' }).caption).toBe('runs with Proton Experimental');
    });
    it("without Steam's side, ProtonDB's own trend", () => {
        expect(protonView(found).caption).toBe('Trending Platinum · best reported Platinum');
        expect(protonView({ status: 'found', tier: 'gold', details: { total: null, confidence: null, trending: 'gold', best: null } }).caption).toBe('Trending Gold');
    });
    it('an old cache entry without details: a plain label, no caption', () => {
        const v = protonView({ status: 'found', tier: 'gold' });
        expect(v.icon?.label).toBe("Players' rating");
        expect(v.caption).toBeNull();
    });
    it('leaves out what the summary did not have; one report reads singular', () => {
        expect(protonView({ status: 'found', tier: 'gold', details: { total: null, confidence: 'good', trending: null, best: null } }).icon?.label).toBe('good confidence');
        expect(protonView({ status: 'found', tier: 'gold', details: { total: 1, confidence: null, trending: null, best: null } }).icon?.label).toBe('1 report');
    });
    it('says there is no rating', () => {
        expect(protonView({ status: 'none' }).empty).toBe('No ProtonDB rating yet');
        expect(protonView({ status: 'unavailable' }).empty).toBe('No ProtonDB rating yet');
    });
    it('is loading while unknown', () => {
        expect(protonView(undefined).loading).toBe(true);
    });
});

describe('steamCompatOf', () => {
    it("reads Valve's Deck rating and Steam's compatibility tool", () => {
        expect(steamCompatOf({ steam_deck_compat_category: 1 }, { strCompatToolDisplayName: 'Proton 11.0-2' }, false)).toEqual({ deck: 1, tool: 'Proton 11.0-2' });
    });
    it('unknown rating (0), no tool (a native game) or a non-Steam game: none', () => {
        expect(steamCompatOf({ steam_deck_compat_category: 0 }, { strCompatToolDisplayName: '' }, false)).toEqual({ deck: null, tool: null });
        expect(steamCompatOf(undefined, undefined, false)).toEqual({ deck: null, tool: null });
        expect(steamCompatOf({ steam_deck_compat_category: 3 }, { strCompatToolDisplayName: 'Proton 9' }, true)).toEqual({ deck: null, tool: null });
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
    const ICON = 'https://example.test/icon.jpg';
    const facts = { minutes: 90, twoWeeks: 0, lastPlayed: NOW - 6 * DAY, icon: ICON, purchased: 1667333882, reviews: 91 };
    it('a tile row: the icon, when it was last played, and the hours in the accent', () => {
        const v = playTimeView(facts, NOW, 'en-US');
        expect(v.title).toBe('Play time');
        expect(v.icon).toEqual({ src: ICON, label: `Last played · ${formatLastPlayed(NOW - 6 * DAY, NOW, 'en-US')}`, value: '1.5 h played', accent: true });
    });
    it('then the past two weeks, when it was bought and its Steam reviews', () => {
        expect(playTimeView(facts, NOW, 'en-US').columns).toEqual([
            { key: 'twoWeeks', label: 'Past 2 weeks', value: '0 h' },
            { key: 'owned', label: 'Owned since', value: 'Nov 2022' },
            { key: 'reviews', label: 'Steam reviews', value: '91%' },
        ]);
    });
    it('leaves out an unknown purchase date or review score, and a missing icon', () => {
        const v = playTimeView({ ...facts, icon: null, purchased: 0, reviews: null }, NOW, 'en-US');
        expect(v.columns.map((c) => c.key)).toEqual(['twoWeeks']);
        expect(v.icon?.src).toBeUndefined();
    });
    it('never played', () => {
        expect(playTimeView({ ...facts, minutes: 0, lastPlayed: 0 }, NOW, 'en-US').icon?.label).toBe('Not played yet');
    });
});

describe('playFactsOf', () => {
    const overview = { minutes_playtime_last_two_weeks: 30, icon_hash: 'be3384e7936f548303c77ee2abc4c9026285f554', rt_purchased_time: 1667333882, review_percentage_with_bombs: 91 };
    it("a Steam game's facts from its overview", () => {
        expect(playFactsOf(475150, overview, { minutes: 90, lastPlayed: 1668282020 }, false)).toEqual({
            minutes: 90, twoWeeks: 30, lastPlayed: 1668282020,
            icon: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/475150/be3384e7936f548303c77ee2abc4c9026285f554.jpg',
            purchased: 1667333882, reviews: 91,
        });
    });
    it('a non-Steam game has no Steam icon or reviews; a missing overview reads as zeros', () => {
        const f = playFactsOf(1, overview, { minutes: 5, lastPlayed: 0 }, true);
        expect(f.icon).toBeNull();
        expect(f.reviews).toBeNull();
        expect(playFactsOf(1, undefined, { minutes: 5, lastPlayed: 0 }, false)).toEqual({ minutes: 5, twoWeeks: 0, lastPlayed: 0, icon: null, purchased: 0, reviews: null });
    });
    it('ignores an icon hash that is not one', () => {
        expect(steamIconUrl(1, '../x')).toBeNull();
        expect(steamIconUrl(1, undefined)).toBeNull();
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
