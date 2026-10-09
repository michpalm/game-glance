import { describe, expect, it } from 'vitest';
import { feedViewportInset } from '../../src/home/feedLayout';
import { homeCss } from '../../src/home/homeCss';
import { pillInset, ROW_OFFSET, rowInset, SIDE_INSET, sideInset } from '../../src/home/insets';
import { isTvScreen } from '../../src/styles/screenScale';

describe('Home side inset', () => {
    it('the handheld keeps 56 canvas px; a TV gets the tighter 24 (1.7vw of the 1440 canvas, the status dot\'s centre line)', () => {
        expect(sideInset(false)).toBe(56);
        expect(sideInset(true)).toBe(24);
        expect(SIDE_INSET.tv / 1440).toBeCloseTo(0.017, 3);
    });
    it('is chosen by the shared TV check: the Ally handheld and the Deck keep 56, a 1080p TV and 1920 get 24', () => {
        const side = (w: number, h: number) => sideInset(isTvScreen(w, h));
        expect(side(828, 466)).toBe(56);
        expect(side(1280, 800)).toBe(56);
        expect(side(1500, 844)).toBe(24);
        expect(side(1920, 1080)).toBe(24);
    });
    it('the recents row, tabs and feed sit ROW_OFFSET (12) outside the text edge, so they stay lined up: 44 on the handheld', () => {
        expect(rowInset(56)).toBe(44);
        expect(rowInset(24)).toBe(12);
        expect(ROW_OFFSET).toBe(12);
    });
    it('a TV\'s rows start 20 in (4 outside the text edge) and the pill ends 19 in, on the status dot\'s edge; the handheld is unchanged', () => {
        expect(rowInset(24, true)).toBe(20);
        expect(rowInset(56)).toBe(44);
        expect(pillInset(true)).toBe(19);
        expect(pillInset(false)).toBe(56);
        expect(feedViewportInset(24, true)).toBe(40);
    });
    it('the feed row\'s unused width follows the inset: 88 on the handheld (as before), 56 on a TV', () => {
        expect(feedViewportInset(56)).toBe(88);
        expect(feedViewportInset(24)).toBe(24);
    });
});

describe('homeCss side inset', () => {
    const css = homeCss();
    it('the title block reads --gh-side, the store pill --gh-pill, the recents, tabs and feed --gh-row, defaulting to the handheld\'s 56, 56 and 44', () => {
        expect(css).toMatch(/\.gh-root \{[^}]*--gh-side: 56px; --gh-row: 44px; --gh-pill: 56px/);
        expect(css).toMatch(/\.gh-title-block \{[^}]*left: var\(--gh-side, 56px\) !important/);
        expect(css).toMatch(/\.gh-source \{[^}]*right: var\(--gh-pill, 56px\) !important/);
        expect(css).toMatch(/\.gh-recents \{[^}]*left: var\(--gh-row, 44px\) !important/);
        expect(css).toMatch(/\.gh-feed \{[^}]*left: var\(--gh-row, 44px\) !important/);
        expect(css).toMatch(/\.gh-tabs \{[^}]*left: var\(--gh-row, 44px\) !important; right: var\(--gh-row, 44px\) !important/);
    });
});
