import { describe, expect, it, vi } from 'vitest';
import { backOnCancel, holdAtPageEdge } from '../../src/contextMenus/pageCancel';

describe('backOnCancel', () => {
    it('goes back and stops B from reaching Steam\'s menu (which would close it)', () => {
        const back = vi.fn();
        const evt = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
        backOnCancel(back)(evt as unknown as Event);
        expect(back).toHaveBeenCalledTimes(1);
        expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
        expect(evt.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('still goes back when the event has no stop methods', () => {
        const back = vi.fn();
        backOnCancel(back)(undefined);
        expect(back).toHaveBeenCalledTimes(1);
    });
});

describe('holdAtPageEdge', () => {
    const row = (name: string) => ({ name, contains(other: unknown) { return other === this; } });
    const group = (rows: ReturnType<typeof row>[], active: unknown) => ({ ownerDocument: { activeElement: active }, querySelectorAll: () => rows }) as unknown as Element;
    const rows = [row('Active Rotation'), row('Test'), row('New collection…')];
    it('holds Down on a page\'s last row: Steam\'s hidden Cancel comes next and took a press (PS5, 2026-11-18: New collection… needed two Ups)', () => {
        expect(holdAtPageEdge(group(rows, rows[2]), 'last')).toBe(true);
    });
    it('holds Up on a page\'s first row: Steam\'s navigation wrapped round to the hidden Cancel there too', () => {
        expect(holdAtPageEdge(group(rows, rows[0]), 'first')).toBe(true);
    });
    it('lets the move through on any other row, and without a page', () => {
        expect(holdAtPageEdge(group(rows, rows[1]), 'last')).toBe(false);
        expect(holdAtPageEdge(group(rows, rows[1]), 'first')).toBe(false);
        expect(holdAtPageEdge(group(rows, rows[2]), 'first')).toBe(false);
        expect(holdAtPageEdge(group([], null), 'last')).toBe(false);
        expect(holdAtPageEdge(null, 'first')).toBe(false);
    });
});
