import { describe, expect, it } from 'vitest';
import { setsLine, setsSummary, type SetSchema, type SetUser } from '../../src/menu/achievementSets';

const ach = (key: number, archived = false) => ({ internal_key: key, archived });
const keys = (from: number, n: number) => Array.from({ length: n }, (_, i) => ach(from + i));
const unlocked = (...list: number[]) => Object.fromEntries(list.map(k => [k, { unlocked: true }]));

// Kingdom Two Crowns as read on the Deck: base 30, three DLC sets, only the base game earnable.
const kingdom: SetSchema = { groups: [
    { id: 0, name: '', archived: false, dlcappid: 0, achievements: keys(1, 30) },
    { id: 2, name: 'Call of Olympus', archived: false, dlcappid: 2736340, achievements: keys(100, 10) },
    { id: 3, name: 'Norse Lands', archived: false, dlcappid: 1708680, achievements: keys(200, 4) },
    { id: 4, name: 'Dead Lands', archived: false, dlcappid: 1299270, achievements: keys(300, 2) },
] };

describe('setsSummary (Steam\'s Achievement Sets rules)', () => {
    it('counts only what this player can earn: sets they cannot earn add only what they unlocked', () => {
        const user: SetUser = { achievements: unlocked(1, 2, 3, 100), groups: { 0: { is_achievable: true } } };
        const s = setsSummary(kingdom, user)!;
        expect(s).toMatchObject({ unlocked: 4, total: 31, done: 0, sets: 1 });
        expect(s.bars.map(b => [b.size, b.unlocked, b.base, b.earnable])).toEqual([[30, 3, true, true], [10, 1, false, false], [4, 0, false, false], [2, 0, false, false]]);
    });
    it('a set is done when Steam says so or when every counted achievement is unlocked', () => {
        const schema: SetSchema = { groups: [
            { id: 0, name: '', archived: false, dlcappid: 0, achievements: keys(1, 2) },
            { id: 5, name: 'Season', archived: false, dlcappid: 0, achievements: keys(10, 2) },
            { id: 6, name: 'Event', archived: false, dlcappid: 0, achievements: keys(20, 3) },
        ] };
        const user: SetUser = { achievements: unlocked(1, 2, 20), groups: { 0: { is_achievable: true }, 5: { is_achievable: true, is_completed: true }, 6: { is_achievable: true } } };
        expect(setsSummary(schema, user)).toMatchObject({ unlocked: 3, total: 7, done: 2, sets: 3 });
    });
    it('archived achievements count only when unlocked; a set with nothing left to show is hidden', () => {
        const schema: SetSchema = { groups: [
            { id: 0, name: '', archived: false, dlcappid: 0, achievements: [ach(1), ach(2), ach(3, true), ach(4, true)] },
            { id: 7, name: 'Old event', archived: true, dlcappid: 0, achievements: [ach(30), ach(31)] },
            { id: 8, name: 'Gone', archived: false, dlcappid: 0, achievements: [ach(40, true)] },
        ] };
        const user: SetUser = { achievements: unlocked(3, 30), groups: { 0: { is_achievable: true }, 7: { is_achievable: true } } };
        const s = setsSummary(schema, user)!;
        expect(s.bars.map(b => b.id)).toEqual([0, 7]);
        expect(s.bars[0]).toMatchObject({ size: 3, unlocked: 1 });
        // An archived set counts what was unlocked in it, never its whole size.
        expect(s).toMatchObject({ unlocked: 2, total: 4 });
    });
    it('is null for a game without sets (one base set), so the tile keeps its single bar', () => {
        const one: SetSchema = { groups: [{ id: 0, name: '', archived: false, dlcappid: 0, achievements: keys(1, 115) }] };
        expect(setsSummary(one, { achievements: unlocked(1, 2), groups: { 0: { is_achievable: true } } })).toBeNull();
        expect(setsSummary({ groups: [] }, { achievements: {}, groups: {} })).toBeNull();
    });
    it('reads junk as no sets', () => {
        expect(setsSummary(undefined, undefined)).toBeNull();
        expect(setsSummary({ groups: 'x' } as unknown as SetSchema, { achievements: {}, groups: {} })).toBeNull();
    });
});

describe('setsLine', () => {
    it('names the sets done when more than one can be earned, else just the count', () => {
        expect(setsLine({ unlocked: 38, total: 52, done: 2, sets: 4, bars: [] })).toBe('38 of 52 · 2 of 4 sets done');
        expect(setsLine({ unlocked: 4, total: 31, done: 0, sets: 1, bars: [] })).toBe('4 of 31');
    });
});
