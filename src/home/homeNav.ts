import { Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { browserStores, capsuleUrls, heroUrls, landscapeUrls } from './artwork';
import { markLeaving } from './homeMemory';
import { cssLayers, openArtLayers, wideArt } from './homeView';
import { mountOpenOverlay } from './OpenOverlay';
import { createOpenTransition, DOMRectLike, OpenTransition } from './openTransition';

/** Opens a game's page directly, without the transition (Play pill fallbacks, Steam call fallbacks). */
export function openPage(appId: number) {
    markLeaving();
    try {
        Navigation.Navigate(`/library/app/${appId}`);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open the game page`, error);
    }
}

const validAppId = (appId: number) => Number.isInteger(appId) && appId > 0;

/** The url the Library's own "Store Page" button opens (probed on the Ally: `Navigator.SteamWeb('steam://store/' + appid)`). */
export function storeSteamUrl(appId: number): string | null {
    return validAppId(appId) ? `steam://store/${appId}` : null;
}

/** The game's store page on the web (fallback). */
export function storeWebUrl(appId: number): string | null {
    return validAppId(appId) ? `https://store.steampowered.com/app/${appId}/` : null;
}

/** One news event on the store's news pages (fallback). Event gids are decimal strings. */
export function newsWebUrl(appId: number, gid: string): string | null {
    return validAppId(appId) && /^\d+$/.test(gid) ? `https://store.steampowered.com/news/app/${appId}/view/${gid}` : null;
}

/** Opens a web page in Steam's external web view; guarded. */
function openExternal(url: string | null, what: string) {
    if (!url) return;
    try {
        Navigation.NavigateToExternalWeb(url);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open the ${what}`, error);
    }
}

/**
 * Opens a game's store page in the client, as the Library's "Store Page" button does (SteamWeb with the
 * steam://store url); the web store page if that throws. No open transition.
 */
export function openStorePage(appId: number) {
    const url = storeSteamUrl(appId);
    if (!url) return;
    markLeaving();
    try {
        Navigation.NavigateToSteamWeb(url);
        return;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open the store page in Steam`, error);
    }
    openExternal(storeWebUrl(appId), 'store page');
}

type SteamNavGlobals = {
    SteamUIStore?: { GetFocusedWindowInstance?(): { Navigator?: { App?(appId: number, options: { gidPartnerEvent: string }): void } } | null | undefined };
    appStore?: { GetAppOverviewByAppID?(appId: number): unknown };
};

/**
 * Opens one news event the way Game Mode's own What's New and game pages do (probed on the Ally): the window's
 * `Navigator.App(appid, { gidPartnerEvent: gid })`, which shows the event over the game's page. The tracking
 * call those handlers also make (TrackEventClickedByUser) is deliberately not made. Steam's App() silently does
 * nothing for a game without an app overview, so then (or without the navigator, or if it throws) the event's
 * store news page opens on the web. No gid: the game's page. No open transition.
 */
export function openNews(appId: number, gid: string) {
    markLeaving();
    if (!/^\d+$/.test(gid)) {
        openPage(appId);
        return;
    }
    try {
        const steam = globalThis as unknown as SteamNavGlobals;
        const navigator = steam.SteamUIStore?.GetFocusedWindowInstance?.()?.Navigator;
        if (typeof navigator?.App === 'function' && steam.appStore?.GetAppOverviewByAppID?.(appId)) {
            navigator.App(appId, { gidPartnerEvent: gid });
            return;
        }
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open the event in Steam`, error);
    }
    openExternal(newsWebUrl(appId, gid), 'news page');
}

/** Opens Steam's Library: its own library-tab call when present, else the /library route. */
export function openLibrary() {
    try {
        if (typeof Navigation.NavigateToLibraryTab === 'function') Navigation.NavigateToLibraryTab();
        else Navigation.Navigate('/library');
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open the library`, error);
    }
}

/**
 * Moves gamepad focus to a Home element (the handoff's "focus item 0 via a ref"): the one mechanism used by the
 * restore, the Library card hand-off and every B step (tabs -> the Play pill, feed -> tabs), so there is a single fix point.
 * Assumes Steam's gamepad focus follows DOM focus; warns when the element did not take it (device diagnostic).
 */
