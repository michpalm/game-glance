import { describe, expect, it } from 'vitest';
import * as controls from '../../src/home/homeControlsCss';

const rule = (css: string, selector: string) => {
    const start = css.indexOf(`${selector}{`);
    return start < 0 ? '' : css.slice(start + selector.length + 1, css.indexOf('}', start));
};

describe('footer keycaps', () => {
    it('puts each footer glyph on a round keycap of soft white glass, the same on every game (Michael, 2026-10-30)', () => {
        const cap = rule(controls.homeControlsCss, '[data-gh-footer-side]>:first-child');
        expect(cap).toContain('border-radius:50%');
        expect(cap).toContain('background:rgba(255,255,255,.16)');
        expect(cap).toContain('box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)');
        expect(cap).not.toContain('accent');
    });
    it('turns Steam’s own glyph white on the keycap, whether it is an svg or an image', () => {
        expect(rule(controls.homeControlsCss, '[data-gh-footer-side]>:first-child img,[data-gh-footer-side]>:first-child svg')).toContain('filter:brightness(0) invert(1)');
    });
    it('no longer hands the footer the game accent', () => {
        expect('footerAccentCss' in controls).toBe(false);
    });
});

describe('Search in the top bar', () => {
    const focused = ':where(html:not([data-gg-mouse])) .gh-keyboard-surface button.gh-search-control.DialogButton:is(.gpfocus,:focus-visible)';
    const typing = '.gh-keyboard-surface button.gh-search-control.DialogButton[data-home-search=editing]';
    it('focused, it keeps the glass with the ring, as the round buttons, not Steam’s white button (Michael, 2026-11-04)', () => {
        const css = rule(controls.homeControlsCss, focused);
        expect(css).toContain('background:rgba(12,16,22,.55)!important');
        expect(css).toContain('color:#fff!important');
        expect(css).toContain('outline:2px solid #fff');
    });
    it('while typing it is the same glass and ring, wider (the width comes from homeSearchBounds)', () => {
        const css = rule(controls.homeControlsCss, typing);
        expect(css).toContain('background:rgba(12,16,22,.55)!important');
        expect(css).toContain('color:#fff!important');
        expect(css).toContain('outline:2px solid #fff');
    });
});
