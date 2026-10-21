import { Navigation } from '@decky/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelOpen, focusElement, newsWebUrl, openGame, openNews, openStorePage, storeSteamUrl, storeWebUrl } from '../../src/home/homeNav';
import { playNavSound } from '../../src/home/navSound';

vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));

const nav = vi.mocked(Navigation);

beforeEach(() => {
    vi.clearAllMocks();
});
afterEach(() => {
    vi.unstubAllGlobals();
});

describe('store and news urls', () => {
    it('storeSteamUrl is the steam://store url the Library\'s Store Page button opens', () => {
        expect(storeSteamUrl(1245620)).toBe('steam://store/1245620');
    });
    it('storeWebUrl is the store page on the web', () => {
        expect(storeWebUrl(1245620)).toBe('https://store.steampowered.com/app/1245620/');
    });
    it('newsWebUrl is the store news view of one event', () => {
        expect(newsWebUrl(570, '5123456789012345678')).toBe('https://store.steampowered.com/news/app/570/view/5123456789012345678');
    });
    it('rejects a broken app id or gid', () => {
        for (const id of [0, -1, 1.5, NaN, Infinity]) {
            expect(storeSteamUrl(id)).toBeNull();
            expect(storeWebUrl(id)).toBeNull();
            expect(newsWebUrl(id, '1')).toBeNull();
        }
        for (const gid of ['', 'abc', '12/34', '1 2']) expect(newsWebUrl(570, gid)).toBeNull();
    });
});

describe('openStorePage', () => {
    it('opens the in-client store page through Steam\'s SteamWeb navigation', () => {
        openStorePage(42);
        expect(nav.NavigateToSteamWeb).toHaveBeenCalledWith('steam://store/42');
        expect(nav.NavigateToExternalWeb).not.toHaveBeenCalled();
        expect(nav.Navigate).not.toHaveBeenCalled();
    });
    it('falls back to the web store page when SteamWeb navigation throws', () => {
        nav.NavigateToSteamWeb.mockImplementationOnce(() => {
            throw new Error('no window');
        });
        openStorePage(42);
        expect(nav.NavigateToExternalWeb).toHaveBeenCalledWith('https://store.steampowered.com/app/42/');
    });
    it('does nothing for a broken app id and never throws', () => {
        expect(() => openStorePage(0)).not.toThrow();
        expect(nav.NavigateToSteamWeb).not.toHaveBeenCalled();
        nav.NavigateToSteamWeb.mockImplementationOnce(() => {
            throw new Error('x');
        });
        nav.NavigateToExternalWeb.mockImplementationOnce(() => {
            throw new Error('y');
        });
        expect(() => openStorePage(42)).not.toThrow();
    });
});

describe('openNews', () => {
    const app = vi.fn();
    const steamUi = (overview: unknown) => {
        vi.stubGlobal('SteamUIStore', { GetFocusedWindowInstance: () => ({ Navigator: { App: app } }) });
        vi.stubGlobal('appStore', { GetAppOverviewByAppID: () => overview });
    };
    beforeEach(() => app.mockReset());

    it('opens just the article in the external web view, never the game page under it (Navigator.App)', () => {
        steamUi({ appid: 570 });
        openNews(570, '123');
        expect(nav.NavigateToExternalWeb).toHaveBeenCalledWith('https://store.steampowered.com/news/app/570/view/123');
        expect(app).not.toHaveBeenCalled();
    });
    it('opens the same article when the game is not in the library', () => {
        steamUi(undefined);
        openNews(570, '123');
        expect(app).not.toHaveBeenCalled();
        expect(nav.NavigateToExternalWeb).toHaveBeenCalledWith('https://store.steampowered.com/news/app/570/view/123');
    });
    it('opens the game page when the event has no gid, or one that is not a number', () => {
        steamUi({ appid: 570 });
        openNews(570, '');
        openNews(570, 'abc');
        expect(app).not.toHaveBeenCalled();
        expect(nav.NavigateToExternalWeb).not.toHaveBeenCalled();
        expect(nav.Navigate).toHaveBeenCalledTimes(2);
        expect(nav.Navigate).toHaveBeenCalledWith('/library/app/570');
    });
});

describe('focusElement', () => {
    // A stand-in element: focus() sets the document's focus; Steam's own focus shows as the gpfocus class.
    const element = (steamFollows: boolean) => {
        const doc: { activeElement: unknown } = { activeElement: null };
        const classes = new Set<string>();
        const el = {
            ownerDocument: doc,
            classList: { contains: (c: string) => classes.has(c) },
            focus: vi.fn(() => {
                doc.activeElement = el;
                if (steamFollows) classes.add('gpfocus');
            }),
        };
        return el as unknown as HTMLElement & { focus: ReturnType<typeof vi.fn> };
    };
    it('focuses the element; when Steam\'s gamepad focus follows, nothing more', () => {
        const el = element(true);
        const steam = vi.fn(() => true);
        focusElement(el, 'test', steam);
        expect(el.focus).toHaveBeenCalled();
        expect(steam).not.toHaveBeenCalled();
    });
    it('when Steam\'s gamepad focus did not follow (its window has no system focus), hands it over directly', () => {
        const el = element(false);
        const steam = vi.fn(() => true);
        focusElement(el, 'test', steam);
        expect(steam).toHaveBeenCalledWith(el);
    });
    it('does nothing for no element', () => {
        const steam = vi.fn(() => true);
        focusElement(null, 'test', steam);
        expect(steam).not.toHaveBeenCalled();
    });
});

describe('openGame', () => {
    // A Home root just real enough for the open's fade: openGame measures nothing off it for a plain fade.
    const home = () => {
        const doc = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        const root = {
            ownerDocument: doc,
            style: { setProperty: vi.fn(), removeProperty: vi.fn() },
            setAttribute: vi.fn(),
            removeAttribute: vi.fn(),
            hasAttribute: () => false,
            querySelector: () => null,
        };
        return { closest: () => root } as unknown as HTMLElement;
    };
    const intoGame = () => vi.mocked(playNavSound).mock.calls.filter(([name]) => name === 'IntoGameDetail').length;
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        cancelOpen();
        vi.useRealTimers();
    });

    it('a second A while the first open runs plays the sound once in total', () => {
        const source = home();
        openGame(620, source);
        openGame(620, source);
        expect(intoGame()).toBe(1);
    });
    it('A after B cancelled the open opens again, with its sound', () => {
        const source = home();
        openGame(620, source);
        cancelOpen();
        openGame(620, source);
        expect(intoGame()).toBe(2);
    });
});
