import { describe, expect, it } from 'vitest';
import { TITLE_SIZES, TITLE_SIZE_COPY, TITLE_SCALE_VAR, titleScale, titleSizeOf } from '../../src/home/titleSize';
import { logoStyle } from '../../src/components/GameTitle';
import { logoFit } from '../../src/home/logo';
import { homeCss } from '../../src/home/homeCss';

describe('titleSize', () => {
    it('reads small and medium, anything else as large', () => {
        expect(titleSizeOf('small')).toBe('small');
        expect(titleSizeOf('medium')).toBe('medium');
        for (const v of ['large', 'huge', undefined, null, 0]) expect(titleSizeOf(v)).toBe('large');
        expect(TITLE_SIZES).toEqual(['small', 'medium', 'large']);
    });
    it('scales by 70%, 85% and 100%; unknown values at 100%', () => {
        expect([titleScale('small'), titleScale('medium'), titleScale('large'), titleScale('x')]).toEqual([0.7, 0.85, 1, 1]);
    });
    it('has a label and description for every size', () => {
        for (const size of TITLE_SIZES) {
            expect(TITLE_SIZE_COPY[size].label).not.toBe('');
            expect(TITLE_SIZE_COPY[size].description).not.toBe('');
        }
    });
});

describe('the logo box follows the title size', () => {
    const choice = { url: 'logo.png', trim: { x: 0, y: 100, width: 640, height: 160 }, natural: { width: 640, height: 360 } };
    const px = (n: number) => `${n}px`;
    it('is the fitted box at Large and scaled at Small, the crop unchanged', () => {
        const fit = logoFit(choice.trim, choice.natural);
        const full = logoStyle(choice, px);
        const small = logoStyle(choice, px, 0.7);
        expect(full.width).toBe(`${fit.width}px`);
        expect(small.width).toBe(`${Math.round(fit.width * 0.7 * 10) / 10}px`);
        expect(small.height).toBe(`${Math.round(fit.height * 0.7 * 10) / 10}px`);
        expect((small as Record<string, string>).objectViewBox).toBe((full as Record<string, string>).objectViewBox);
    });
    it('ignores a bad factor', () => {
        expect(logoStyle(choice, px, 0)).toEqual(logoStyle(choice, px));
        expect(logoStyle(choice, px, Number.NaN)).toEqual(logoStyle(choice, px));
    });
});

describe('the title type follows the title size', () => {
    it("Home's title and its open-transition twin multiply their size by the variable", () => {
        const css = homeCss();
        expect(css).toMatch(new RegExp(`\\.gh-title \\{[^}]*font-size: calc\\(58px \\* var\\(${TITLE_SCALE_VAR}, 1\\)\\)`));
        expect(css).toMatch(new RegExp(`\\.gh-twin\\[data-role="title"\\][^{]*\\{[^}]*font-size: calc\\([^;]*var\\(${TITLE_SCALE_VAR}, 1\\)\\)`));
    });
});
