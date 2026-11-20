import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
import { keepCoverInView } from '../../src/library/LibraryPage';

const rect = (top: number, bottom: number) => ({ top, bottom });
const grid = (scrollTop: number) => ({ scrollTop, getBoundingClientRect: () => rect(472, 845) });

describe('the highlighted cover stays in the grid\'s view (PS5: moving up left the highlight above it)', () => {
    it('scrolls up to a cover above the view, with room for its ring', () => {
        const g = grid(1535);
        keepCoverInView(g, { getBoundingClientRect: () => rect(307, 447) }, 10);
        expect(g.scrollTop).toBe(1535 - (472 + 10 - 307));
    });
    it('scrolls down to a cover below the view', () => {
        const g = grid(100);
        keepCoverInView(g, { getBoundingClientRect: () => rect(800, 940) }, 10);
        expect(g.scrollTop).toBe(100 + (940 - (845 - 10)));
    });
    it('leaves a cover in view alone', () => {
        const g = grid(100);
        keepCoverInView(g, { getBoundingClientRect: () => rect(500, 640) }, 10);
        expect(g.scrollTop).toBe(100);
    });
    it('does nothing without a grid', () => expect(() => keepCoverInView(null, { getBoundingClientRect: () => rect(0, 1) }, 10)).not.toThrow());
});

describe('the last row clears the footer (PS5 check 2026-11-19)', () => {
    it('keeps a larger room at the bottom when asked', () => {
        const g = grid(100);
        keepCoverInView(g, { getBoundingClientRect: () => rect(700, 800) }, 10, 90);
        expect(g.scrollTop).toBe(100 + (800 - (845 - 90)));
    });
    it('the top room stays the ring\'s', () => {
        const g = grid(500);
        keepCoverInView(g, { getBoundingClientRect: () => rect(470, 610) }, 10, 90);
        expect(g.scrollTop).toBe(500 - (472 + 10 - 470));
    });
});
