import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { buildThemeCss, ThemeClasses } from '../../src/styles/themeCss';

const classes: ThemeClasses = {
    header: undefined, details: undefined, overview: undefined, root: undefined,
    play: undefined, shared: { SharedLibrary: 'shared', Row: 'row' },
};

// Apply the emitted selectors to a real DOM fixture. Represent browser pseudo states with
// attributes because linkedom does not track browser focus or pointer state.
function appearance({ gamepad = false, focused = false, mouse = false, hover = false } = {}) {
    const { document } = parseHTML(`<html${mouse ? ' data-gg-mouse' : ''}><body><div class="row shared"><a role="button" class="gg-copy-pill ${gamepad ? 'gpfocus' : ''}" ${focused ? 'data-dom-focus' : ''} ${hover ? 'data-hovered' : ''}>Change preferred copy</a></div></body></html>`);
    const css = '.shared { min-height: 36px; }\n.gg-copy-pill { background: rgba(12, 16, 22, 0.4); color: #fff; }\n' + buildThemeCss(classes, { restyle: true });
    const row = document.querySelector('.shared')!;
    const link = document.querySelector('a')!;
    const rowStyle: Record<string, string> = {};
    const linkStyle: Record<string, string> = {};
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!selector.includes('.shared') && !selector.includes('.gg-copy-pill')) continue;
        const matchable = selector.trim().replaceAll(':focus', '[data-dom-focus]').replaceAll(':hover', '[data-hovered]');
        // The icon's generated content does not affect the link's own focus or row height.
        if (matchable.includes('::')) continue;
        const declarations = [...body.matchAll(/(?:^|;)\s*(min-height|background|color|box-shadow):\s*([^;]+)/g)]
            .map(([, name, value]) => [name, value.replace(/\s*!important$/, '').trim()]);
        if (row.matches(matchable)) Object.assign(rowStyle, Object.fromEntries(declarations));
        if (link.matches(matchable)) Object.assign(linkStyle, Object.fromEntries(declarations));
    }
    return { row: rowStyle, link: linkStyle };
}

describe('preferred copy appearance', () => {
    it('removes Steam’s minimum row height after its text is collapsed', () => {
        expect(appearance().row['min-height']).toBe('0');
    });

    it('keeps DOM focus visible when Steam has removed gpfocus after touch', () => {
        expect(appearance({ focused: true }).link.background).toBe('rgba(12, 16, 22, 0.4)');
        expect(appearance({ focused: true }).link.color).toBe('#fff');
        expect(appearance({ focused: true }).link['box-shadow']).toContain('var(--glance-accent)');
    });

    it('highlights gamepad focus with Home’s accent glow', () => {
        expect(appearance({ gamepad: true }).link.background).toBe('rgba(12, 16, 22, 0.4)');
        expect(appearance({ gamepad: true }).link['box-shadow']).toContain('var(--glance-accent)');
    });

    it('does not leave a pressed-looking fill when a mouse retains gamepad or DOM focus', () => {
        expect(appearance({ mouse: true, gamepad: true, focused: true }).link.background).toBe('rgba(12, 16, 22, 0.4)');
        expect(appearance({ mouse: true, gamepad: true, focused: true }).link.color).toBe('#fff');
    });

    it('shows a mouse hover ring without leaving one after touch', () => {
        expect(appearance({ mouse: true, hover: true }).link['box-shadow']).toBeDefined();
        expect(appearance({ hover: true }).link['box-shadow']).toBeUndefined();
    });
});
