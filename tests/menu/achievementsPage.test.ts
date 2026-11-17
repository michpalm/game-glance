import { describe, expect, it } from 'vitest';
import { achievementsPage, ACH_SORTS, SORT_LABELS, whenText, type PageSchema, type PageUser } from '../../src/menu/achievementsPage';

const DAY = 86_400;
const now = 1_795_000_000;
const a = (key: number, extra: Record<string, unknown> = {}) => ({ internal_key: key, archived: false, name: `A${key}`, description: `Do ${key}`, hidden: false, icon_achieved: `on${key}.jpg`, icon_unachieved: `off${key}.jpg`, ...extra });

const schema: PageSchema = { groups: [
    { id: 0, name: '', archived: false, dlcappid: 0, achievements: [a(1), a(2), a(3, { min_progress: 0, max_progress: 50 }), a(4, { hidden: true }), a(5, { archived: true })] },
    { id: 2, name: 'Night Market', archived: false, dlcappid: 900, achievements: [a(10), a(11)] },
    { id: 3, name: 'Tidewatch', archived: false, dlcappid: 901, achievements: [a(20), a(21)] },
] };
const user: PageUser = {
    achievements: { 1: { unlocked: true, unlock_time: now - 2 * DAY }, 3: { unlocked: false, progress: 41 }, 10: { unlocked: true, unlock_time: now - 40 * DAY }, 11: { unlocked: true, unlock_time: now - 3600 } },
    groups: { 0: { is_achievable: true }, 2: { is_achievable: true } },
};
const rates = { percentages: { 1: 91.4, 2: 18.6, 3: 22.5, 4: 3.2, 10: 7.8, 11: 12.3 } };

describe('achievementsPage', () => {
    it('heads the page with what this player can earn, and how many archived ones it leaves out', () => {
        const page = achievementsPage(schema, user, rates, null, now, 'en-US')!;
        expect(page.header).toBe('3 of 6 you can earn · 1 archived hidden');
    });
    it('lists each set: the base game first, DLC by name, one not owned said so; done sets marked', () => {
        const page = achievementsPage(schema, user, rates, null, now, 'en-US')!;
        expect(page.sets.map(s => [s.id, s.name, s.kind, s.count, s.done, s.base])).toEqual([
            [0, 'Base game', 'Main game', '1 / 4', false, true],
            [2, 'Night Market', 'DLC', '2 / 2', true, false],
            [3, 'Tidewatch', 'DLC · not owned', '0 / 2', false, false],
        ]);
        expect(page.sets[0].ratio).toBeCloseTo(0.25);
    });
    it('drops the game\'s own name from the start of a set\'s name ("Kingdom Two Crowns: Norse Lands" is "Norse Lands")', () => {
        const named: PageSchema = { groups: [schema.groups[0], { ...schema.groups[1], name: 'Lanternfall: Night Market' }, { ...schema.groups[2], name: 'Lanternfall - Tidewatch' }] };
        expect(achievementsPage(named, user, rates, null, now, 'en-US', 'Lanternfall')!.sets.map(s => s.name)).toEqual(['Base game', 'Night Market', 'Tidewatch']);
        expect(achievementsPage(named, user, rates, null, now, 'en-US', 'Lantern')!.sets[1].name).toBe('Lanternfall: Night Market');
    });
    it('opens on the first set still in progress: next up, closest first, then the most common', () => {
        const page = achievementsPage(schema, user, rates, null, now, 'en-US')!;
        expect(page.picked).toBe(0);
        expect(page.title).toBe('Next up');
        expect(page.items.map(i => i.key)).toEqual([3, 2, 4]);
        expect(page.items[0]).toMatchObject({ name: 'A3', right: '41 / 50', progress: 0.82, rarity: '22.5% of players', rare: false, icon: 'off3.jpg' });
        expect(page.items[1]).toMatchObject({ right: 'Locked', progress: null });
    });
    it('keeps a hidden achievement hidden until it is unlocked, and marks rare ones', () => {
        const hidden = achievementsPage(schema, user, rates, 0, now, 'en-US')!.items.find(i => i.key === 4)!;
        expect(hidden).toMatchObject({ name: 'Hidden achievement', description: 'Keep playing to reveal it', rarity: '3.2% of players · Rare', rare: true });
    });
    it('a finished set lists what was unlocked, newest first, with when', () => {
        const page = achievementsPage(schema, user, rates, 2, now, 'en-US')!;
        expect(page.title).toBe('Unlocked');
        expect(page.items.map(i => [i.key, i.right, i.icon, i.rare])).toEqual([[11, 'Today', 'on11.jpg', false], [10, 'Oct 9', 'on10.jpg', true]]);
    });
    it('shows no rarity without Steam\'s global rates', () => {
        const page = achievementsPage(schema, user, undefined, 0, now, 'en-US')!;
        expect(page.items.every(i => i.rarity === null && !i.rare)).toBe(true);
    });
    it('still has a page for a game with one set (no sets list worth showing, but its next up)', () => {
        const one: PageSchema = { groups: [{ id: 0, name: '', archived: false, dlcappid: 0, achievements: [a(1), a(2)] }] };
        const page = achievementsPage(one, { achievements: { 1: { unlocked: true, unlock_time: now } }, groups: { 0: { is_achievable: true } } }, rates, null, now, 'en-US')!;
        expect(page.header).toBe('1 of 2 you can earn');
        expect(page.sets.map(s => s.name)).toEqual(['Base game']);
        expect(page.items.map(i => i.key)).toEqual([2]);
    });
    it('is null without Steam\'s data', () => {
        expect(achievementsPage(undefined, user, rates, null, now, 'en-US')).toBeNull();
        expect(achievementsPage(schema, undefined, rates, null, now, 'en-US')).toBeNull();
    });
});

describe('whenText', () => {
    it('says today, yesterday or days ago within a week, else the date (with the year when it is not this one)', () => {
        expect(whenText(now - 3600, now, 'en-US')).toBe('Today');
        expect(whenText(now - DAY - 60, now, 'en-US')).toBe('Yesterday');
        expect(whenText(now - 5 * DAY, now, 'en-US')).toBe('5 days ago');
        expect(whenText(now - 400 * DAY, now, 'en-US')).toMatch(/2025/);
    });
});

describe('sorting the list (variant A, 2026-11-17)', () => {
    const at = (sort: (typeof ACH_SORTS)[number], picked = 0) => achievementsPage(schema, user, rates, picked, now, 'en-US', '', sort)!;
    it('offers four orders, closest first by default', () => {
        expect(ACH_SORTS).toEqual(['closest', 'rarest', 'common', 'recent']);
        expect(ACH_SORTS.map(s => SORT_LABELS[s])).toEqual(['Closest first', 'Rarest first', 'Most common first', 'Recently unlocked']);
        expect(achievementsPage(schema, user, rates, 0, now, 'en-US')!.items.map(i => i.key)).toEqual(at('closest').items.map(i => i.key));
    });
    it('rarest and most common list the whole set, earned or not, by share of players (unknown last)', () => {
        expect(at('rarest').items.map(i => i.key)).toEqual([4, 2, 3, 1]);
        expect(at('rarest').title).toBe('All achievements');
        expect(at('common').items.map(i => i.key)).toEqual([1, 3, 2, 4]);
        expect(at('common').title).toBe('All achievements');
    });
    it('recently unlocked lists what was earned, newest first, and says so when nothing is', () => {
        expect(at('recent', 2).items.map(i => i.key)).toEqual([11, 10]);
        expect(at('recent', 3)).toMatchObject({ title: 'Unlocked', items: [] });
    });
});
