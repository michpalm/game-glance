import { Navigation } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { browserStores, heroUrls } from './artwork';
import { markLeaving } from './homeMemory';
import { playNavSound } from './navSound';
import { listenOpenCancel, showCancelReturn } from './openCancel';
import { takeSteamFocus } from './steamFocus';
import { createOpenTransition, OpenTransition } from './openTransition';
import { applyOpening, canvasMeasure, lineMeasure, extrasFlags, missingStats, OpenVariant, openVariant, pageStatsFromChips, readChipTexts, readExtrasAsked, readExtrasSize, readTwinTexts, measureHome, settleTwins, viewportSize } from './openHome';
import { TwinSpec, twinSpecs } from './openTwins';
import { openMotion } from './openMotion';
import { pageTargets, PageLook } from './openTargets';
import { mountOpenBridge } from './openBridge';
import { heroArtFor, heroShownApp } from './HeroBackground';
import { homeMode } from './mode';
import { settings } from '../data/settings';
import { clearOpen, markOpen, onOpenReady, OpenIntent } from '../data/openIntent';
import { pageArrivalSelectors, pageTwinTargets, steamEnterOffCss, steamFooter } from '../styles/theme';
import { MOUSE_ATTR } from './mouseMode';
import { clearSteamBarCover } from './useHideSteamBar';

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
 * Steam's gamepad focus normally follows DOM focus; when it does not (Steam's window without system focus), the
 * element's own navigation node takes it (steamFocus). Warns when the element did not take DOM focus (device diagnostic).
 */
