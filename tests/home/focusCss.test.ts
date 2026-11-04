import { describe, expect, it } from 'vitest';
import { withDomFocus } from '../../src/home/focusCss';

describe('focusCss.withDomFocus', () => {
    it('leaves a selector without a focus class alone', () => {
        expect(withDomFocus('.gh-cap-sel')).toBe('.gh-cap-sel');
        expect(withDomFocus('.gh-cap.gh-cap-hover:not(.gh-cap-sel)')).toBe('.gh-cap.gh-cap-hover:not(.gh-cap-sel)');
    });
    it('adds a twin matching DOM focus on the focusable itself, after the original selectors', () => {
        // The focus class on the element's own compound: the class becomes :focus.
        expect(withDomFocus('.gh-btn.gh-focus')).toBe('.gh-btn.gh-focus, .gh-btn:focus');
        expect(withDomFocus('.gh-card.gh-card-focus .gh-card-bar')).toBe('.gh-card.gh-card-focus .gh-card-bar, .gh-card:focus .gh-card-bar');
        // Alone in its compound: the focusable's own class with :focus (never a bare :focus, which any ancestor could match).
        expect(withDomFocus('.gh-recents-focus .gh-cap-sel, .gh-recents-focus .gh-cap-lib-on')).toBe(
            '.gh-recents-focus .gh-cap-sel, .gh-recents-focus .gh-cap-lib-on, .gh-recents:focus .gh-cap-sel, .gh-recents:focus .gh-cap-lib-on',
        );
        // Inside :has(), with a compound of another class.
        expect(withDomFocus('.gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-focus)')).toBe(
            '.gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-focus), .gh-actions > .gh-btn-play:has(+ .gh-btn-stream.gh-btn:focus)',
        );
        expect(withDomFocus('.gh-tab.gh-tab-focus .gh-tab-line')).toBe('.gh-tab.gh-tab-focus .gh-tab-line, .gh-tab:focus .gh-tab-line');
    });
    it('makes "not focused" exclude DOM focus too, without a twin', () => {
        expect(withDomFocus('.gh-card:not(.gh-card-focus) .gh-card-bar')).toBe('.gh-card:not(.gh-card-focus):not(:focus) .gh-card-bar');
        expect(withDomFocus('.gh-btn-cloud:not(.gh-focus)')).toBe('.gh-btn-cloud:not(.gh-focus):not(:focus)');
    });
    it('only matches whole class names', () => {
        expect(withDomFocus('.gh-focus-ring')).toBe('.gh-focus-ring');
        expect(withDomFocus('.gh-recents-focusable')).toBe('.gh-recents-focusable');
    });
});
