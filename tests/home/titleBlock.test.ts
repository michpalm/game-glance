import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TitleBlock } from '../../src/home/TitleBlock';

describe('TitleBlock', () => {
    it('renders text title when no logoUrls are provided', () => {
        const html = renderToStaticMarkup(React.createElement(TitleBlock, { eyebrow: 'Last played', title: 'Hades', chips: [] }));
        expect(html).toContain('class="gh-title"');
        expect(html).toContain('Hades');
        expect(html).not.toContain('class="gh-logo"');
    });

    it('renders logo image when logoUrls are given', () => {
        const html = renderToStaticMarkup(
            React.createElement(TitleBlock, {
                eyebrow: 'Last played',
                title: 'Hades',
                chips: [],
                logoUrls: ['https://example.com/logo.png'],
            }),
        );
        expect(html).toContain('class="gh-logo"');
        expect(html).toContain('src="https://example.com/logo.png"');
    });

    it('renders text title when preferLogos is false even if logoUrls are provided', () => {
        const html = renderToStaticMarkup(
            React.createElement(TitleBlock, {
                eyebrow: 'Last played',
                title: 'Hades',
                chips: [],
                logoUrls: ['https://example.com/logo.png'],
                preferLogos: false,
            }),
        );
        expect(html).toContain('class="gh-title"');
        expect(html).toContain('Hades');
        expect(html).not.toContain('class="gh-logo"');
    });
});

