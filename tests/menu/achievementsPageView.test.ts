import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: {} }));
vi.mock('../../src/home/steamFocus', () => ({ takeSteamFocus: vi.fn() }));
import { AchievementsPageView } from '../../src/menu/components/AchievementsPage';
import type { AchievementsPageView as Page } from '../../src/menu/achievementsPage';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (typeof element.type === 'function' && !/^(MenuAction|Crumb|MenuPicker)$/.test(element.type.name)) return [element, ...tree((element.type as (p: unknown) => ReactNode)(element.props))];
    return [element, ...tree(element.props.children), ...tree(element.props.aside)];
}
const texts = (node: ReactNode) => tree(node).flatMap(e => [e.props.children, e.props.title, e.props.parent].flat()).filter(c => typeof c === 'string');
const byId = (node: ReactNode, id: string) => tree(node).find(e => e.props.id === id);

const page: Page = {
    header: '3 of 6 you can earn · 1 archived hidden', picked: 0, title: 'Next up · closest first',
    sets: [
        { id: 0, name: 'Base game', kind: 'Main game', count: '1 / 4', ratio: .25, done: false, base: true },
        { id: 2, name: 'Night Market', kind: 'DLC', count: '2 / 2', ratio: 1, done: true, base: false },
    ],
    items: [
        { key: 3, name: 'Ember Keeper', description: 'Collect 50 embers', icon: 'off3.jpg', right: '41 / 50', progress: .82, rarity: '22.5% of players', rare: false, unlocked: false },
        { key: 4, name: 'Hidden achievement', description: 'Keep playing to reveal it', icon: null, right: 'Locked', progress: null, rarity: '3.2% of players · Rare', rare: true, unlocked: false },
    ],
};

describe('AchievementsPageView', () => {
    it('heads the page with the game, the count, the sets and the picked set\'s list', () => {
        const out = AchievementsPageView({ game: 'Lanternfall', page, onPick: () => {}, openSteam: () => {} });
        const all = texts(out);
        for (const t of ['Lanternfall', 'Achievements', '3 of 6 you can earn · 1 archived hidden', 'Sets', 'Base game', 'Main game', '1 / 4', 'Night Market', 'Next up · closest first', 'Ember Keeper', '41 / 50', '22.5% of players', 'Open full list in Steam']) expect(all, t).toContain(t);
    });
    it('picks a set with A, marks the picked one and the done ones, and colours the base game\'s bar', () => {
        const onPick = vi.fn();
        const out = AchievementsPageView({ game: 'G', page, onPick, openSteam: () => {} });
        const base = byId(out, 'achievements:set:0')!, dlc = byId(out, 'achievements:set:2')!;
        expect([base.props.selected, dlc.props.selected]).toEqual([true, false]);
        expect(tree(out).find(e => e.props['data-gg-set'] === '2')).toBeTruthy();
        const bars = tree(out).filter(e => e.props.className === 'gg-ach-bar');
        expect(bars.map(b => b.props['data-base'])).toEqual(['', undefined]);
        expect(tree(bars[0].props.children)[0].props.style).toEqual({ width: '25%' });
        const trophy = (id: string) => tree(byId(out, id)!.props.children).some(e => e.props.className === 'gg-ach-trophy');
        expect([trophy('achievements:set:0'), trophy('achievements:set:2')]).toEqual([false, true]);
    });
    it('draws each achievement with its icon, its progress bar when it has steps, and a rare one marked', () => {
        const out = AchievementsPageView({ game: 'G', page, onPick: () => {}, openSteam: () => {} });
        const first = byId(out, 'achievements:item:3')!, second = byId(out, 'achievements:item:4')!;
        expect(tree(first.props.children).find(e => e.type === 'img')?.props.src).toBe('off3.jpg');
        expect(tree(first.props.children).find(e => e.props.className === 'gg-ach-progress')).toBeTruthy();
        expect(second.props.className).toContain('gg-ach-rare');
        expect(tree(second.props.children).some(e => e.type === 'img')).toBe(false);
    });
    it('opens Steam\'s full list from its button and from any achievement', () => {
        const openSteam = vi.fn();
        const out = AchievementsPageView({ game: 'G', page, onPick: () => {}, openSteam });
        byId(out, 'achievements:steam')!.props.onAction();
        byId(out, 'achievements:item:3')!.props.onAction();
        expect(openSteam).toHaveBeenCalledTimes(2);
    });
    it('says it is loading, or that it could not load, with Steam\'s list still a button away', () => {
        const loading = AchievementsPageView({ game: 'G', page: null, loading: true, onPick: () => {}, openSteam: () => {} });
        expect(texts(loading)).toContain('Loading achievements…');
        const failed = AchievementsPageView({ game: 'G', page: null, loading: false, onPick: () => {}, openSteam: () => {} });
        expect(texts(failed)).toContain('Could not load achievements.');
        expect(byId(failed, 'achievements:steam')).toBeTruthy();
    });
});

