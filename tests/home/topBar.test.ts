import { describe, expect, it, vi } from 'vitest';
import { createTopBarFinder, focusInTopBar, isTopBarRect } from '../../src/home/topBar';

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

describe('createTopBarFinder', () => {
    // Every D-pad move changes classes; measuring the bar then forced a full layout per press.
    function page() {
        const bar: any = { isConnected: true, parentElement: null, getBoundingClientRect: vi.fn(() => ({ top: 0, height: 40, width: 1500 })) };
        const avatar: any = { isConnected: true, parentElement: bar, getBoundingClientRect: vi.fn(() => ({ top: 4, height: 32, width: 32 })) };
        const doc: any = { defaultView: { innerWidth: 1500 }, querySelector: vi.fn(() => avatar) };
        return { doc, bar, avatar };
    }
    it('measures once and reuses the bar while it is still in the page', () => {
        const p = page(), find = createTopBarFinder(p.doc);
        expect(find()).toBe(p.bar); expect(find()).toBe(p.bar); expect(find()).toBe(p.bar);
        expect(p.bar.getBoundingClientRect).toHaveBeenCalledTimes(1);
    });
    it('measures again when Steam replaces its bar, or when asked to', () => {
        const p = page(), find = createTopBarFinder(p.doc);
        find(); p.bar.isConnected = false; p.bar.isConnected = true;
        find(true); expect(p.bar.getBoundingClientRect).toHaveBeenCalledTimes(2);
        p.bar.isConnected = false; find(); expect(p.bar.getBoundingClientRect).toHaveBeenCalledTimes(3);
    });
    it('keeps looking while there is no bar yet', () => {
        const p = page(); p.doc.querySelector.mockReturnValue(null);
        const find = createTopBarFinder(p.doc);
        expect(find()).toBeNull(); expect(find()).toBeNull();
        expect(p.doc.querySelector).toHaveBeenCalledTimes(2);
    });
});
