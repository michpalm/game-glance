import { describe, expect, it } from 'vitest';
import { focusInTopBar, isTopBarRect } from '../../src/home/topBar';

describe('isTopBarRect', () => {
    it("accepts Steam's top strip: flush with the top, thin, across the screen", () => {
        expect(isTopBarRect({ top: 0, height: 40, width: 1500 }, 1500)).toBe(true);
        expect(isTopBarRect({ top: 0, height: 40, width: 828 }, 828)).toBe(true);
    });
    it('rejects the avatar, the page and anything not at the top', () => {
        expect(isTopBarRect({ top: 4, height: 32, width: 32 }, 1500)).toBe(false);
        expect(isTopBarRect({ top: 0, height: 845, width: 1500 }, 1500)).toBe(false);
        expect(isTopBarRect({ top: 300, height: 40, width: 1500 }, 1500)).toBe(false);
        expect(isTopBarRect({ top: 0, height: 40, width: 1500 }, 0)).toBe(false);
    });
});

describe('focusInTopBar (read, not from focus events)', () => {
    // Stand-ins: the bar contains the nodes in its set. Focus events stop arriving while Steam's window has no system
    // focus (seen on the Ally), so where focus is is read directly: the page's focused element, or Steam's gamepad focus.
    const bar = (inside: unknown[]) => ({ contains: (n: unknown) => inside.includes(n), querySelector: (sel: string) => (sel === '.gpfocus' ? inside.find((n) => (n as { gp?: boolean }).gp) ?? null : null) });
    const play = {};
    const avatar = { gp: false };
    it('focus on an element inside the bar: in the bar', () => {
        expect(focusInTopBar(bar([avatar]), avatar)).toBe(true);
    });
    it('focus back on Home (Play): not in the bar, even though no event said so', () => {
        expect(focusInTopBar(bar([avatar]), play)).toBe(false);
    });
    it("Steam's gamepad focus inside the bar counts too", () => {
        expect(focusInTopBar(bar([{ gp: true }]), play)).toBe(true);
    });
    it('no bar found, or nothing focused: not in the bar', () => {
        expect(focusInTopBar(null, avatar)).toBe(false);
        expect(focusInTopBar(bar([avatar]), null)).toBe(false);
    });
});
