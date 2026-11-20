import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FamilyPill, SourcePill } from '../../src/components/SourcePill';

describe('SourcePill bare (the store pill turned off)', () => {
    it('draws no store icon or name, only the family pill inside an unglazed anchor', () => {
        const html = renderToStaticMarkup(createElement(SourcePill, { label: 'Steam', bare: true }, createElement(FamilyPill, { label: 'Family Sharing · Sam' })));
        expect(html).toMatch(/^<span class="gg-pill gg-store-selectable gg-pill-bare"><span class="gg-family">/);
        expect(html).not.toContain('Steam');
        expect(html).toContain('Family Sharing · Sam');
    });
    it("takes the place's own class names (Home's open twin)", () => {
        const html = renderToStaticMarkup(createElement(SourcePill, { label: 'GOG', bare: true, className: 'gh-x-pill', selectableClassName: 'gh-x-selectable' }));
        expect(html).toBe('<span class="gh-x-pill gh-x-selectable gh-x-pill-bare"></span>');
    });
    it('is the usual pill when not bare', () => {
        expect(renderToStaticMarkup(createElement(SourcePill, { label: 'Steam' }))).toContain('Steam');
    });
});
