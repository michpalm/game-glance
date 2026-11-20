import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { CoverImg, LibraryLogo, GRID, LibraryPageView, visibleRows, type LibraryViewProps } from '../../src/library/LibraryPage';
import { Tabs } from '../../src/pageKit/PageKit';
import type { LibGame } from '../../src/library/libraryModel';

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

const game = (appId: number, name = `Game ${appId}`): LibGame => ({ appId, name, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false });
const games = Array.from({ length: 30 }, (_, i) => game(i + 1));
const props = (extra: Partial<LibraryViewProps> = {}): LibraryViewProps => ({
    tabs: [{ key: 'recent', label: 'Recently played', count: null }, { key: 'all', label: 'All games', count: 30 }], tab: 'recent',
    games, focusIndex: 2, settled: games[2], collectionTiles: [],
    glance: { progress: [{ label: 'Achievements', value: '13 of 78', ratio: .17 }], facts: [{ label: 'Played', value: '42 h 43 min' }], collections: ['Favorites'] },
    hero: id => ({ urls: [`hero-${id}.jpg`], soft: false }), cover: id => (id === 5 ? [] : [`cover-${id}.jpg`]),
    onTab: () => {}, onFocus: () => {}, onOpen: () => {}, onSort: () => {}, onOptions: () => {}, onBack: () => {}, ...extra,
});

describe('LibraryPageView', () => {
    it('draws the title, the facts and the tabs before the grid', () => {
        const out = tree(LibraryPageView(props()));
        expect(out[0].props.className).toContain('gg-library');
        expect(text(LibraryPageView(props()))).toContain('Library');
        for (const s of ['Achievements', '13 of 78', 'Played', '42 h 43 min', 'Favorites']) expect(text(LibraryPageView(props()))).toContain(s);
        const tabsAt = out.findIndex(e => e.type === Tabs), gridAt = out.findIndex(e => e.props.className === 'gg-library-grid');
        expect(tabsAt).toBeGreaterThan(-1);
        expect(gridAt).toBeGreaterThan(tabsAt);
    });
    it('leaves out the Progress group when nothing is known', () => {
        const out = text(LibraryPageView(props({ glance: { progress: [], facts: [], collections: [] } })));
        expect(out).not.toContain('Achievements');
        expect(tree(LibraryPageView(props({ glance: { progress: [], facts: [], collections: [] } }))).some(e => e.props.className === 'gg-library-progress')).toBe(false);
    });
    it('covers open the game page and sort on X', () => {
        const onOpen = vi.fn(), onSort = vi.fn();
        const cover = tree(LibraryPageView(props({ onOpen, onSort }))).find(e => e.props['data-gg-focus'] === 'library:3')!;
        expect(cover.props.className).toBe('gg-library-cover');
        expect(cover.props.onOKActionDescription).toBe('Game page');
        cover.props.onClick();
        expect(onOpen).toHaveBeenCalledWith(games[2]);
        cover.props.onSecondaryButton();
        expect(onSort).toHaveBeenCalled();
        expect(cover.props.onSecondaryActionDescription).toBe('Sort');
    });
    it('a cover without art shows the game\'s name', () => {
        const cover = tree(LibraryPageView(props())).find(e => e.props['data-gg-focus'] === 'library:5')!;
        expect(text(cover)).toContain('Game 5');
    });
    it('marks soft hero art', () => {
        const soft = tree(LibraryPageView(props({ hero: () => ({ urls: ['cap.jpg'], soft: true }) }))).some(e => String(e.props.className).includes('gg-library-hero-soft'));
        expect(soft).toBe(true);
    });
    it('the Collections tab shows collection tiles that open their tab', () => {
        const onTab = vi.fn();
        const out = tree(LibraryPageView(props({ tab: 'collections', games: [], settled: null, glance: null, onTab, collectionTiles: [{ key: 'col:abc', name: 'Horror', count: 20 }] })));
        const tile = out.find(e => e.props['data-gg-focus'] === 'library:col:abc')!;
        expect(text(tile)).toContain('Horror');
        expect(text(tile)).toContain('20 games');
        tile.props.onClick();
        expect(onTab).toHaveBeenCalledWith('col:abc');
    });
    it('mounts only rows near the focus', () => {
        expect(GRID.cols).toBe(13);
        expect(visibleRows(0, 530)).toEqual({ first: 0, last: 4 });
        expect(visibleRows(13 * 20, 530)).toEqual({ first: 17, last: 24 });
        expect(visibleRows(529, 530)).toEqual({ first: 37, last: 40 });
        expect(visibleRows(0, 0)).toEqual({ first: 0, last: -1 });
    });
});
