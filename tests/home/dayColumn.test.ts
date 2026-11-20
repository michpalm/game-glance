import { createElement, forwardRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@decky/ui', () => ({
    Focusable: forwardRef(({ children, onGamepadFocus, onActivate, noFocusRing, focusClassName, preferredFocus, navEntryPreferPosition, ...props }: any, ref: any) =>
        createElement('div', { ...props, ref, 'data-preferred': preferredFocus ? '' : undefined, 'data-entry': navEntryPreferPosition }, children)),
    ConfirmModal: () => null,
    showModal: () => {},
}));
vi.mock('../../src/home/homeNav', () => ({ openGame: vi.fn(), openNews: vi.fn(), openSteamUrl: vi.fn(), openStorePage: vi.fn() }));

const { DayColumn } = await import('../../src/home/DayColumn');
const { feedItems } = await import('../../src/home/feedLayout');

const art = () => ({ hero: [], capsule: [], wide: [] });
const item = (today: boolean) => feedItems('recommended', {
    news: [], friends: [], recommended: [],
    calendar: [{ key: '2026-11-18', weekday: 'Wed', date: '18/11', today, start: today, games: [{ appId: 3, name: 'Three', art: 'https://cdn/3.jpg' }, { appId: 4, name: '', art: null }] }],
}, art)[0];
const html = (today: boolean, preferred = true) => renderToStaticMarkup(createElement(DayColumn, { item: item(today), left: 270, accent: '#fff', preferred, onFocused: () => {}, setRef: () => {} }));

describe('DayColumn', () => {
    it('a positioned column with its heading and two stacked game cards', () => {
        const out = html(false);
        expect(out).toContain('class="gh-cal-day"');
        expect(out).toContain('left:270px;width:256px;height:270px');
        expect(out).toMatch(/gh-cal-head[^>]*><span class="gh-cal-weekday">Wed<\/span> ?<span class="gh-cal-date">18\/11<\/span>/);
        expect(out).toContain('aria-label="Three"');
        // Card tops (a variable: Home's card rule pins top with !important): under the 30 heading, then 112 + 8 lower.
        expect(out).toContain('--gh-card-top:30px');
        expect(out).toContain('--gh-card-top:150px');
        expect(out).toContain('url(&quot;https://cdn/3.jpg&quot;)');
    });
    it('today is marked and says so', () => {
        const out = html(true);
        expect(out).toContain('gh-cal-day gh-cal-today');
        expect(out).toContain('gh-cal-weekday">Today<');
    });
    it('the selected column and its first game claim preferred focus (Down from the tabs lands on the selected day)', () => {
        expect(html(false, true).match(/data-preferred/g)?.length).toBe(2);
        expect(html(false, false)).not.toContain('data-preferred');
    });
    it('a game with no name still gets a label for screen readers', () => {
        expect(html(false)).toContain('aria-label="Wed 18/11"');
    });
});
