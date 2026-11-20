import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
// The selected game's full art is shown and the restyled page is on: openGame picks the morph.
vi.mock('../../src/home/HeroBackground', () => ({ heroArtFor: () => ({ mode: 'full', url: 'https://art/620.jpg' }), heroShownApp: () => 620 }));
vi.mock('../../src/home/mode', () => ({ homeMode: () => ({ gamePage: true, home: true, restyleDetails: true, cleanDetails: false }) }));
vi.mock('../../src/home/returnGlide', () => ({ endReturnGlide: vi.fn(), startReturnGlide: vi.fn(), returnGlideRunning: () => false }));

import { cancelOpen, openGame, openLibrary, openNews, openPage, openStorePage } from '../../src/home/homeNav';
import { clearReturn, noteMorphOpen, peekReturn } from '../../src/home/returnNote';
import { endReturnGlide } from '../../src/home/returnGlide';

const V = { width: 1920, height: 1080 };

const home = () => {
    const doc = { addEventListener: vi.fn(), removeEventListener: vi.fn(), defaultView: { innerWidth: 1920, innerHeight: 1080 } };
    const root = {
        ownerDocument: doc,
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        hasAttribute: () => false,
        querySelector: () => null,
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    };
    return { closest: () => root, ownerDocument: doc } as unknown as HTMLElement;
};

describe('the way back note, from Home navigation', () => {
    beforeEach(() => { vi.useFakeTimers(); clearReturn(); vi.mocked(endReturnGlide).mockClear(); });
    afterEach(() => { cancelOpen(); vi.useRealTimers(); });

    it('a morph open notes its game, look and viewport', () => {
        openGame(620, home());
        expect(peekReturn(620, 'actions')).toBe('spotlight');
    });

    it('ends a running glide before the open starts', () => {
        openGame(620, home());
        expect(endReturnGlide).toHaveBeenCalled();
    });

    it('a cancelled open drops the note', () => {
        openGame(620, home());
        cancelOpen();
        expect(peekReturn(620, 'actions')).toBeNull();
    });

    it.each([
        ['the store page', () => openStorePage(42)],
        ['a news page', () => openNews(42, '123')],
        ['the Library', () => openLibrary()],
        ['a page without the transition', () => openPage(42)],
    ])('opening %s clears the note', (_name, go) => {
        noteMorphOpen(620, 'spotlight', V);
        go();
        expect(peekReturn(620, 'actions')).toBeNull();
    });
});
