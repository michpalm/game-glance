import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { buildThemeCss, ThemeClasses } from '../../src/styles/themeCss';

const classes: ThemeClasses = {
    header: undefined, details: undefined, overview: undefined, root: { ActionRow: 'actions' },
    play: { StatusAndStats: 'status', PermanentlyUnavailable: 'unavailable', GameStatsSection: 'stats', Playtime: 'played', LastPlayed: 'last' },
};

// Steam renders InvalidPlatform (display_status 14) inside StatusAndStats.PermanentlyUnavailable.
// Match every hiding rule against the element and its ancestors: a visible child cannot escape a hidden parent.
function isHidden(css: string, markup: string, id: string): boolean {
    const { document } = parseHTML(`<html><body>${markup}</body></html>`);
    const selectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter(([, , body]) => /display:\s*none\s*!important/.test(body))
        .map(([, selector]) => selector.trim());
    let el = document.getElementById(id);
    while (el) {
        if (selectors.some((selector) => el!.matches(selector))) return true;
        el = el.parentElement;
    }
    return false;
}

const platformMessage = '<div class="status unavailable"><div><div class="invalid-platform" id="reason">Available for <img alt="Windows"></div></div></div>';

describe('unavailable game explanations (#62)', () => {
    it.each([false, true])('keeps Steam’s platform restriction visible with restyle=%s', (restyle) => {
        expect(isHidden(buildThemeCss(classes, { restyle }), platformMessage, 'reason')).toBe(false);
    });
    it('keeps other permanent-unavailability explanations visible', () => {
        expect(isHidden(buildThemeCss(classes), '<div class="status unavailable"><div id="reason">Not available</div></div>', 'reason')).toBe(false);
    });
    it('still hides the normal status wrapper and duplicate statistics', () => {
        const css = buildThemeCss(classes);
        expect(isHidden(css, '<div class="status" id="normal">Last played yesterday</div>', 'normal')).toBe(true);
        for (const cls of ['stats', 'played', 'last']) {
            expect(isHidden(css, `<div class="${cls}" id="duplicate">Play time</div>`, 'duplicate')).toBe(true);
        }
    });
    it('anchors the unavailable reason below the button without occupying the action row', () => {
        const css = buildThemeCss(classes);
        const { document } = parseHTML('<html><body><div class="actions"><div class="status unavailable" id="reason">Available for Windows</div></div><div class="actions" id="normal"></div></body></html>');
        const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
        const positioning = rules.filter(([, , body]) => /position:\s*(absolute|relative)\s*!important/.test(body));
        expect(positioning.some(([, selector, body]) => document.getElementById('reason')!.matches(selector.trim()) && /position:\s*absolute/.test(body))).toBe(true);
        expect(positioning.some(([, selector]) => document.getElementById('normal')!.matches(selector.trim()))).toBe(false);
    });
    it('hides the native duplicate only after the restyled metadata warning exists', () => {
        const restyled = { ...classes, header: { TopCapsule: 'header' }, details: { InnerContainer: 'inner', AppDetailsOverviewPanel: 'overview' }, root: { ...classes.root, AppDetailsContainer: 'tabs' } };
        const css = buildThemeCss(restyled, { restyle: true });
        const source = '<div class="status unavailable"><div id="reason">Available for Windows</div></div>';
        expect(isHidden(css, `<div class="inner"><div class="gg-titleblock"></div>${source}</div>`, 'reason')).toBe(false);
        expect(isHidden(css, `<div class="inner"><div class="gg-titleblock"><span class="gg-availability">Available for Windows</span></div>${source}</div>`, 'reason')).toBe(true);
    });
    it('does not blanket-hide messages when Steam’s unavailable class cannot be found', () => {
        const css = buildThemeCss({ ...classes, play: { ...classes.play, PermanentlyUnavailable: undefined } });
        expect(isHidden(css, platformMessage, 'reason')).toBe(false);
    });
});
