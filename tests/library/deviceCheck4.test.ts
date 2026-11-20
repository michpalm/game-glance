import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { logoLuma, measureLogo } from '../../src/home/logo';
import { CoverImg, LibraryLogo, LibraryPageView, logoClass, type LibraryViewProps } from '../../src/library/LibraryPage';
import { libraryStyles } from '../../src/library/libraryStyles';
import { pageKitStyles } from '../../src/pageKit/pageKitStyles';
import { shoulderTab } from '../../src/pageKit/PageKit';
import type { LibGame } from '../../src/library/libraryModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (element.type === CoverImg || element.type === LibraryLogo) return [element];
    if (typeof element.type === 'function') return [element, ...tree((element.type as (p: unknown) => ReactNode)(element.props))];
    return [element, ...tree(element.props.children)];
}
const text = (node: ReactNode) => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string')).join('|');
const game = (appId: number): LibGame => ({ appId, name: `G${appId}`, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false });
const props = (extra: Partial<LibraryViewProps> = {}): LibraryViewProps => ({
    tabs: [{ key: 'all', label: 'A', count: 1 }, { key: 'collections', label: 'Collections', count: null }], tab: 'all', games: [game(1)], focusIndex: 0, settled: game(1), glance: null,
    collectionTiles: [], sortLabel: 'Last played', hero: () => ({ urls: [], soft: false }), cover: () => [],
    onTab: () => {}, onFocus: () => {}, onOpen: () => {}, onSort: () => {}, onOptions: () => {}, onBack: () => {}, onGameMenu: () => {}, ...extra,
});
const px = (r: number, g: number, b: number, a: number, n: number) => Array.from({ length: n }, () => [r, g, b, a]).flat();

describe('logos are drawn the way Home draws them: cropped and sized by area', () => {
    it('the highlighted game\'s logo is a LibraryLogo for that game', () => {
        const logo = tree(LibraryPageView(props())).find(e => e.type === LibraryLogo)!;
        expect(logo.props.appId).toBe(1);
        expect(logo.props.name).toBe('G1');
    });
});

describe('dark logos get a light lift', () => {
    it('measures how bright a logo\'s visible pixels are', () => {
        expect(logoLuma(px(0, 0, 0, 255, 4), 2, 2)).toBeCloseTo(0);
        expect(logoLuma(px(255, 255, 255, 255, 4), 2, 2)).toBeCloseTo(1);
        expect(logoLuma([...px(255, 255, 255, 255, 1), ...px(0, 0, 0, 0, 3)], 2, 2)).toBeCloseTo(1);
        expect(logoLuma(px(0, 0, 0, 0, 4), 2, 2)).toBeNull();
    });
    it('measureLogo reports it', async () => {
        const seen = await measureLogo('x.png', { width: 2, height: 2 }, async () => px(20, 10, 10, 255, 4));
        expect(seen.luma).toBeLessThan(.1);
    });
    it('a dark logo gets the lifted class, a light or unmeasured one does not', () => {
        expect(logoClass(.12)).toBe('gg-library-logo gg-library-logo-dark');
        expect(logoClass(.7)).toBe('gg-library-logo');
        expect(logoClass(undefined)).toBe('gg-library-logo');
        expect(libraryStyles).toMatch(/\.gg-library-logo-dark\{[^}]*drop-shadow\(0 0 .*rgba\(255,255,255/);
    });
});

describe('facts stay readable on bright art', () => {
    it('the glance text has a soft dark halo and brighter labels', () => {
        expect(libraryStyles).toMatch(/\.gg-library-glance\{[^}]*text-shadow:[^}]*0 0 /);
        expect(libraryStyles).toMatch(/\.gg-library-glance \.gg-pk-fact-label\{[^}]*rgba\(255,255,255,\.8/);
    });
});

describe('tabs', () => {
    it('L1 and R1 wrap around at the ends', () => {
        expect(shoulderTab(['a', 'b', 'c'], 'c', 6)).toBe('a');
        expect(shoulderTab(['a', 'b', 'c'], 'a', 5)).toBe('c');
        expect(shoulderTab(['a', 'b', 'c'], 'a', 6)).toBe('b');
    });
    it('the sort stays shown on the Collections tab', () => expect(text(LibraryPageView(props({ tab: 'collections', settled: null })))).toContain('Last played'));
    it('the tab row measures its tabs from itself, so the first tab scrolls fully back into view', () =>
        expect(pageKitStyles).toMatch(/\.gg-pk-tabs-list\{[^}]*position:relative/));
});
