import { describe, expect, it } from 'vitest';
import { isUnreachableRect, REFOCUS_COOLDOWN_MS, REFOCUS_MAX, shouldRefocus } from '../../src/logic/gamepadFocus';

const ok = { gpRect: { width: 0, height: 0 }, windowFocused: true, sinceLastMs: 5000, done: 0 };

describe('isUnreachableRect', () => {
    it('is true for a box with no area (nothing to see), false for a visible one', () => {
        expect(isUnreachableRect({ width: 0, height: 0 })).toBe(true);
        expect(isUnreachableRect({ width: 100, height: 0 })).toBe(true);
        expect(isUnreachableRect({ width: 0, height: 40 })).toBe(true);
        expect(isUnreachableRect({ width: NaN, height: 40 })).toBe(true);
        expect(isUnreachableRect(null)).toBe(true);
        expect(isUnreachableRect({ width: 354, height: 63 })).toBe(false);
    });
});

describe('shouldRefocus (the stuck B on a Unifideck page)', () => {
    it('repairs when the gamepad focus is on something invisible', () => {
        expect(shouldRefocus(ok)).toBe(true);
    });
    it('leaves a visible gamepad focus alone, and a page with none', () => {
        expect(shouldRefocus({ ...ok, gpRect: { width: 354, height: 63 } })).toBe(false);
        expect(shouldRefocus({ ...ok, gpRect: null })).toBe(false);
    });
    it('never while the window lacks focus (Quick Access), inside the cooldown, or after the repairs are used up', () => {
        expect(shouldRefocus({ ...ok, windowFocused: false })).toBe(false);
        expect(shouldRefocus({ ...ok, sinceLastMs: REFOCUS_COOLDOWN_MS - 1 })).toBe(false);
        expect(shouldRefocus({ ...ok, sinceLastMs: REFOCUS_COOLDOWN_MS })).toBe(true);
        expect(shouldRefocus({ ...ok, done: REFOCUS_MAX })).toBe(false);
    });
});
