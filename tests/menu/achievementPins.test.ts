import { describe, expect, it } from 'vitest';
import { MAX_PINS, pinSlot, togglePin } from '../../src/menu/achievementPins';

describe('achievement pins (per set, at most two)', () => {
    it('names a set\'s pins by game and set', () => {
        expect(pinSlot(292030, 0)).toBe('292030:0');
    });
    it('pins, unpins, and a third replaces the oldest', () => {
        expect(MAX_PINS).toBe(2);
        expect(togglePin([], 7)).toEqual([7]);
        expect(togglePin([7], 9)).toEqual([7, 9]);
        expect(togglePin([7, 9], 7)).toEqual([9]);
        expect(togglePin([7, 9], 11)).toEqual([9, 11]);
    });
});
