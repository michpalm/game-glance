import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { CoverImg, LibraryLogo, LibraryPageView, protonWarmList, type LibraryViewProps } from '../../src/library/LibraryPage';
import { ProtonMark } from '../../src/home/ProtonMark';
import { libraryStyles } from '../../src/library/libraryStyles';
import type { LibGame } from '../../src/library/libraryModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (element.type === CoverImg || element.type === LibraryLogo || element.type === ProtonMark) return [element];
    if (typeof element.type === 'function') return [element, ...tree((element.type as (p: unknown) => ReactNode)(element.props))];
    return [element, ...tree(element.props.children)];
}
const game = (appId: number, shortcut = false): LibGame => ({ appId, name: `G${appId}`, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut });
const props = (extra: Partial<LibraryViewProps> = {}): LibraryViewProps => ({
    tabs: [{ key: 'all', label: 'A', count: 1 }], tab: 'all', games: [game(1)], focusIndex: 0, settled: game(1),
    glance: { progress: [], facts: [{ label: 'ProtonDB', value: 'Gold', tone: 'gold' }, { label: 'Played', value: '1 h' }], collections: [] },
    collectionTiles: [], sortLabel: 'Last played', hero: () => ({ urls: [], soft: false }), cover: () => [],
    onTab: () => {}, onFocus: () => {}, onOpen: () => {}, onSort: () => {}, onOptions: () => {}, onBack: () => {}, onGameMenu: () => {}, ...extra,
});

describe('ProtonDB\'s mark beside its rating', () => {
    it('draws ProtonDB\'s logo in the rating\'s colour, only on that fact', () => {
        const out = tree(LibraryPageView(props()));
        expect(out.filter(e => e.type === ProtonMark)).toHaveLength(1);
        expect(out.some(e => e.props['data-tone'] === 'gold')).toBe(true);
        expect(libraryStyles).toMatch(/\[data-tone="gold"\][^{]*\{[^}]*color:#cfb53b/);
    });
});

describe('ProtonDB warms ahead for the whole tab', () => {
    it('Steam games of the tab, nearest the highlight first', () => {
        const games = [game(1), game(2), game(3, true), game(4), game(5)];
        expect(protonWarmList(games)).toEqual([1, 2, 4, 5]); // in the warm order given, shortcuts left out
    });
    it('an empty tab gives nothing', () => expect(protonWarmList([])).toEqual([]));
});
