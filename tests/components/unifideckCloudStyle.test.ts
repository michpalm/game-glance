import { describe, expect, it } from 'vitest';
import { unifideckCloudCss, UNIFIDECK_CLOUD_BUTTON } from '../../src/components/unifideckCloudStyle';
import { CLOUD_COLOURS, CLOUD_GLYPH_URL } from '../../src/home/cloud';

describe('unifideckCloudCss (Game Glance’s cloud on Unifideck’s button)', () => {
    it('finds Unifideck’s cloud button by its place, in any state and language, and our own circle', () => {
        // Ally 2026-11-04: an installed game's round buttons are cloud, controller, settings, Uninstall; the cloud's icon
        // shape and label change with its state, its place does not.
        expect(UNIFIDECK_CLOUD_BUTTON).toBe('.unifideck-icon-btn:first-child:has(~ .unifideck-icon-btn ~ .unifideck-icon-btn ~ .unifideck-icon-btn)');
        const css = unifideckCloudCss('ok');
        expect(css).toContain(`${UNIFIDECK_CLOUD_BUTTON},.gg-uni-cloud{`);
    });
    it('draws the white cloud, drops Unifideck’s ring and glyph, and dots the state in our colours', () => {
        for (const tone of ['ok', 'busy', 'bad', 'off'] as const) {
            const css = unifideckCloudCss(tone);
            expect(css).toContain('box-shadow:none!important');
            expect(css).toContain(CLOUD_GLYPH_URL);
            expect(css).toMatch(/> \*,\.gg-uni-cloud > \*\{visibility:hidden!important\}/);
            expect(css).toContain(`background:${CLOUD_COLOURS[tone]}`);
        }
    });
});

it('keeps the cloud on focus, where the page’s focus rule resets Unifideck buttons’ background', () => {
    // themeCss gives focused Unifideck buttons `background: … !important` from a more specific selector.
    const css = unifideckCloudCss('ok');
    const image = css.split('\n').find(line => line.includes('background-image'))!;
    expect(image.startsWith(`.unifideck-hide-native-play ${UNIFIDECK_CLOUD_BUTTON},.unifideck-hide-native-play ${UNIFIDECK_CLOUD_BUTTON}:is(.gpfocus, :focus),.gg-uni-cloud{`)).toBe(true);
});

import { parseHTML } from 'linkedom';
it('matches the cloud in its badge and plain states, and nothing in a three-button row', () => {
    const row = (cloud: string, n = 4) => parseHTML(`<div>${cloud}${'<button class="unifideck-icon-btn"><svg></svg></button>'.repeat(n - 1)}</div>`).document;
    const badge = row('<button class="unifideck-icon-btn" id="c"><span><svg></svg></span></button>');
    const plain = row('<button class="unifideck-icon-btn unifideck-breathe" id="c"><svg></svg></button>');
    for (const doc of [badge, plain]) expect([...doc.querySelectorAll(UNIFIDECK_CLOUD_BUTTON)].map(b => b.id)).toEqual(['c']);
    expect(row('<button class="unifideck-icon-btn" id="c"><svg></svg></button>', 3).querySelectorAll(UNIFIDECK_CLOUD_BUTTON)).toHaveLength(0);
});
