import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, Menu: 'div', MenuItem: 'div' }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { PageFrame, shoulderHandler } from '../../src/pageKit/PageKit';
import { CoverImg, LibraryLogo, LibraryPageView, type LibraryViewProps } from '../../src/library/LibraryPage';
import { ensureNativeReset, libraryProtonWanted } from '../../src/library/libraryGate';
import { initialTab, libraryMemory, restoreFocus } from '../../src/library/libraryState';
import { warmSteps } from '../../src/home/useWarmup';
import type { LibGame } from '../../src/library/libraryModel';

const first = (node: ReactNode): ReactElement<Record<string, any>> => {
    let el = node as ReactElement<Record<string, any>>;
    while (typeof el.type === 'function' && el.type !== CoverImg && el.type !== LibraryLogo) el = (el.type as (p: unknown) => ReactElement<Record<string, any>>)(el.props);
    return el;
};
const pad = (button: number) => ({ detail: { button }, preventDefault: vi.fn(), stopPropagation: vi.fn() });
const game = (appId: number): LibGame => ({ appId, name: `G${appId}`, playedMin: 0, lastPlayed: 0, sizeBytes: 0, installed: false, shortcut: false });

describe('review fix 1: L1/R1 work from anywhere on the page', () => {
    it('shoulderHandler moves the tab and takes the press', () => {
        const onChange = vi.fn(), evt = pad(6);
        shoulderHandler(['a', 'b'], 'a', onChange)(evt);
        expect(onChange).toHaveBeenCalledWith('b');
        expect(evt.preventDefault).toHaveBeenCalled();
    });
    it('the Library page\'s root handles the shoulders, so a focused cover still switches tabs', () => {
        const onTab = vi.fn();
        const props: LibraryViewProps = { tabs: [{ key: 'recent', label: 'R', count: null }, { key: 'all', label: 'A', count: 1 }], tab: 'recent', games: [game(1)], focusIndex: 0,
            settled: null, glance: null, collectionTiles: [], hero: () => ({ urls: [], soft: false }), cover: () => [],
            onTab, onFocus: () => {}, onOpen: () => {}, onSort: () => {}, onOptions: () => {}, onBack: () => {} };
        first(LibraryPageView(props)).props.onButtonDown(pad(6));
        expect(onTab).toHaveBeenCalledWith('all');
    });
});

describe('review fix 2: Options is Y', () => {
    it('PageFrame binds options to the Y (options) button, not the menu button', () => {
        const onOptions = vi.fn();
        const root = first(PageFrame({ className: 'x', title: 't', onBack: () => {}, onOptions, children: null }));
        expect(root.props.onOptionsButton).toBe(onOptions);
        expect(root.props.onOptionsActionDescription).toBe('Options');
        expect(root.props.onMenuButton).toBeUndefined();
    });
});

describe('review fix 3: B from a game page returns to the tab you left', () => {
    it('the same entry path brings back the remembered tab', () => expect(initialTab('all', { ...libraryMemory.get(), tab: 'installed', entry: 'all' })).toBe('installed'));
    it('a different entry path opens its own tab', () => expect(initialTab('all', { ...libraryMemory.get(), tab: 'installed', entry: 'recent' })).toBe('all'));
    it('/library alone opens the remembered tab', () => expect(initialTab(null, { ...libraryMemory.get(), tab: 'installed', entry: null })).toBe('installed'));
});

describe('review fix 4: ProtonDB only when it is in a Game info slot', () => {
    it('follows the Game info slots', () => {
        expect(libraryProtonWanted({ stats: ['played', 'achievements', null], featured: 'hltb' })).toBe(false);
        expect(libraryProtonWanted({ stats: ['played', 'protondb', null], featured: 'hltb' })).toBe(true);
    });
});

describe('review fix 5: the Library warms only what it shows', () => {
    it('Home warms everything its settings ask for', () => expect(warmSteps(undefined, { playerCountPill: true, cleanPage: false, homeRowStyle: 'steam' })).toEqual({ pills: true, cardArt: true, descriptions: true, players: true }));
    it('the Library asks for none of the extras', () => expect(warmSteps({ pills: false, cardArt: false, descriptions: false, players: false }, { playerCountPill: true, cleanPage: false, homeRowStyle: 'steam' }))
        .toEqual({ pills: false, cardArt: false, descriptions: false, players: false }));
    it('settings still turn steps off for Home', () => expect(warmSteps(undefined, { playerCountPill: false, cleanPage: true, homeRowStyle: 'minimal' })).toEqual({ pills: true, cardArt: false, descriptions: false, players: false }));
});

describe('review fix 6: a cover that is gone falls back to where it was', () => {
    it('uses the remembered index', () => {
        const games = [game(1), game(2), game(3)];
        expect(restoreFocus(games, { ...libraryMemory.get(), focus: { installed: 9 }, index: { installed: 2 } }, 'installed')).toBe(2);
        expect(restoreFocus(games, { ...libraryMemory.get(), focus: { installed: 2 }, index: { installed: 0 } }, 'installed')).toBe(1);
    });
});

describe('review fix 10: Steam\'s library resets even when Steam\'s history appeared late', () => {
    it('subscribes once history exists, once only, and resets on leaving', () => {
        let listener: (() => void) | null = null;
        const history = { location: { pathname: '/library' }, listen: vi.fn((fn: () => void) => { listener = fn; return () => {}; }) };
        let available = false;
        const get = () => (available ? history : undefined);
        expect(ensureNativeReset(get)).toBe(false);
        available = true;
        expect(ensureNativeReset(get)).toBe(true);
        expect(ensureNativeReset(get)).toBe(true);
        expect(history.listen).toHaveBeenCalledTimes(1);
        libraryMemory.set({ native: true });
        history.location.pathname = '/library/app/5';
        listener!();
        expect(libraryMemory.get().native).toBe(true);
        history.location.pathname = '/library/home';
        listener!();
        expect(libraryMemory.get().native).toBe(false);
        libraryMemory.reset();
    });
});
