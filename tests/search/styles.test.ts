import { describe, expect, it } from 'vitest';
import { searchStyles } from '../../src/search/styles';
import { menuStyles } from '../../src/menu/styles';
import { IDLE_TILE, SURFACE_RIM } from '../../src/styles/tokens';

const ruleFor = (css: string, selector: string) => {
    const at = css.indexOf(`\n${selector}{`);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf('}', at));
};

describe('library search: the menu\'s contrast lift on the panel and its matches', () => {
    it('rims the results panel as the menu\'s bar and panel, and keeps its drop shadow', () => {
        // (The first .gg-search-overlay rule holds the tokens; the panel's own is the positioned one.)
        const panel = /\n\.gg-search-overlay\{position:fixed[^}]*/.exec(searchStyles)?.[0] ?? '';
        expect(panel).toContain(`border:${SURFACE_RIM.border}`);
        expect(panel).toContain(`box-shadow:${SURFACE_RIM.shadow},0 16px 35px #0006`);
        expect(panel).not.toContain('var(--gg-edge)');
    });
    it('gives an idle match the menu tiles\' edge and tint, so rows separate over dark art', () => {
        const row = ruleFor(searchStyles, '.gg-search-row');
        expect(row).toContain(`border:1px solid ${IDLE_TILE.edge}!important`);
        expect(row).toContain(`background-image:linear-gradient(${IDLE_TILE.tint},${IDLE_TILE.tint})!important`);
    });
    it('the focused match drops the tint: its ring and lighter fill stay the only mark', () => {
        expect(ruleFor(searchStyles, '.gg-search-overlay .gg-search-row:is(.gpfocus,:focus-visible)')).toContain('background-image:none!important');
    });
    it('shares the values with the menu (one source)', () => {
        expect(menuStyles).toContain(`border:${SURFACE_RIM.border};box-shadow:${SURFACE_RIM.shadow}`);
        expect(menuStyles).toContain(`border-color:${IDLE_TILE.edge}`);
        expect(menuStyles).toContain(`linear-gradient(${IDLE_TILE.tint},${IDLE_TILE.tint})`);
        expect(SURFACE_RIM.border).toBe('1.5px solid rgba(182,199,224,.49)');
        expect(IDLE_TILE).toEqual({ edge: 'rgba(182,199,224,.24)', tint: 'rgba(124,151,191,.075)' });
    });
});
