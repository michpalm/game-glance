import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { gateChoice } from '../../src/library/libraryGate';
import { CoverImg, LibraryLogo, LibraryPageView, type LibraryViewProps } from '../../src/library/LibraryPage';
import { readSteamProgress, requestSteamProgress } from '../../src/library/steamAchievements';
import { pageKitStyles } from '../../src/pageKit/pageKitStyles';
import type { LibGame, LibrarySnapshot } from '../../src/library/libraryModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (element.type === LibraryLogo) return [element];
    if (element.type === CoverImg) return [element, ...tree(element.props.fallback)];
    if (typeof element.type === 'function') return [element, ...tree((element.type as (p: unknown) => ReactNode)(element.props))];
    return [element, ...tree(element.props.children)];
}
const text = (node: ReactNode) => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string')).join('|');
const game = (appId: number): LibGame => ({ appId, name: `G${appId}`, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false });
const props = (extra: Partial<LibraryViewProps> = {}): LibraryViewProps => ({
    tabs: [{ key: 'recent', label: 'R', count: null }], tab: 'recent', games: [game(1), game(2)], focusIndex: 0, settled: null, glance: null, collectionTiles: [],
    sortLabel: 'Last played', hero: () => ({ urls: [], soft: false }), cover: () => [],
    onTab: () => {}, onFocus: () => {}, onOpen: () => {}, onSort: () => {}, onOptions: () => {}, onBack: () => {}, onGameMenu: () => {}, ...extra,
});
const snapshot: LibrarySnapshot = { games: [game(1)], installedIds: [], collections: [] };

describe('opening a game does not flash Steam\'s Library', () => {
    it('a path the Library route does not own keeps the previous choice', () => {
        const before = gateChoice({ enabled: true, snapshot, path: '/library/tab/AllGames', native: false });
        expect(gateChoice({ enabled: true, snapshot, path: '/library/app/1', native: false }, before)).toBe(before);
        expect(gateChoice({ enabled: true, snapshot, path: '/library/home', native: false }, before)).toBe(before);
    });
    it('without a previous choice, such a path is Steam\'s', () =>
        expect(gateChoice({ enabled: true, snapshot, path: '/library/app/1', native: false })).toEqual({ kind: 'native' }));
    it('a Library path still decides afresh', () =>
        expect(gateChoice({ enabled: true, snapshot, path: '/library/tab/Soundtracks', native: false }, { kind: 'ours', tab: 'all' })).toEqual({ kind: 'native' }));
});

describe('the sort shows which one is active', () => {
    it('draws the active sort beside the tabs', () => expect(text(LibraryPageView(props({ sortLabel: 'Playtime' })))).toContain('Playtime'));
});

describe('a cover opens its game\'s options on ≡, as Steam\'s Library does', () => {
    it('binds the menu button', () => {
        const onGameMenu = vi.fn();
        const cover = tree(LibraryPageView(props({ onGameMenu }))).find(e => e.props['data-gg-focus'] === 'library:2')!;
        expect(cover.props.onMenuActionDescription).toBe('Game options');
        cover.props.onMenuButton({ currentTarget: 'el' });
        expect(onGameMenu).toHaveBeenCalledWith(game(2), 'el');
    });
});

describe('tabs stay within the covers\' width and scroll', () => {
    it('the tab list scrolls sideways, its bumpers stay put', () => {
        expect(pageKitStyles).toMatch(/\.gg-pk-tabs-list\{[^}]*overflow-x:auto/);
        expect(pageKitStyles).toMatch(/\.gg-pk-tabs-list\{[^}]*min-width:0/);
    });
    it('the active tab is scrolled into the row\'s view, sideways only', () => {
        const out = tree(LibraryPageView(props({ tabs: [{ key: 'recent', label: 'R', count: null }, { key: 'all', label: 'A', count: 2 }], tab: 'all' })));
        const list = out.find(e => e.props.className === 'gg-pk-tabs-list')!;
        const row = { scrollLeft: 0, clientWidth: 300, querySelector: () => ({ offsetLeft: 500, offsetWidth: 120 }) };
        list.props.ref(row);
        expect(row.scrollLeft).toBe(500 + 120 - 300 + 24);
        const back = { scrollLeft: 400, clientWidth: 300, querySelector: () => ({ offsetLeft: 100, offsetWidth: 120 }) };
        list.props.ref(back);
        expect(back.scrollLeft).toBe(100 - 24);
    });
});

describe('achievements come from Steam\'s batched progress cache', () => {
    const cache = (map?: Map<number, unknown>) => ({ m_achievementProgress: map ? { mapCache: map } : undefined, GetAchievementProgress: vi.fn() });
    it('reads unlocked and total', () => {
        expect(readSteamProgress(cache(new Map([[5, { unlocked: 34, total: 54, percentage: 63 }]])), 5)).toEqual({ achieved: 34, total: 54 });
        expect(readSteamProgress(cache(new Map()), 5)).toBeUndefined();
        expect(readSteamProgress(cache(), 5)).toBeUndefined();
        expect(readSteamProgress(undefined, 5)).toBeUndefined();
    });
    it('asks Steam only for the games it lacks, in one pass', () => {
        const c = cache(new Map([[5, { unlocked: 1, total: 2 }]]));
        expect(requestSteamProgress(c, [5, 6, 7])).toBe(2);
        expect(c.GetAchievementProgress.mock.calls.map(x => x[0])).toEqual([6, 7]);
    });
    it('never throws', () => expect(requestSteamProgress({ GetAchievementProgress: () => { throw new Error('x'); } }, [1])).toBe(0));
});

describe('device check 2', () => {
    it('Down keeps the column: every row enters at the same x it was left from', async () => {
        const many = Array.from({ length: 40 }, (_, i) => game(i + 1));
        const rows = tree(LibraryPageView(props({ games: many }))).filter(e => e.props.className === 'gg-library-row');
        expect(rows.length).toBeGreaterThan(1);
        for (const r of rows) expect(r.props.navEntryPreferPosition).toBe(2);
    });
    it('device check 3: the hero stays a top band; below it the same art blurred, not black', async () => {
        const { libraryStyles } = await import('../../src/library/libraryStyles');
        const out = tree(LibraryPageView(props({ settled: game(1), hero: () => ({ urls: ['h.jpg'], soft: false }) })));
        const backdrop = out.find(e => e.props.className === 'gg-pk-backdrop')!;
        expect(backdrop.props.style.backgroundImage).toBe('url("h.jpg")');
        expect(libraryStyles).toMatch(/\.gg-library-hero\{[^}]*height:calc\(var\(--gg-d,1px\) \* 560\)/);
        expect(out.some(e => e.props.className === 'gg-library-scrim')).toBe(false);
    });
    it('device check 3: the facts\' shade is a soft oval, lighter than before', async () => {
        const { libraryStyles } = await import('../../src/library/libraryStyles');
        const shade = /\.gg-library-hero-shade\{[^}]*\}/.exec(libraryStyles)![0];
        expect(shade).toContain('radial-gradient');
        expect(shade).not.toContain('.84');
    });
    it('device check 3: the tab row follows the active tab on every change, not only on mount', () => {
        const twoRenders = [0, 1].map(() => tree(LibraryPageView(props({ tabs: [{ key: 'recent', label: 'R', count: null }]}))).find(e => e.props.className === 'gg-pk-tabs-list')!.props.ref);
        expect(twoRenders[0]).not.toBe(twoRenders[1]);
    });
});
