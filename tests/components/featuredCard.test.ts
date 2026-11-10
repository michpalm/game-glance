import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeaturedCard } from '../../src/components/FeaturedCard';

const base = {
    featured: 'protondb' as const, hltb: undefined, playedMinutes: 0, locale: 'en-US', proton: undefined, achievements: undefined,
    playTime: { minutes: 0, twoWeeks: 0, lastPlayed: 0 }, now: 1800000000,
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
    it('draws the ProtonDB mark with its tone', () => {
        const html = render({ proton: { status: 'found', tier: 'platinum' } });
        expect(html).toContain('<span class="gg-mark" data-tone="platinum" aria-hidden="true">');
        expect(html).toContain('Platinum');
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
