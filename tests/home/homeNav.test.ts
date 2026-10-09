import { Navigation } from '@decky/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { focusElement, newsWebUrl, openNews, openStorePage, storeSteamUrl, storeWebUrl } from '../../src/home/homeNav';

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

    it('opens the event on the game page as Game Mode does (Navigator.App with gidPartnerEvent), with no tracking call', () => {
        steamUi({ appid: 570 });
        openNews(570, '123');
        expect(app).toHaveBeenCalledWith(570, { gidPartnerEvent: '123' });
        expect(nav.NavigateToExternalWeb).not.toHaveBeenCalled();
    });
    it('falls back to the store news page when the game is not in the library', () => {
        steamUi(undefined);
        openNews(570, '123');
        expect(app).not.toHaveBeenCalled();
        expect(nav.NavigateToExternalWeb).toHaveBeenCalledWith('https://store.steampowered.com/news/app/570/view/123');
    });
    it('falls back to the store news page without Steam\'s navigator, or when it throws', () => {
        openNews(570, '123');
        expect(nav.NavigateToExternalWeb).toHaveBeenCalledWith('https://store.steampowered.com/news/app/570/view/123');
        steamUi({ appid: 570 });
        app.mockImplementationOnce(() => {
            throw new Error('nope');
        });
        nav.NavigateToExternalWeb.mockClear();
        expect(() => openNews(570, '123')).not.toThrow();
        expect(nav.NavigateToExternalWeb).toHaveBeenCalledWith('https://store.steampowered.com/news/app/570/view/123');
    });
    it('opens the game page when the event has no gid', () => {
        steamUi({ appid: 570 });
        openNews(570, '');
        expect(app).not.toHaveBeenCalled();
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
