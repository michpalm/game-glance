import { describe, expect, it } from 'vitest';
import { capsuleBlur, greyedOut } from '../../src/home/RecentsRow';

describe('capsuleBlur', () => {
    it('only the selected card and its neighbours draw the blurred base (a narrow card\'s portrait covers it)', () => {
        expect([0, 1, 2, 3, 4, 5].map((i) => capsuleBlur(i, 2))).toEqual([false, true, true, true, false, false]);
        expect([0, 1, 2].map((i) => capsuleBlur(i, 0))).toEqual([true, true, false]);
    });
    it('on the Library card (selected = count) only the last game keeps it', () => {
        expect([0, 1, 2].map((i) => capsuleBlur(i, 3))).toEqual([false, false, true]);
    });
});

describe('greyedOut', () => {
    it('greys a game not installed here, never an installed one or a non-Steam shortcut', () => {
        expect(greyedOut({ installed: false })).toBe(true);
        expect(greyedOut({ installed: true })).toBe(false);
        expect(greyedOut({ installed: false, shortcut: true })).toBe(false);
    });
});

describe('optional uninstalled-game gray treatment', () => {
    it('keeps uninstalled Steam cards in color when disabled, including loop previews', () => {
        expect(greyedOut({ installed: false }, false)).toBe(false);
        expect(greyedOut({ installed: true }, false)).toBe(false);
        expect(greyedOut({ installed: false, shortcut: true }, false)).toBe(false);
        expect(greyedOut({ installed: false }, true)).toBe(true);
    });
});
