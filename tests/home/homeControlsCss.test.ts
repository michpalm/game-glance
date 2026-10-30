import { describe, expect, it } from 'vitest';
import { footerAccentCss, homeControlsCss } from '../../src/home/homeControlsCss';
import { DEFAULT_ACCENT } from '../../src/home/accent';
import { ACCENT_MS } from '../../src/home/motion';

const rule = (css: string, selector: string) => {
    const start = css.indexOf(`${selector}{`);
    return start < 0 ? '' : css.slice(start + selector.length + 1, css.indexOf('}', start));
};

describe('footer accent keycaps', () => {
    it('puts each footer glyph on a round keycap in the game accent, with a soft glow that follows it', () => {
        const cap = rule(homeControlsCss, '[data-gh-footer-side]>:first-child');
        expect(cap).toContain('border-radius:50%');
        expect(cap).toContain('background:var(--glance-accent)');
        expect(cap).toContain('box-shadow:0 0 12px -3px var(--glance-accent)');
        // Each element animates its own paint (motion.ts): the variable itself never transitions.
        expect(cap).toContain(`transition:background ${ACCENT_MS}ms,box-shadow ${ACCENT_MS}ms`);
    });
    it('turns Steam’s own glyph white on the keycap, whether it is an svg or an image', () => {
        expect(rule(homeControlsCss, '[data-gh-footer-side]>:first-child img,[data-gh-footer-side]>:first-child svg')).toContain('filter:brightness(0) invert(1)');
    });
    it('hands the footer the current game accent, since Steam’s footer sits outside the Home root', () => {
        expect(footerAccentCss('#569dcd')).toBe('[data-gh-footer=true]{--glance-accent:#569dcd}');
        expect(footerAccentCss('#5FD1AE')).toBe('[data-gh-footer=true]{--glance-accent:#5FD1AE}');
    });
    it('never writes anything but a hex colour into the style sheet', () => {
        expect(footerAccentCss('red;}body{display:none')).toBe(`[data-gh-footer=true]{--glance-accent:${DEFAULT_ACCENT}}`);
        expect(footerAccentCss('')).toBe(`[data-gh-footer=true]{--glance-accent:${DEFAULT_ACCENT}}`);
    });
});
