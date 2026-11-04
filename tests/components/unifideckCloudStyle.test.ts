import { describe, expect, it } from 'vitest';
import { unifideckCloudCss, UNIFIDECK_CLOUD_BUTTON } from '../../src/components/unifideckCloudStyle';
import { CLOUD_COLOURS, CLOUD_GLYPH_URL } from '../../src/home/cloud';

describe('unifideckCloudCss (Game Glance’s cloud on Unifideck’s button)', () => {
    it('finds Unifideck’s cloud button by its shape, in any language, and our own circle', () => {
        // Ally 2026-11-04: only the cloud button wraps its icon in a span; its label changes with state and language.
        expect(UNIFIDECK_CLOUD_BUTTON).toBe('.unifideck-icon-btn:has(> span > svg)');
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
    expect(image.startsWith('.unifideck-hide-native-play .unifideck-icon-btn:has(> span > svg),.unifideck-hide-native-play .unifideck-icon-btn:has(> span > svg):is(.gpfocus, :focus),.gg-uni-cloud{')).toBe(true);
});
