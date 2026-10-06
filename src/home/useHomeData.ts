import { fetchNoCors } from '@decky/api';
import { useEffect, useMemo, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { attempt } from '../data/attempt';
import { cache, overrides, TTL } from '../data/cache';
import { hltbCacheKey, lookupHltb } from '../data/hltb';
import { GAME_APP_TYPE, SHORTCUT_APP_TYPE } from '../data/installedGames';
import { useSettings } from '../data/settings';
import { getSourceLabel } from '../data/source';
import { getSteamLanguage, peekSteamLanguage, readGameInfo } from '../data/steam';
import { useAsync } from '../hooks/useAsync';
import { useOverrideVersion } from '../hooks/useOverrideVersion';
import { steamLanguageToLocale } from '../logic/format';
import { heroicStoreLabel } from '../logic/heroic';
import { accentFor, DEFAULT_ACCENT } from './accent';
import { sampleAccent } from './accentSample';
import { DownloadState } from './downloadProgress';
import { useDownload } from './useDownload';
import { Chip, gameChips, libraryChips, readLibraryCounts, readStorageBytes } from './chips';
import { FriendCard, friendsKey, LAST_GAMES_KEY, LastGames, mapFriends, observeLastGames, onlineCount, parseLastGames, RawFriend, readFriends } from './friends';
import { mapWhatsNew, NewsCard, readWhatsNew } from './news';
import { loadRecentlyUpdated, UpdatedCard } from './recentlyUpdated';
import { readSteamTrending } from './steamTrending';
import { TrendingCard, trendingGames } from './trending';
import { PlayNextCandidate, RecommendedCard, scorePlayNext } from './playNext';
import { DealCard, dealCards } from './recommended';
import { fillMissing } from './homeView';
import { formatLastPlayed, pickRecents, RawApp, RecentGame } from './recents';
import { getWishlistDeals } from './wishlist';
import { pageHidden } from './pageVisible';
import { noteDetails } from './detailsMemo';
import { neighbourIds } from './heroLayers';
import { HERO_PRELOAD_RADIUS } from './motion';

export interface HomeGame extends RecentGame {
    installed: boolean;
    /** Steam's 64-bit game id (set for non-Steam shortcuts); RunGame needs it for them. */
    gameId: string | undefined;
}

export interface HomeData {
    games: HomeGame[];
    /** False while recents are empty and still being retried after boot; then true. */
    recentsSettled: boolean;
    /** The game the hero, title and actions show; null when nothing has been played yet. */
    focused: HomeGame | null;
    /** The focused game is the one running now (Play becomes Resume). */
    focusedRunning: boolean;
    /** Bumps when Steam delivers the focused game's details (hero art may be known only then). */
    detailsVersion: number;
    locale: string;
    lastPlayedLabel: string | null;
    chips: Chip[];
    /** The focused game's store ("Steam", "GOG", ...), once known; the same label as the details page's source pill. */
    source: string | undefined;
    libraryChips: Chip[];
    accent: string;
    news: NewsCard[];
    /** Installed games updated on this device recently (What's new, second row); [] until loaded or when none. */
    updated: UpdatedCard[];
    /** The focused game's install/update/download state, null when none (or the client does not say). */
    download: DownloadState | null;
    /** The focused game's display_status; changes re-render the Play pill (Steam derives its action from it). */
    pillStatus: number | null;
    friends: FriendCard[];
    /** Friends online now, over all friends (the cards stop at 10). */
    friendsOnline: number;
    /** Games friends are playing or played recently (Friends tab, second row); [] when none. */
    trending: TrendingCard[];
    recommended: RecommendedCard[];
    /** Wishlist sales for the Recommended tab's second row (only with Show wishlist deals on); biggest discount first. */
    deals: DealCard[];
}

type AnyApp = RawApp & { installed?: boolean; m_gameid?: string; appid: number };
type StoreGlobals = {
    collectionStore?: {
        recentAppsCollection?: { allApps?: AnyApp[] };
        localGamesCollection?: { allApps?: AnyApp[] };
        BIsHidden?(appId: number): boolean;
    };
    appStore?: { GetAppOverviewByAppID?(appId: number): (AnyApp & Record<string, unknown>) | undefined | null };
    appDetailsStore?: { GetAppDetails?(appId: number): unknown };
    SteamUIStore?: { RunningApps?: Array<{ appid?: number }>; MainRunningAppID?: number };
    App?: { m_CurrentUser?: { strSteamID?: string } };
    SteamClient?: { Apps?: { RegisterForAppDetails?(appId: number, cb: (details: unknown) => void): { unregister(): void } } };
};
const steam = globalThis as unknown as StoreGlobals;

/** Play next skips the games already in the first recents slots (spec section 5). */
const PLAY_NEXT_EXCLUDE = 7;
const RECENTS_RETRY_MS = 1500;
const RECENTS_RETRIES = 10;
const HLTB_READ_BATCH = 8;
/** Feed pills: accents sampled a few games at a time, repainting after each batch. */
const CARD_ACCENT_BATCH = 4;

function guarded<T>(what: string, read: () => T, fallback: T): T {
    try {
        return read();
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: ${what} failed`, error);
        return fallback;
    }
}

function overview(appId: number) {
    return guarded('app overview', () => steam.appStore?.GetAppOverviewByAppID?.(appId) ?? undefined, undefined);
}

/** The game is in the user's library (Steam has an app overview for it), so its page can open. */
function inLibrary(appId: number): boolean {
    return guarded('library check', () => Boolean(steam.appStore?.GetAppOverviewByAppID?.(appId)), false);
}

function appName(appId: number): string {
    const name = overview(appId)?.display_name;
    return typeof name === 'string' ? name : '';
}

/** Verified on the Ally: `collectionStore.recentAppsCollection.allApps` (20 items, newest first, `installed`, `m_gameid` for shortcuts). */
function readRecentGames(): HomeGame[] {
    return guarded('recents', () => {
        const apps = steam.collectionStore?.recentAppsCollection?.allApps;
        if (!Array.isArray(apps)) return [];
        const byId = new Map(apps.map((a) => [a.appid, a]));
        return pickRecents(apps).map((g) => {
            const app = byId.get(g.appId);
            const gameId = app?.m_gameid;
            return { ...g, installed: app?.installed === true, gameId: typeof gameId === 'string' ? gameId : undefined };
        });
    }, []);
}

function readPlayNextApps(): AnyApp[] {
    return guarded('installed games', () => {
        const store = steam.collectionStore;
        const apps = store?.localGamesCollection?.allApps;
        if (!Array.isArray(apps)) return [];
        return apps.filter((a) => (a.app_type === GAME_APP_TYPE || a.app_type === SHORTCUT_APP_TYPE)
            && !guarded('hidden check', () => store?.BIsHidden?.(a.appid) === true, false));
    }, []);
}

/**
 * HLTB main time from the cache only (never the network: Home must not fire one request per installed game).
 * Uses the same `hltbCacheKey` the lookup writes; a miss is just "unknown".
 */
async function cachedHltbMain(appId: number): Promise<number | null> {
    const overrideId = await attempt('override read', () => overrides.get(appId), null);
    const entry = await attempt('cache read', () => cache.get<{ status?: string; times?: { main?: number | null } }>(hltbCacheKey(appId, overrideId)), null);
    const main = entry?.status === 'found' ? entry.times?.main : null;
    return typeof main === 'number' && main > 0 ? main : null;
}

/**
 * Probed on the Ally (2026-10-03, nothing running): `SteamUIStore.RunningApps` (array of app overviews) and
 * `SteamUIStore.MainRunningAppID` exist. Not yet seen with a game running; any failure reads as "not running".
 */
function isRunning(appId: number): boolean {
    return guarded('running apps', () => {
        const store = steam.SteamUIStore;
        if (!store) return false;
        if (Number(store.MainRunningAppID) === appId) return true;
        const apps = store.RunningApps;
        return Array.isArray(apps) && apps.some((app) => Number(app?.appid) === appId);
    }, false);
}

function readSteamId(): string | null {
    return guarded('steam id', () => {
        const id = steam.App?.m_CurrentUser?.strSteamID;
        return typeof id === 'string' && /^\d+$/.test(id) ? id : null;
    }, null);
}

// Session memory so a re-opened Home paints the last known values at once, then refreshes.
const accentMemo = new Map<number, string>();
let recommendedMemo: RecommendedCard[] = [];
/** The last wishlist deal cards, for an instant second row on the next Home open. */
let dealsMemo: DealCard[] = [];
/** HLTB main hours per installed app (null = unknown), read from the plugin cache once per session. */
const hltbMainMemo = new Map<number, number | null>();

function useRecentGames(): { games: HomeGame[]; settled: boolean } {
    const [games, setGames] = useState<HomeGame[]>(readRecentGames);
    const [retriesDone, setRetriesDone] = useState(false);
    useEffect(() => {
        if (games.length > 0) return undefined;
        // Right after boot Steam may not have filled its collections yet; look again a few times.
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            const next = readRecentGames();
            if (next.length > 0) setGames(next);
            if (next.length > 0 || tries >= RECENTS_RETRIES) {
                clearInterval(timer);
                if (next.length === 0) setRetriesDone(true);
            }
        }, RECENTS_RETRY_MS);
        return () => clearInterval(timer);
    }, [games.length]);
    return { games, settled: games.length > 0 || retriesDone };
}

function useAccent(appId: number | null): string {
    const [accent, setAccent] = useState(() => (appId !== null ? accentMemo.get(appId) : undefined) ?? DEFAULT_ACCENT);
    useEffect(() => {
        if (appId === null) return undefined;
        const memo = accentMemo.get(appId);
        if (memo) {
            setAccent(memo);
            return undefined;
        }
        let active = true;
        // accentFor never rejects, but a guard costs nothing and Home must not see an unhandled rejection.
        accentFor(appId, { cache, sample: sampleAccent })
            .then((color) => {
                accentMemo.set(appId, color);
                if (active) setAccent(color);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [appId]);
    return accent;
}

/** Makes Steam load the focused game's details (achievements) if it has not yet; bumps a version when they arrive. */
function useAppDetailsVersion(appId: number | null): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (appId === null) return undefined;
        // The details are kept (detailsMemo): Steam's store may not hold them, and the hero art needs their file name.
        const registration = guarded('details registration', () => steam.SteamClient?.Apps?.RegisterForAppDetails?.(appId, (details) => {
            noteDetails(appId, details);
            setVersion((v) => v + 1);
        }), undefined);
        return () => guarded('details unregister', () => registration?.unregister(), undefined);
    }, [appId]);
    return version;
}

/**
 * Asks Steam for the details of the games either side of the selection (the ones whose hero art is pre-loaded) and
 * keeps their library assets (detailsMemo), so their full-screen art is the real hero once selected, not the blurred
 * capsule. One registration per game, dropped when it leaves the set or Home unmounts.
 */
function useNeighbourDetails(ids: number[]) {
    const key = ids.join(',');
    useEffect(() => {
        if (ids.length === 0) return undefined;
        const registrations = ids.map((id) =>
            guarded('details registration', () => steam.SteamClient?.Apps?.RegisterForAppDetails?.(id, (details) => noteDetails(id, details)), undefined),
        );
        return () => registrations.forEach((r) => guarded('details unregister', () => r?.unregister(), undefined));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
}

function useRecommended(games: HomeGame[], wishlistDeals: boolean, enabled: boolean): { cards: RecommendedCard[]; deals: DealCard[] } {
    const [cards, setCards] = useState<RecommendedCard[]>(recommendedMemo);
    const [deals, setDeals] = useState<DealCard[]>(() => (wishlistDeals ? dealsMemo : []));
    const [installed] = useState(readPlayNextApps);
    const installedKey = installed.map((a) => a.appid).join(',');
    const excludeKey = games.slice(0, PLAY_NEXT_EXCLUDE).map((g) => g.appId).join(',');
    useEffect(() => {
        if (!enabled) return undefined;
        let active = true;
        (async () => {
            const exclude = new Set(excludeKey ? excludeKey.split(',').map(Number) : []);
            await fillMissing(installed.map((a) => a.appid), hltbMainMemo, cachedHltbMain, HLTB_READ_BATCH, null);
            if (!active) return;
            const candidates: PlayNextCandidate[] = installed.map((a) => ({
                appId: a.appid,
                name: typeof a.display_name === 'string' ? a.display_name : '',
                playedMinutes: Math.max(0, Number(a.minutes_playtime_forever) || 0),
                hltbMainHours: hltbMainMemo.get(a.appid) ?? null,
            }));
            recommendedMemo = scorePlayNext(candidates, exclude);
            setCards(recommendedMemo);
            const steamId = wishlistDeals ? readSteamId() : null;
            if (!steamId) {
                setDeals([]);
                return;
            }
            const found = dealCards(await getWishlistDeals(steamId, { cache, fetcher: fetchNoCors, now: Date.now }));
            dealsMemo = found;
            if (active) setDeals(found);
        })().catch((error) => console.warn(`${LOG_PREFIX} Home: recommended failed`, error));
        return () => {
            active = false;
        };
        // `installed` is read once per mount; installedKey stands for it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [installedKey, excludeKey, wishlistDeals, enabled]);
    if (!enabled) return { cards: [], deals: [] };
    return { cards, deals: wishlistDeals ? deals : [] };
}

/**
 * Each feed card's own game accent (its pill, a friend's ring), from the same per-game cache and session memo
 * as the hero accent. Resolved only while `enabled` (the sheet has been raised), for the ids given (the
 * selected tab's cards), a few at a time; until then and on any failure the default colour.
 */
export function useCardAccents(appIds: number[], enabled: boolean): (appId: number) => string {
    const [, setVersion] = useState(0);
    const key = [...new Set(appIds.filter((id) => id > 0))].join(',');
    useEffect(() => {
        if (!enabled || !key) return undefined;
        let active = true;
        const ids = key.split(',').map(Number).filter((id) => !accentMemo.has(id));
        (async () => {
            for (let i = 0; i < ids.length && active; i += CARD_ACCENT_BATCH) {
                await fillMissing(ids.slice(i, i + CARD_ACCENT_BATCH), accentMemo, (id) => accentFor(id, { cache, sample: sampleAccent }), CARD_ACCENT_BATCH, DEFAULT_ACCENT);
                if (active) setVersion((v) => v + 1);
            }
        })().catch((error) => console.warn(`${LOG_PREFIX} Home: card accents failed`, error));
        return () => {
            active = false;
        };
    }, [key, enabled]);
    return (appId: number) => accentMemo.get(appId) ?? DEFAULT_ACCENT;
}

/** The recently updated list waits this long after Home mounts, so its details lookups never compete with the first paint. */
const UPDATED_DELAY_MS = 1500;

/** The What's new tab's "Recently updated" games (recentlyUpdated.loadRecentlyUpdated: local IPC, memoised for 10 minutes). */
function useRecentlyUpdated(enabled: boolean): UpdatedCard[] {
    const [cards, setCards] = useState<UpdatedCard[]>([]);
    useEffect(() => {
        if (!enabled) return undefined;
        let active = true;
        const timer = setTimeout(() => {
            loadRecentlyUpdated(Date.now, () => !active).then((list) => {
                if (active) setCards(list);
            }, () => undefined);
        }, UPDATED_DELAY_MS);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [enabled]);
    return enabled ? cards : [];
}

/** Steam's trending list is re-read this often (Steam itself refreshes it once a day), and once soon after mount, when its store names may have arrived. */
const STEAM_TRENDING_REFRESH_MS = 5 * 60_000;
const STEAM_TRENDING_SECOND_READ_MS = 3000;

/** Steam's own "Trending among friends" list (steamTrending.readSteamTrending); null when Steam's source is missing or failed. */
function useSteamTrending(enabled: boolean): TrendingCard[] | null {
    const [cards, setCards] = useState<TrendingCard[] | null>(() => (enabled ? guarded('steam trending', readSteamTrending, null) : null));
    useEffect(() => {
        if (!enabled) return undefined;
        const read = () => setCards((old) => {
            const next = guarded('steam trending', readSteamTrending, null);
            return JSON.stringify(old) === JSON.stringify(next) ? old : next;
        });
        const soon = setTimeout(read, STEAM_TRENDING_SECOND_READ_MS);
        const timer = setInterval(read, STEAM_TRENDING_REFRESH_MS);
        return () => {
            clearTimeout(soon);
            clearInterval(timer);
        };
    }, [enabled]);
    return enabled ? cards : null;
}

/** No friends (the bottom section is hidden): one stable empty list, so nothing downstream recomputes. */
const NO_FRIENDS: RawFriend[] = [];

/** How often the friends list is re-read while Home is open (an in-memory read of Steam's friend store). */
const FRIENDS_POLL_MS = 2000;

/**
 * Steam's friends list, live: re-read every FRIENDS_POLL_MS and replaced only when something a card or the badge
 * shows changed (friends.friendsKey), so statuses, rings, order and "Playing" update within about two seconds
 * without re-rendering Home for nothing. Cleaned up on unmount; a failed read keeps the last list.
 */
function useLiveFriends(enabled: boolean): RawFriend[] {
    const [state, setState] = useState(() => {
        const list = enabled ? guarded('friends', readFriends, [] as RawFriend[]) : [];
        return { list, key: friendsKey(list) };
    });
    useEffect(() => {
        if (!enabled) return undefined;
        const timer = setInterval(() => {
            if (pageHidden()) return;
            const list = guarded('friends', readFriends, null as RawFriend[] | null);
            if (!list) return;
            const key = friendsKey(list);
            setState((old) => (old.key === key ? old : { list, key }));
        }, FRIENDS_POLL_MS);
        return () => clearInterval(timer);
    }, [enabled]);
    return enabled ? state.list : NO_FRIENDS;
}

/** The friend last-played cache for the session (loaded once, then kept in step with what Home observes). */
let lastGamesMemo: LastGames | null = null;

/**
 * Each friend's last seen game: read from the plugin cache, merged with the friends list as Steam shows it now
 * (a friend in a game, or with m_nAppIDLastSeenPlaying set) every time the live list changes, so a friend seen in a
 * game while Home is open is remembered; written back only when something changed.
 * Starts from the session memo (or empty) and never blocks or throws.
 */
function useFriendLastGames(raw: RawFriend[]): LastGames {
    const [last, setLast] = useState<LastGames>(() => lastGamesMemo ?? {});
    useEffect(() => {
        let active = true;
        (async () => {
            const stored = lastGamesMemo ?? parseLastGames(await attempt('friend cache read', () => cache.get<unknown>(LAST_GAMES_KEY), null));
            const { map, changed } = observeLastGames(stored, raw, appName, Date.now());
            lastGamesMemo = map;
            if (changed) await attempt('friend cache write', () => cache.put(LAST_GAMES_KEY, map, TTL.friendLast), undefined);
            if (active && (changed || map !== last)) setLast(map);
        })().catch((error) => console.warn(`${LOG_PREFIX} Home: friend last played failed`, error));
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [raw]);
    return last;
}

/**
 * Everything Spotlight Home shows, assembled from the pure shelf modules. Renders from Steam's stores and
 * the session/plugin caches first; HLTB, accent and recommendations fill in as they resolve. Never throws.
 * `focusIndex` is the selected recents item (L1/R1, bumper navigation); an index past the end keeps the last game (the Library card).
 */
export function useHomeData(focusIndex = 0): HomeData {
    // With the bottom section hidden (homeFeed off) nothing for it is read, polled or fetched.
    const { wishlistDeals, homeFeed: feed } = useSettings();
    const { games, settled: recentsSettled } = useRecentGames();
    const focused = games.length > 0 ? games[Math.min(Math.max(0, focusIndex), games.length - 1)] : null;
    const appId = focused?.appId ?? null;

    const knownLang = peekSteamLanguage();
    const loadedLang = useAsync(knownLang ? null : 'lang', getSteamLanguage);
    const locale = steamLanguageToLocale(knownLang ?? loadedLang ?? 'english');

    const detailsVersion = useAppDetailsVersion(appId);
    const gameIds = useMemo(() => games.map((g) => g.appId), [games]);
    useNeighbourDetails(useMemo(() => neighbourIds(gameIds, Math.max(0, focusIndex), HERO_PRELOAD_RADIUS), [gameIds, focusIndex]));
    const overrideVersion = useOverrideVersion();
    const info = useMemo(
        () => (appId === null ? null : guarded('game info', () => readGameInfo(overview(appId), steam.appDetailsStore?.GetAppDetails?.(appId)), null)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [appId, detailsVersion],
    );
    const hltb = useAsync(focused && info ? `hltb:${focused.appId}:${overrideVersion}` : null, () =>
        lookupHltb({ appId: focused?.appId ?? 0, name: info?.name || focused?.name || '', isShortcut: info?.isShortcut ?? false }),
    );
    const source = useAsync(info ? `src:${info.appId}` : null, () =>
        getSourceLabel(info?.appId ?? 0, info?.isShortcut ?? false, undefined, heroicStoreLabel(info?.heroic ?? null)),
    );
    const accent = useAccent(appId);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const chips = useMemo(() => {
        if (!focused) return [];
        return guarded('game chips', () => gameChips({
            playedMinutes: focused.playedMinutes,
            achievements: info?.achievements ?? null,
            lastPlayed: focused.lastPlayed,
            hltbMainHours: hltb?.status === 'found' ? hltb.times.main : null,
        }, nowSeconds, locale), []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focused, info, hltb, locale]);
    const lastPlayedLabel = focused ? guarded('last played', () => formatLastPlayed(focused.lastPlayed, nowSeconds, locale), null) : null;

    const library = useMemo(
        () => guarded('library chips', () => libraryChips({ ...readLibraryCounts(), storageBytes: readStorageBytes() }, locale), []),
        [locale],
    );
    // Read once per mount (and again if the bottom section is turned back on while Home is open).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const news = useMemo(() => (feed ? guarded('what\'s new', () => mapWhatsNew(readWhatsNew(), appName, nowSeconds), []) : []), [feed]);
    const updated = useRecentlyUpdated(feed);
    const rawFriends = useLiveFriends(feed);
    const lastGames = useFriendLastGames(rawFriends);
    const friends = useMemo(() => guarded('friends', () => mapFriends(rawFriends, appName, 10, lastGames), []), [rawFriends, lastGames]);
    const friendsOnline = useMemo(() => guarded('online friends', () => onlineCount(rawFriends), 0), [rawFriends]);
    // Recomputed only when the live friends list or the last-played cache changes (both keep their identity otherwise).
    // Steam's own list first; the derived one (live games and the 7-day cache) only when Steam's is missing or empty.
    const steamTrending = useSteamTrending(feed);
    const derivedTrending = useMemo(() => guarded('trending', () => trendingGames(rawFriends, lastGames, appName, inLibrary, Date.now()), []), [rawFriends, lastGames]);
    const trending = steamTrending && steamTrending.length > 0 ? steamTrending : derivedTrending;
    const { cards: recommended, deals } = useRecommended(games, wishlistDeals, feed);

    const focusedRunning = appId !== null && isRunning(appId);
    const { download, installed: installedNow, status: pillStatus } = useDownload(appId, focused?.installed ?? false);
    const focusedLive = useMemo(() => (focused && focused.installed !== installedNow ? { ...focused, installed: installedNow } : focused), [focused, installedNow]);

    return { games, recentsSettled, focused: focusedLive, focusedRunning, download, pillStatus, detailsVersion, locale, lastPlayedLabel, chips, source, libraryChips: library, accent, news, updated, friends, friendsOnline, trending, recommended, deals };
}
