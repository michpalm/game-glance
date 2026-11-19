import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
import { spaceWarmList } from '../../src/library/LibraryPage';
import { libraryStyles } from '../../src/library/libraryStyles';
import type { LibGame } from '../../src/library/libraryModel';

const game = (appId: number, installed = false, shortcut = false): LibGame => ({ appId, name: `G${appId}`, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed, shortcut });

describe('Required space is fetched ahead for the whole tab', () => {
    it('lists the tab\'s uninstalled Steam games, nearest the highlight first', () => {
        const games = [game(1), game(2, true), game(3), game(4, false, true), game(5)];
        expect(spaceWarmList(games)).toEqual([1, 3, 5]); // in the warm order given
    });
});

describe('facts read on bright or busy art', () => {
    it('a stronger shade and a wider, darker halo behind the text', () => {
        const shade = /\.gg-library-hero-shade\{[^}]*\}/.exec(libraryStyles)![0];
        expect(shade).toContain('rgba(5,7,10,.78)');
        expect(libraryStyles).toMatch(/\.gg-library-glance\{[^}]*0 0 calc\(var\(--gg-d,1px\) \* 22\) rgba\(0,0,0,\.8\)/);
    });
});
