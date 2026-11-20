import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeaturedCard } from '../../src/components/FeaturedCard';

const base = {
    featured: 'protondb' as const, hltb: undefined, playedMinutes: 0, locale: 'en-US', proton: undefined, achievements: undefined,
    playTime: { minutes: 0, twoWeeks: 0, lastPlayed: 0, icon: null, purchased: 0, reviews: null }, now: 1800000000,
};
const render = (over: object) => renderToStaticMarkup(createElement(FeaturedCard, { ...base, ...over }));

describe('FeaturedCard', () => {
    it('renders nothing for null', () => {
        expect(render({ featured: null })).toBe('');
    });
    it("HowLongToBeat's card carries both its own class and the featured shell's", () => {
        expect(render({ featured: 'hltb' })).toContain('class="gg-card gg-hltb gg-featured"');
        expect(render({ featured: 'hltb', hltb: { status: 'unavailable' } })).toContain('class="gg-card gg-hltb gg-featured"');
    });
    it('the achievements icon row uses classes, not inline styles', () => {
        const html = render({
            featured: 'achievements',
            achievements: { achieved: 1, total: 2, unlocked: [{ id: 'a', name: 'A', image: 'https://x.test/a.jpg', unlockedAt: 0, globalPct: 9 }] },
        });
        expect(html).toContain('class="gg-featured-icon"');
        expect(html).toContain('class="gg-featured-text"');
        expect(html).not.toContain('style="height');
    });
    it('shows the title and a skeleton while loading', () => {
        const html = render({});
        expect(html).toContain('ProtonDB');
        expect(html).toContain('gg-skeleton');
        expect(html).toContain('gg-card gg-featured gg-featured-protondb');
    });
    it('draws the ProtonDB tile in its tone, the rating in its tone, and the ladder with the rating lit', () => {
        const html = render({ proton: { status: 'found', tier: 'gold' }, compat: { deck: 1, tool: 'Proton 9.0' } });
        expect(html).toContain('<div class="gg-featured-icon gg-featured-mark" data-tone="gold" aria-hidden="true">');
        expect(html).toContain('<div class="gg-value" data-tone="gold" data-gg-scroll="line"><span>Gold</span></div>');
        expect(html).toContain('class="gg-ladder"');
        expect(html.match(/data-lit=""/g)).toHaveLength(1);
        expect(html).toContain('Unsupported on Steam Deck · runs with Proton 9.0');
    });
    it("Play time: the icon, the hours in the accent, and the columns in the dense card", () => {
        const html = render({ featured: 'played', playTime: { minutes: 90, twoWeeks: 0, lastPlayed: 0, icon: 'https://x.test/i.jpg', purchased: 0, reviews: 91 } });
        expect(html).toContain('gg-card gg-featured gg-featured-played gg-featured-dense');
        expect(html).toContain('<img src="https://x.test/i.jpg"');
        expect(html).toContain('<div class="gg-value gg-featured-accent" data-gg-scroll="line"><span>1.5 h played</span></div>');
        expect(html).toContain('Steam reviews');
    });
    it("HowLongToBeat's restyled track: one stretch per time, the fill along all of it", () => {
        const html = render({ featured: 'hltb', restyle: true, playedMinutes: 90, hltb: { status: 'found', gameId: 1, times: { main: 31.1, mainExtras: 46.9, completionist: 121.5 }, rating: 73 } });
        expect(html).toContain('class="gg-bar gg-track"');
        expect(html.match(/<span style="left:/g)).toHaveLength(3);
        expect(html).toContain('rated 73%');
    });
    it('draws the achievements icon row', () => {
        const html = render({
            featured: 'achievements',
            achievements: { achieved: 1, total: 2, unlocked: [{ id: 'a', name: 'Wood Riddance', image: 'https://x.test/a.jpg', unlockedAt: 1799000000, globalPct: 9 }] },
        });
        expect(html).toContain('<img src="https://x.test/a.jpg"');
        expect(html).toContain('Wood Riddance');
        expect(html).toContain('Latest');
    });
});

describe('scrolling text that doesn\'t fit (2026-11-18)', async () => {
    const { InfoCardPanel } = await import('../../src/components/InfoCard');
    it('the achievements card\'s latest name and its caption can scroll: each text sits in its own moving span', () => {
        const html = render({ featured: 'achievements', achievements: { achieved: 1, total: 2, unlocked: [{ id: 'a', name: 'A very long achievement name', image: '', unlockedAt: 0, globalPct: 9 }] } });
        expect(html).toMatch(/class="gg-value" data-gg-scroll="line"><span>A very long achievement name<\/span>/);
        expect(html).toMatch(/class="gg-caption" data-gg-scroll="line"><span>1 of 2 unlocked · rarest: A very long achievement name \(9\.0% have it\)<\/span>/);
    });
    it('the stat card\'s description can roll', () => {
        const html = renderToStaticMarkup(createElement(InfoCardPanel, { stats: [], description: 'Long text' }));
        expect(html).toMatch(/<p class="gg-desc" data-gg-scroll="roll"><span>Long text<\/span><\/p>/);
    });
});
