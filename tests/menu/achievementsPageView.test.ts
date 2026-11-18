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
        { key: 3, name: 'Ember Keeper', description: 'Collect 50 embers', icon: 'off3.jpg', right: '41 / 50', progress: .82, rarity: '22.5% of players', rare: false, unlocked: false, pinned: true },
        { key: 4, name: 'Hidden achievement', description: 'Keep playing to reveal it', icon: null, right: 'Locked', progress: null, rarity: '3.2% of players · Rare', rare: true, unlocked: false, pinned: false },
    ],
    pins: [3],
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
        const head = tree(out).find(e => typeof e.props.className === 'string' && e.props.className.split(' ').includes('gg-ach-list-head'))!;
        expect(tree(head.props.children).some(e => e.props.id === 'achievements:sort')).toBe(true);
        expect(tree(out).find(e => e.props.className === 'gg-ach-list')!.key).toBe('list:0:rarest');
    });
});

describe('pageGame: whose page the menu draws for achievements:<appId>', async () => {
    const { pageGame } = await import('../../src/menu/components/AchievementsPage');
    const running = { appId: 7, gameId: '7', name: 'Running', kind: 'local' as const, actionIds: [] };
    it('the running game is itself, and Steam\'s list opens in its overlay', () => {
        expect(pageGame(7, running, () => 'Lib')).toEqual({ game: running, steamList: 'achievements' });
    });
    it('another game takes its name from the library, and Steam\'s list opens from the library', () => {
        expect(pageGame(292030, running, id => id === 292030 ? 'The Witcher 3' : undefined)).toEqual({
            game: { appId: 292030, gameId: '292030', name: 'The Witcher 3', kind: 'local', actionIds: [] }, steamList: 'achievements-list' });
        expect(pageGame(5, null, () => undefined).game.name).toBe('');
    });
});

describe('layout and scrolling (2026-11-18)', () => {
    const view = () => AchievementsPageView({ game: 'G', page, onPick: () => {}, openSteam: () => {} });
    const find = (out: ReactNode, c: string) => tree(out).find(e => typeof e.props.className === 'string' && e.props.className.split(' ').includes(c));
    it('puts Open full list in Steam under the sets, not below both columns', () => {
        const out = view();
        const left = find(out, 'gg-ach-left')!;
        expect(tree(left.props.children).some(e => e.props.id === 'achievements:steam')).toBe(true);
        expect(find(out, 'gg-ach-actions')?.props.className).toContain('gg-ach-left-actions');
    });
    it('both columns open with the same header row, outside their scrolling lists, so titles and first cards line up', () => {
        const out = view();
        const heads = tree(out).filter(e => typeof e.props.className === 'string' && e.props.className.split(' ').includes('gg-ach-head'));
        expect(heads).toHaveLength(2);
        expect(tree(heads[0].props.children).some(e => e.type === 'h3' && e.props.children === 'Sets')).toBe(true);
        expect(tree(find(out, 'gg-ach-sets')!.props.children).some(e => e.type === 'h3')).toBe(false);
        expect(heads[1].props.className).toContain('gg-ach-list-head');
    });
    it('the sort list opens in place under its pill (it never covers the achievements)', () => {
        expect(find(view(), 'gg-ach-list-head')!.props.className).toContain('gg-ach-list-head');
    });
});

