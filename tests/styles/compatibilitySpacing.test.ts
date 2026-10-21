import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { buildThemeCss, ThemeClasses } from '../../src/styles/themeCss';

const classes: ThemeClasses = {
    header: { TopCapsule: 'header' },
    details: { InnerContainer: 'inner', AppDetailsOverviewPanel: 'overview' },
    overview: undefined,
    root: { PlaySection: 'play', AppDetailsContainer: 'tabs' },
    play: { CloudStatusRow: 'cloud' },
};

// Evaluate the emitted spacing selectors against Steam's actual sibling structure.
function fixture(content: string) {
    const { document } = parseHTML(`<html><body><div class="play"></div><div class="cloud"></div>${content}<div class="tabs"></div><div id="after"><div class="Panel">Later content</div></div></body></html>`);
    const css = buildThemeCss(classes, { restyle: true });
    const matches = (id: string, property: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter(([, selector, body]) => selector.trim().startsWith('.play ~') && body.includes(property))
        .filter(([, selector]) => document.querySelector(id)!.matches(selector.trim()))
        .map(([, , body]) => body);
    return matches;
}

describe('compatibility spacing on Steam page structure', () => {
    it('leaves an empty placeholder and the tabs spacer alone', () => {
        const matches = fixture('<div id="empty" class="Panel"></div>');
        expect(matches('#empty', 'padding:')).toEqual([]);
        expect(matches('.tabs', 'margin-top: 0')).toEqual([]);
    });

    it('ignores a placeholder whose inner panel is empty', () => {
        const matches = fixture('<div id="empty"><div class="Panel"></div></div>');
        expect(matches('#empty', 'padding:')).toEqual([]);
        expect(matches('.tabs', 'margin-top: 0')).toEqual([]);
    });

    it('reserves the cards band before real feedback and removes only the duplicate tabs spacer', () => {
        const matches = fixture('<div class="Panel"></div><div id="feedback"><div class="Panel">Valve’s testing shows…</div></div>');
        expect(matches('#feedback', 'margin-top:').join(' ')).toContain('margin-top: calc(100vh - var(--gg-play-top) - var(--gg-row-h))');
        expect(matches('#feedback', 'padding:')).toHaveLength(1);
        expect(matches('.tabs', 'margin-top: 0')).toHaveLength(1);
    });

    it('does not reserve the cards band a second time for another populated row', () => {
        const matches = fixture('<div id="first"><div class="Panel">Feedback</div></div><div id="second"><div class="Panel">More feedback</div></div>');
        const margins = matches('#second', 'margin-top:');
        expect(margins.at(-1)).toContain('margin-top: 0');
    });

    it('does not restyle unrelated content after the tabs', () => {
        const matches = fixture('<div><div class="Panel">Feedback</div></div>');
        expect(matches('#after', 'padding:')).toEqual([]);
    });
});
