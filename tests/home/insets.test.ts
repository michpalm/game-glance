import { describe, expect, it } from 'vitest';
import { feedViewportInset } from '../../src/home/feedLayout';
import { homeCss } from '../../src/home/homeCss';
import { pillInset, ROW_OFFSET, rowInset, SIDE_INSET, sideInset } from '../../src/home/insets';
import { isTvScreen } from '../../src/styles/screenScale';

describe('Home side inset', () => {
    it('the handheld gets 28 canvas px (the status bar\'s end); a TV the tighter 24 (1.7vw of the 1440 canvas, the status dot\'s centre line)', () => {
        expect(sideInset(false)).toBe(28);
        expect(sideInset(true)).toBe(24);
        expect(SIDE_INSET.tv / 1440).toBeCloseTo(0.017, 3);
    });
    it('is chosen by the shared TV check: the Ally handheld and the Deck get 28, a 1080p TV and 1920 get 24', () => {
        const side = (w: number, h: number) => sideInset(isTvScreen(w, h));
        expect(side(828, 466)).toBe(28);
        expect(side(1280, 800)).toBe(28);
        expect(side(1500, 844)).toBe(24);
        expect(side(1920, 1080)).toBe(24);
    });
    it('on the handheld the recents row, tabs and feed start on the text edge (ROW_OFFSET 0): one line down the left', () => {
        expect(ROW_OFFSET).toBe(0);
        expect(rowInset(28)).toBe(28);
    });
    it('a TV\'s rows start 20 in (4 outside the text edge) and the pill ends 19 in, on the status dot\'s edge; the handheld\'s pill ends 28 in', () => {
        expect(rowInset(24, true)).toBe(20);
        expect(pillInset(true)).toBe(19);
        expect(pillInset(false)).toBe(28);
        expect(feedViewportInset(24, true)).toBe(40);
    });
    it('the feed row\'s unused width follows the inset: 56 on the handheld, 40 on a TV', () => {
        expect(feedViewportInset(28)).toBe(56);
    });
});

describe('homeCss side inset', () => {
    const css = homeCss();
    it('the title block reads --gh-side, the store pill --gh-pill, the recents, tabs and feed --gh-row, all defaulting to the handheld\'s 28', () => {
        expect(css).toMatch(/\.gh-root \{[^}]*--gh-side: 28px; --gh-row: 28px; --gh-pill: 28px/);
        expect(css).toMatch(/\.gh-title-block \{[^}]*left: var\(--gh-side, 28px\) !important/);
        expect(css).toMatch(/\.gh-source \{[^}]*right: var\(--gh-pill, 28px\) !important/);
        expect(css).toMatch(/\.gh-recents \{[^}]*left: var\(--gh-row, 28px\) !important/);
        expect(css).toMatch(/\.gh-feed \{[^}]*left: var\(--gh-row, 28px\) !important/);
        expect(css).toMatch(/\.gh-tabs \{[^}]*left: var\(--gh-row, 28px\) !important;[^}]*right: auto !important/);
    });
});