describe('followFocus: a column shows the focused row at once, in one step', async () => {
    const { followFocus } = await import('../../src/menu/components/AchievementsPage');
    it('scrolls the column the moment a row out of view takes focus, with a margin', () => {
        const listeners: Record<string, (e: unknown) => void> = {};
        const column = { scrollTop: 0, scrollHeight: 1000, clientHeight: 300, getBoundingClientRect: () => ({ top: 0, bottom: 300, height: 300 }),
            addEventListener: (t: string, f: (e: unknown) => void) => { listeners[t] = f; }, removeEventListener: vi.fn(), contains: () => true };
        const row = { getBoundingClientRect: () => ({ top: 320, bottom: 380, height: 60 }), closest: () => row };
        const stop = followFocus(column as unknown as HTMLElement);
        listeners.focusin({ target: row });
        expect(column.scrollTop).toBe(380 - 300 + 28);
        stop();
        expect(column.removeEventListener).toHaveBeenCalled();
    });
    it('leaves the column alone when the row is already in view', () => {
        const listeners: Record<string, (e: unknown) => void> = {};
        const column = { scrollTop: 50, scrollHeight: 1000, clientHeight: 300, getBoundingClientRect: () => ({ top: 0, bottom: 300, height: 300 }),
            addEventListener: (t: string, f: (e: unknown) => void) => { listeners[t] = f; }, removeEventListener: () => {}, contains: () => true };
        const row = { getBoundingClientRect: () => ({ top: 100, bottom: 160, height: 60 }), closest: () => row };
        followFocus(column as unknown as HTMLElement);
        listeners.focusin({ target: row });
        expect(column.scrollTop).toBe(50);
    });
});

describe('markEdges: a column says which way there is more to scroll (its edges fade)', async () => {
    const { markEdges } = await import('../../src/menu/components/AchievementsPage');
    const column = (scrollTop: number) => {
        const attrs: Record<string, string> = {}; const listeners: Record<string, () => void> = {};
        const el = { scrollTop, scrollHeight: 1000, clientHeight: 300, setAttribute: (k: string, v: string) => { attrs[k] = v; }, removeAttribute: (k: string) => { delete attrs[k]; },
            addEventListener: (t: string, f: () => void) => { listeners[t] = f; }, removeEventListener: vi.fn() };
        return { el, attrs, listeners };
    };
    it('at the top: more below only; in the middle: both; at the end: more above only', () => {
        const c = column(0);
        markEdges(c.el as unknown as HTMLElement);
        expect(c.attrs).toEqual({ 'data-more-below': '' });
        c.el.scrollTop = 400; c.listeners.scroll();
        expect(c.attrs).toEqual({ 'data-more-above': '', 'data-more-below': '' });
        c.el.scrollTop = 700; c.listeners.scroll();
        expect(c.attrs).toEqual({ 'data-more-above': '' });
    });
});

describe('pins: Y on an achievement (2026-11-18)', () => {
    it('Y pins or unpins the achievement, and Steam\'s footer names which', () => {
        const onTogglePin = vi.fn();
        const out = AchievementsPageView({ game: 'G', page, onPick: () => {}, openSteam: () => {}, onTogglePin });
        const pinned = byId(out, 'achievements:item:3')!, other = byId(out, 'achievements:item:4')!;
        expect(pinned.props.optionsLabel).toBe('Unpin');
        expect(other.props.optionsLabel).toBe('Pin');
        other.props.onOptions();
        expect(onTogglePin).toHaveBeenCalledWith(4);
    });
    it('marks a pinned row with a pin before its name', () => {
        const out = AchievementsPageView({ game: 'G', page, onPick: () => {}, openSteam: () => {} });
        const pinned = byId(out, 'achievements:item:3')!, other = byId(out, 'achievements:item:4')!;
        expect(pinned.props.className).toContain('gg-ach-pinned');
        expect(other.props.className).not.toContain('gg-ach-pinned');
        expect(tree(pinned.props.children).some(e => e.props.className === 'gg-ach-pin')).toBe(true);
        expect(tree(other.props.children).some(e => e.props.className === 'gg-ach-pin')).toBe(false);
    });
});

describe('MenuAction: the Y button', async () => {
    const { MenuAction } = await import('../../src/menu/components/MenuAction');
    it('passes Y and its footer label to Steam\'s button only when given', () => {
        const onOptions = vi.fn();
        const withY = MenuAction({ id: 'x', children: 'X', onAction: () => {}, onOptions, optionsLabel: 'Pin' }) as ReactElement<Record<string, any>>;
        expect(withY.props.onOptionsActionDescription).toBe('Pin');
        withY.props.onOptionsButton();
        expect(onOptions).toHaveBeenCalled();
        const plain = MenuAction({ id: 'x', children: 'X', onAction: () => {} }) as ReactElement<Record<string, any>>;
        expect(plain.props.onOptionsButton).toBeUndefined();
    });
});
