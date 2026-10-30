import { describe, expect, it } from 'vitest';
import { PAGE_SHADINGS, PAGE_SHADING_COPY, pageShadingOf } from '../../src/home/pageShading';

describe('pageShadingOf', () => {
    it('reads bottom and none, anything else as bottom', () => {
        expect(pageShadingOf('none')).toBe('none');
        for (const v of ['bottom', 'full', undefined, null, 0]) expect(pageShadingOf(v)).toBe('bottom');
        expect(PAGE_SHADINGS).toEqual(['bottom', 'none']);
    });
    it("carries the spec's copy for each option", () => {
        expect(PAGE_SHADING_COPY).toEqual({
            bottom: { label: 'Bottom half', description: 'A soft shade behind the games and cards, none at the top.' },
            none: { label: 'None', description: 'The art stays clear to every edge.' },
        });
    });
});