export function focusElement(el: HTMLElement | null | undefined, what: string) {
    try {
        if (!el) return;
        el.focus({ preventScroll: true });
        if (el.ownerDocument?.activeElement !== el) console.warn(`${LOG_PREFIX} Home: ${what} did not take focus`);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not focus ${what}`, error);
    }
}

/**
 * focusElement now and once more on the next frame, unless the element holds focus by then: Steam may apply a
 * preferred focus after Home mounts, which would otherwise win over a restore.
 */
export function focusElementSettled(el: HTMLElement | null | undefined, what: string) {
    focusElement(el, what);
    try {
        const view = el?.ownerDocument?.defaultView;
        view?.requestAnimationFrame(() => {
            try {
                if (el && el.isConnected && !el.contains(el.ownerDocument.activeElement)) focusElement(el, what);
            } catch {
                // element gone
            }
        });
    } catch {
        // no frame callback; the first attempt stands
    }
}

function urls(read: () => string[]): string[] {
    try {
        return read();
    } catch {
        return [];
    }
}

/** A game's clone art: the expanded recents card's wide layers, then its capsule (homeView.openArtLayers). */
export function gameOpenArt(appId: number): string[] {
    const cover = urls(() => capsuleUrls(appId, browserStores));
    const wide = wideArt(urls(() => landscapeUrls(appId, browserStores)), urls(() => heroUrls(appId, browserStores)), cover);
    return openArtLayers(wide, cover);
}

/** Home's root for the open being started; read synchronously by `mount` inside `open`. */
let leavingHome: HTMLElement | null = null;
/** One controller for the session: it must outlive Home, which Steam unmounts once the game page opens. */
let transition: OpenTransition | null = null;

function controller(): OpenTransition {
    transition ??= createOpenTransition({
        navigate: (path) => Navigation.Navigate(path),
        mount: (rect, art) => {
            if (!leavingHome) throw new Error('no Home root');
            return mountOpenOverlay(leavingHome, rect, art);
        },
        setTimer: (fn, ms) => setTimeout(fn, ms),
        clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        warn: (message, error) => console.warn(`${LOG_PREFIX} Home: ${message}`, error),
    });
    return transition;
}

/**
 * Opens a game's page with the open-to-details transition, expanding from `source` (the pressed feed card, or the
 * selected capsule for the info button) with `art` (urls, stacked). The single entry point for every A
 * that opens a game from Home. Anything wrong with the overlay (no source, a 0-size rect, no Home root, a
 * throwing mount) still opens the page, without motion; a press while a transition runs is ignored.
 */
export function openGame(appId: number, source: HTMLElement | null | undefined, art: string[]) {
    markLeaving();
    let rect: DOMRectLike | null = null;
    try {
        leavingHome = (source?.closest?.('.gh-root') as HTMLElement | null) ?? null;
        if (source && leavingHome) {
            const r = source.getBoundingClientRect();
            rect = { left: r.left, top: r.top, width: r.width, height: r.height };
        }
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not measure the open source`, error);
        rect = null;
    }
    try {
        // A null rect makes the controller open the page at once, still respecting a transition already running.
        controller().open(appId, rect, cssLayers(art));
    } catch (error) {
        // Not reached in practice (the controller never throws); the page must open regardless.
        console.warn(`${LOG_PREFIX} Home: open transition failed`, error);
        openPage(appId);
    } finally {
        leavingHome = null;
    }
}

/** Drops a running transition: removes the overlay, restores Home, cancels the pending navigation. */
export function cancelOpen() {
    try {
        transition?.cancel();
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not cancel the open transition`, error);
    }
}

type UrlApis = { WebChat?: { OpenURLInClient?(url: string, pid: number, external: boolean): void }; URL?: { ExecuteSteamURL?(url: string): void } };

/**
 * Opens a steam:// url the way Steam's own friends menu does (its link opener: SteamClient.WebChat.OpenURLInClient
 * when the client has it, else the url itself), here for Join Game. Falls back to SteamClient.URL.ExecuteSteamURL.
 * Logs and does nothing when neither exists.
 */
export function openSteamUrl(url: string) {
    try {
        const client = (globalThis as { SteamClient?: UrlApis }).SteamClient;
        if (typeof client?.WebChat?.OpenURLInClient === 'function') return client.WebChat.OpenURLInClient(url, 0, false);
        if (typeof client?.URL?.ExecuteSteamURL === 'function') return client.URL.ExecuteSteamURL(url);
        console.warn(`${LOG_PREFIX} Home: no way to open ${url}`);
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open ${url}`, error);
    }
}
