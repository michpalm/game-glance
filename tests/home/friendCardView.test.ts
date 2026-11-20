import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({
    Focusable: ({ children, className, focusClassName: _f, noFocusRing: _n, preferredFocus: _p, onGamepadFocus: _g, onGamepadBlur: _b, onActivate: _a, ...rest }: Record<string, unknown>) =>
        createElement('div', { className, ...rest }, children as never),
    ConfirmModal: 'div', showModal: () => {}, Navigation: {},
}));
import { FeedCard } from '../../src/home/FeedCards';
import { FRIEND_BAND_H, type FeedItem } from '../../src/home/feedLayout';
import { homeCss } from '../../src/home/homeCss';

const friend = (layout: 'wide' | 'band', extra: Partial<FeedItem> = {}): FeedItem => ({
    key: 'friend-a', row: 0, width: layout === 'wide' ? 474 : 230, height: 260, featured: false, art: ['art.jpg'], pill: layout === 'wide' ? 'Join' : '',
    title: 'efors', sub: 'x', accentAppId: null, opens: null,
    avatar: { url: 'av.jpg', initial: 'e', inGame: layout === 'wide', ring: 'online' }, backdrop: { url: 'av.jpg', tone: 'online' },
    friendCard: { layout, grey: false, lines: [
        { text: 'Playing Golf', tone: 'status-online' }, { text: 'Hole 7', tone: 'detail' }, { text: '45 min', tone: 'meta' }, { text: 'Hole in One · 12 min ago', tone: 'achievement' },
    ] },
    ...extra,
});
const html = (item: FeedItem) => renderToStaticMarkup(createElement(FeedCard, { item, left: 0, accent: '#fff', preferred: false, onFocused: () => {}, setRef: () => {} }));
const order = (out: string, parts: string[]) => parts.map(p => out.indexOf(p));

describe('friend cards (A3)', () => {
    it('a band card: the band class, the avatar, the name, then one element per line in order', () => {
        const out = html(friend('band'));
        expect(out).toContain('gh-card-friend-band');
        const at = order(out, ['gh-avatar', '>efors<', 'gh-fc-status-online', 'gh-fc-detail', 'gh-fc-meta', 'gh-fc-achievement']);
        expect(at.every(i => i >= 0)).toBe(true);
        expect([...at].sort((a, b) => a - b)).toEqual(at);
        expect(out).not.toContain('gh-card-sub');
    });
    it('a wide card: the wide class, the pill and the lines', () => {
        const out = html(friend('wide'));
        expect(out).toContain('gh-card-friend-wide');
        expect(out).toContain('Join');
        expect(out).toContain('Hole in One · 12 min ago');
    });
    it('the achievement line carries a trophy; grey cards carry gh-fc-grey', () => {
        expect(html(friend('band'))).toMatch(/gh-fc-achievement[^>]*>\s*<svg/);
        expect(html(friend('band', { friendCard: { layout: 'band', grey: true, lines: [] } }))).toContain('gh-fc-grey');
    });
    it('a card without friendCard draws as before (gh-card-sub)', () => {
        const { friendCard: _drop, ...plain } = friend('band');
        expect(html(plain as FeedItem)).toContain('gh-card-sub');
    });
});

describe('friend card styles', () => {
    const css = homeCss();
    const rule = (sel: string) => css.split('}').find(r => r.includes(sel + '{') || r.includes(sel + ' {')) ?? '';
    it('every line is one line, cut with an ellipsis (Review Focus 3)', () => {
        expect(rule('.gh-fc-line')).toMatch(/white-space:\s*nowrap/);
        expect(rule('.gh-fc-line')).toMatch(/text-overflow:\s*ellipsis/);
        expect(rule('.gh-fc-line')).toMatch(/overflow:\s*hidden/);
    });
    it('the band is the header art\'s shape at the card\'s width (230 x 215/460 = 108), so the art is never cut; the achievement line sits at the bottom', () => {
        expect(FRIEND_BAND_H).toBe(108);
        expect(rule('.gh-card-friend-band .gh-card-art')).toContain('height: 108px');
        expect(rule('.gh-card-friend-band .gh-card-art')).toContain('background-size: cover');
        expect(rule('.gh-card-friend-band .gh-avatar')).toContain('top: 72px');
        expect(rule('.gh-card-friend-band .gh-fc-text')).toContain('top: 122px');
        expect(rule('.gh-fc-achievement')).toMatch(/margin-top:\s*auto/);
    });
    it('the name and lines never shrink, so letters below the line are never clipped (PS5: "plaved", "dav aao")', () => {
        expect(rule('.gh-fc-text > *')).toMatch(/flex-shrink:\s*0/);
    });
    it('offline band art is greyed', () => {
        expect(rule('.gh-fc-grey .gh-card-art')).toMatch(/grayscale\(1\)/);
    });
});
