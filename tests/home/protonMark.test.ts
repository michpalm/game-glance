import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProtonMark } from '../../src/home/ProtonMark';

describe('ProtonMark', () => {
    const svg = renderToStaticMarkup(createElement(ProtonMark));
    it('is the bare atom, drawn in the text colour: three orbits and a nucleus, no tile behind it', () => {
        expect(svg.match(/<ellipse/g)).toHaveLength(3);
        expect(svg).toContain('<circle');
        expect(svg).not.toMatch(/<rect|<path/);
        expect(svg).toContain('stroke="currentColor"');
        expect(svg).toContain('aria-hidden="true"');
    });
});