describe('moving around the page', () => {
    const view = (extra: Record<string, unknown> = {}) => AchievementsPageView({ game: 'G', page, onPick: () => {}, openSteam: () => {}, ...extra } as Parameters<typeof AchievementsPageView>[0]);
    const cls = (out: ReactNode, c: string) => tree(out).find(e => typeof e.props.className === 'string' && e.props.className.split(' ').includes(c))!;
    it('fills the panel: the sets and the list side by side, Left and Right between them, each scrolling on its own', () => {
        const out = view();
        expect(cls(out, 'gg-ach-page')).toBeTruthy();
        expect(cls(out, 'gg-ach').props['flow-children']).toBe('row');
        expect(cls(out, 'gg-ach-sets').props.ref).toBeTypeOf('function');
        expect(cls(out, 'gg-ach-list').props.ref).toBeTypeOf('function');
    });
    it('shows a set\'s list as soon as focus reaches the set', () => {
        const onPick = vi.fn();
        const out = view({ onPick });
        const button = { closest: (sel: string) => sel === '[data-gg-set]' ? { getAttribute: () => '2' } : null };
        cls(out, 'gg-ach-sets').props.onFocus({ target: button });
        expect(onPick).toHaveBeenCalledWith(2);
    });
    it('A on a set goes into its list', () => {
        const onEnter = vi.fn();
        const out = view({ onEnter });
        byId(out, 'achievements:set:2')!.props.onAction();
        expect(onEnter).toHaveBeenCalledWith(2);
    });
    it('B in the list or on its sort pill goes back to the set, not out of the page', () => {
        const onLeaveList = vi.fn(), stop = vi.fn();
        const out = view({ onLeaveList });
        // Anywhere in the right column (the list or its sort pill).
        cls(out, 'gg-ach-right').props.onCancel({ stopPropagation: stop, preventDefault: () => {} });
        expect(onLeaveList).toHaveBeenCalled();
        expect(stop).toHaveBeenCalled();
    });
});

it('starts every set\'s list at the top: the list is a new one for each set', () => {
    const list = (picked: number) => tree(AchievementsPageView({ game: 'G', page: { ...page, picked }, onPick: () => {}, openSteam: () => {} })).find(e => e.props.className === 'gg-ach-list')!;
    expect(list(0).key).toBe('list:0:closest');
    expect(list(2).key).toBe('list:2:closest');
});

describe('the sort pill (variant A)', () => {
    it('sits in the list\'s header above the scrolling list, names the order, and offers all four', () => {
        const onSort = vi.fn();
        const out = AchievementsPageView({ game: 'G', page, sort: 'rarest', onSort, onPick: () => {}, openSteam: () => {} } as Parameters<typeof AchievementsPageView>[0]);
        const pill = tree(out).find(e => e.props.id === 'achievements:sort')!;
        expect(pill.props).toMatchObject({ text: 'Rarest first', selected: 'rarest' });
        expect(pill.props.options.map((o: { id: string; label: string }) => [o.id, o.label])).toEqual([['closest', 'Closest first'], ['rarest', 'Rarest first'], ['common', 'Most common first'], ['recent', 'Recently unlocked']]);
        pill.props.onPick('recent');
        expect(onSort).toHaveBeenCalledWith('recent');
        const head = tree(out).find(e => e.props.className === 'gg-ach-list-head')!;
        expect(tree(head.props.children).some(e => e.props.id === 'achievements:sort')).toBe(true);
        expect(tree(out).find(e => e.props.className === 'gg-ach-list')!.key).toBe('list:0:rarest');
    });
});