export function focusElement(el: HTMLElement | null | undefined, what: string, steamFocus: (el: HTMLElement) => boolean = takeSteamFocus) {
    try {
        if (!el) return;
        el.focus({ preventScroll: true });
        if (el.ownerDocument?.activeElement !== el) console.warn(`${LOG_PREFIX} Home: ${what} did not take focus`);
        // Steam's gamepad focus (what the controller drives) did not follow: its window has no system focus. Hand it over
        // directly, as Steam's own D-pad does (steamFocus).
        if (!el.classList?.contains('gpfocus')) steamFocus(el);
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

/** The open being started (set by openGame); the controller's hooks take a copy when Home starts moving. */
/** `extras`: the page's parts Home draws as it turns into the page (openHome.extrasParts words; '' for none). */
interface OpenContext { root: HTMLElement | null; appId: number; variant: OpenVariant; look: PageLook; intent: OpenIntent; heroUrl: string | null; extras: string }
let next: OpenContext | null = null;
let active: OpenContext | null = null;
/** One controller for the session: it must outlive Home, which Steam unmounts once the game page opens. */
let transition: OpenTransition | null = null;

/** Puts Home in its opening state for `c` (morph: measured and aimed at the page's layout; else a fade). */
function startHome(c: OpenContext): (() => void) | null {
    const root = c.root;
    if (!root) return null;
    if (c.variant === 'morph') {
        try {
            const home = measureHome(root);
            const canvasEl = root.querySelector('.gh-canvas') as HTMLElement | null;
            const win = root.ownerDocument?.defaultView;
            const scale = home && canvasEl && canvasEl.offsetWidth > 0 ? home.canvas.w / canvasEl.offsetWidth : 0;
            const screen = win ? viewportSize(win) : { width: 0, height: 0 };
            if (home && scale > 0 && screen.width > 0 && screen.height > 0) {
                // A Unifideck game's size column Home drew: the page has it right after Played, so the columns land where the page puts them.
                const size = c.extras.split(' ').includes('size') ? readExtrasSize(root) : null;
                const stats = pageStatsFromChips(readChipTexts(root), c.look, size);
                const store = home.store ?? { x: 0, y: 0, w: 0, h: 0 };
                const page = pageTargets(c.look, screen, stats, canvasMeasure(root), { w: store.w, h: store.h }, c.extras ? readExtrasAsked(root) : undefined, lineMeasure(root));
                const focused = !root.ownerDocument?.documentElement?.hasAttribute(MOUSE_ATTR);
                // The moving text as page-sized twins (openTwins); without them (any failure) Home's own text morphs as before.
                let twins: TwinSpec[] = [];
                try {
                    twins = twinSpecs(home, page, readTwinTexts(root), stats, c.look, focused, scale);
                } catch (error) {
                    console.warn(`${LOG_PREFIX} Home: could not set up the text twins`, error);
                }
                return applyOpening(root, 'morph', openMotion(home, page, c.look, scale, focused), null, c.extras, twins);
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: could not set up the morph`, error);
        }
        // Home could not be measured: the page still gets a calm fade, and arrives whole.
        c.intent = { ...c.intent, mode: 'all', homeDesc: undefined, homeHltb: undefined };
        return applyOpening(root, 'fade', [], null);
    }
    return applyOpening(root, c.variant, [], c.variant === 'heroFade' ? c.heroUrl : null);
}

/** Calls `cb` when the opened page is ready: the Game Glance page reports it (openIntent); Steam's own page is ready when its hero has loaded. */
function whenReady(c: OpenContext, cb: () => void): () => void {
    if (c.intent.look !== 'steam') return onOpenReady((id) => id === c.appId && cb());
    const doc = c.root?.ownerDocument;
    const img = pageArrivalSelectors().headerImg;
    const timer = setInterval(() => {
        try {
            const el = img ? (doc?.querySelector(img) as HTMLImageElement | null) : null;
            if (el?.complete && el.naturalWidth > 0) cb();
        } catch {
            // the transition's cap reveals the page anyway
        }
    }, 16);
    return () => clearInterval(timer);
}

function controller(): OpenTransition {
    transition ??= createOpenTransition({
        navigate: (path) => Navigation.Navigate(path),
        listenForCancel: (cancel) => active?.root ? listenOpenCancel(active.root.ownerDocument, cancel) : () => undefined,
        onCancelled: () => {
            playNavSound('OutOfGameDetail');
            if (active?.root) showCancelReturn(active.root);
        },
        startHome: () => {
            active = next;
            next = null;
            return active ? startHome(active) : null;
        },
        mountBridge: () => {
            const c = active;
            if (!c?.root) return null;
            const doc = c.root.ownerDocument;
            // Our status bar lives outside Home's root; its copy also keeps Steam's top bar hidden until the page's own takes over.
            // Steam's footer is one element over every page: the copy would cover it, so it carries a copy of it too.
            const footer = steamFooter();
            const extras = [...doc.querySelectorAll('.gg-status-host'), ...(footer ? [...doc.querySelectorAll(footer)] : [])];
            // Home's game row, tabs and feed have left (or faded with the rest) by the hand-over: the copy goes without them.
            // At the page's ready the copy's text twins glide onto the page's text as measured (openHome.settleTwins).
            const look = c.intent.look;
            const bridge = mountOpenBridge(c.root, steamEnterOffCss(), extras, ['.gh-recents', '.gh-tabs', '.gh-feed'], (copy) => settleTwins(copy, doc, pageTwinTargets(look)));
            if (c.intent.look !== 'steam') return bridge;
            // Steam's own page draws no status bar of ours: give Steam's top bar back once the bridge is gone.
            return { fadeIn: (ms: number) => bridge.fadeIn(ms), fadeOut: (ms: number) => bridge.fadeOut(ms), remove: () => { bridge.remove(); clearSteamBarCover(doc); } };
        },
        markOpen: () => {
            if (active) markOpen(active.appId, active.intent);
        },
        onReady: (cb) => (active ? whenReady(active, cb) : () => undefined),
        setTimer: (fn, ms) => setTimeout(fn, ms),
        clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        warn: (message, error) => console.warn(`${LOG_PREFIX} Home: ${message}`, error),
    });
    return transition;
}

/**
 * Opens a game's page with the open transition (spec docs/superpowers/specs/2026-10-09-open-transition-design.md):
 * the selected game's Home morphs into its page over the steady hero; a feed card's game gets its hero faded in over
 * Home; with fallback art or Steam's own page Home's UI fades. `source` is the pressed element (inside Home). The
 * single entry point for every A that opens a game from Home. Anything that cannot be set up still opens the page,
 * without motion; a press while a transition runs is ignored.
 */
export function openGame(appId: number, source?: HTMLElement | null) {
    // Steam's own sound for going into a game's page (every open from Home: a card, the info button, a feed card).
    playNavSound('IntoGameDetail');
    markLeaving();
    try {
        const root = (source?.closest?.('.gh-root') as HTMLElement | null) ?? null;
        const mode = homeMode(settings.get());
        const look: PageLook = mode.cleanDetails ? 'clean' : 'spotlight';
        const art = heroArtFor(appId);
        const pageRestyled = mode.gamePage && mode.restyleDetails;
        const variant = openVariant({ sameGame: heroShownApp() === appId, heroMode: art?.mode ?? 'none', pageRestyled });
        const heroUrl = art?.mode === 'full' ? art.url : (urls(() => heroUrls(appId, browserStores))[0] ?? null);
        // The page shows Home's eyebrow words when Home morphed into it, so they do not change at the hand-over.
        const eyebrow = variant === 'morph' ? root?.querySelector('.gh-eyebrow')?.textContent?.trim() || undefined : undefined;
        // Home without its cloud button (the state was not known yet): the page's arrives instead of popping in.
        const homeCloud = variant === 'morph' && root ? root.querySelector('.gh-actions .gh-btn[data-action="cloud"]') !== null : undefined;
        // Clean: the chips whose bar the morph moves onto the panel's (openMotion), so the page's do not fade in again.
        const homeBars = variant === 'morph' && look === 'clean' && root ? readChipTexts(root).filter((c) => c.bar).map((c) => c.key) : undefined;
        // Spotlight: the description and the HowLongToBeat card's rest Home draws as it turns into the page (OpenExtras).
        // (The Clean look shows neither, only the store pill.)
        const drawn = variant === 'morph' && root ? root.querySelector('.gh-open-extras')?.getAttribute('data-parts') ?? '' : '';
        const extras = look === 'spotlight' ? drawn : drawn.split(' ').filter((p) => p === 'pills' || p === 'played' || p === 'size').join(' ');
        // The family library pill moves in with Home's store pill: the page's must not arrive again (it blinked).
        const homeFamily = variant === 'morph' && root ? root.querySelector('.gh-family') !== null : undefined;
        // The page's stat columns Home showed no chip for (a new game's Play time) arrive instead of popping in.
        const homeMissing = variant === 'morph' && root ? missingStats(readChipTexts(root).map((c) => c.key), extras) : undefined;
        const homeChipKeys = variant === 'morph' && root ? readChipTexts(root).map((c) => c.key) : [];
        // A Unifideck game's Uninstall circle Home draws as it opens (.gh-open-circle): the page's must not arrive again.
        const homeUninstall = variant === 'morph' && root ? root.querySelector('.gh-open-circle') !== null : undefined;
        const intent: OpenIntent = { look: pageRestyled ? look : 'steam', mode: variant === 'morph' ? 'parts' : 'all', eyebrow, homeCloud, homeBars, homeFamily, homeMissing, homeUninstall, ...extrasFlags(extras, homeChipKeys) };
        next = { root, appId, variant, look, heroUrl, intent, extras };
        controller().open(appId, variant);
    } catch (error) {
        // Not reached in practice (the controller never throws); the page must open regardless.
        console.warn(`${LOG_PREFIX} Home: open transition failed`, error);
        openPage(appId);
    }
}

/** Drops a running transition: Home's opening state or the bridge go, a pending navigation never happens, the page's intent ends. */
export function cancelOpen() {
    try {
        transition?.cancel();
        clearOpen();
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
