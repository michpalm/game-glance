import type { LastGames, RawFriend } from './friends';

/**
 * "Trending among friends" for the Friends tab's second row. Primary source: Steam's own list, the one stock Home's
 * "Trending among friends" shelf shows (probed on the Ally, C18): `window.trendingStore.TrendingApps`, items
 * `{ appid, rgAccountIDs, totalFriends }` from Steam's IPlayer/GetTrendingAppsAmongFriends call (num_apps 50,
 * num_top_friends 8), kept by Steam for a day (mapSteamTrending). Fallback when that is missing, empty or throws: a
 * list derived from what Home already reads (trendingGames): each friend's live in-game app, the game Steam last saw
 * them play this session (m_nAppIDLastSeenPlaying), and the persisted last-played cache, counting only entries seen in
 * the last 7 days. Pure.
 */

export interface TrendingCard {
    appId: number;
    name: string;
    /** Friends who play it, as avatars (at most TRENDING_AVATARS), and how many more there are. */
    avatars: Array<{ url: string | null; initial: string }>;
    moreFriends: number;
    /** "In library", "-85%", "Free to play" or ''. */
    tag: string;
    /** Steam's store header for a game not in the library (its own store data), else null. */
    storeArt: string | null;
    /** Friends in this game now. */
    playing: number;
    /** Friends who played it recently and are not in it now. */
    played: number;
    /** "3 friends playing", "1 friend playing", "2 friends played recently". */
    label: string;
    /** In the user's library: A opens the game page; else the store page. */
    inLibrary: boolean;
}

/** Cache entries older than this do not count as "played recently". */
export const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60_000;
/** Cards in the row. */
export const TRENDING_MAX = 10;
/** Friend avatars on a card; more show as "+N". */
export const TRENDING_AVATARS = 3;

const initialOf = (name: string) => Array.from(name.trim())[0] ?? '?';

export function trendingLabel(playing: number, played: number): string {
    if (playing > 0) return `${playing} ${playing === 1 ? 'friend' : 'friends'} playing`;
    return `${played} ${played === 1 ? 'friend' : 'friends'} played recently`;
}

interface Tally {
    playing: Set<string>;
    played: Set<string>;
    /** Most recent sighting (ms); playing now counts as `now`. */
    last: number;
    steamName: string;
}

/**
 * The trending games: distinct friends per game (playing now, or played within `windowMs` by cache time; a game Steam
 * saw this session counts as recent), ranked by friends in total, then by friends playing now, then by the most recent
 * sighting; at most `max`. Games without a known name are left out.
 */
export function trendingGames(
    friends: RawFriend[],
    last: LastGames,
    appName: (appId: number) => string,
    inLibrary: (appId: number) => boolean,
    now: number,
    windowMs = TRENDING_WINDOW_MS,
    max = TRENDING_MAX,
): TrendingCard[] {
    const games = new Map<number, Tally>();
    const tally = (appId: number) => {
        let t = games.get(appId);
        if (!t) {
            t = { playing: new Set(), played: new Set(), last: 0, steamName: '' };
            games.set(appId, t);
        }
        return t;
    };
    for (const f of friends) {
        if (!f.steamId) continue;
        const now_ = Number(f.gameAppId) > 0 ? Number(f.gameAppId) : 0;
        if (now_ > 0) {
            const t = tally(now_);
            t.playing.add(f.steamId);
            t.last = now;
            if (f.gameName && !t.steamName) t.steamName = f.gameName;
        }
        const seen = Number(f.lastPlayedAppId) > 0 ? Number(f.lastPlayedAppId) : 0;
        if (seen > 0 && seen !== now_) {
            const t = tally(seen);
            t.played.add(f.steamId);
            t.last = Math.max(t.last, now - 1);
        }
        const cached = last[f.steamId];
        if (cached && cached.appId > 0 && cached.appId !== now_ && cached.appId !== seen && now - cached.at <= windowMs && cached.at <= now + 60_000) {
            const t = tally(cached.appId);
            t.played.add(f.steamId);
            t.last = Math.max(t.last, cached.at);
            if (cached.name && !t.steamName) t.steamName = cached.name;
        }
    }
    const cards: Array<TrendingCard & { last: number }> = [];
    for (const [appId, t] of games) {
        for (const id of t.playing) t.played.delete(id);
        const name = appName(appId) || t.steamName;
        if (!name) continue;
        const playing = t.playing.size;
        const played = t.played.size;
        const owned = inLibrary(appId);
        const ids = [...t.playing, ...t.played];
        const avatars = ids.slice(0, TRENDING_AVATARS).map((id) => {
            const friend = friends.find((x) => x.steamId === id);
            return { url: friend?.avatarUrl ?? null, initial: initialOf(friend?.name ?? '') };
        });
        cards.push({
            appId, name, playing, played, label: trendingLabel(playing, played), inLibrary: owned,
            avatars, moreFriends: Math.max(0, ids.length - avatars.length), tag: owned ? 'In library' : '', storeArt: null, last: t.last,
        });
    }
    cards.sort((a, b) => b.playing + b.played - (a.playing + a.played) || b.playing - a.playing || b.last - a.last || a.appId - b.appId);
    return cards.slice(0, Math.max(0, max)).map(({ last: _last, ...card }) => card);
}

/** One trending game as Steam's trendingStore holds it. */
export interface SteamTrendingApp {
    appid: number;
    rgAccountIDs: number[];
    totalFriends: number;
}

/** What Steam's store item cache knows about a game (StoreItem: GetName, BIsFree, GetBestPurchaseOption, GetAssets). */
export interface StoreInfo {
    name: string;
    header: string | null;
    free: boolean;
    discountPct: number;
    finalPrice: string;
    originalPrice: string;
}

export interface TrendingLookup {
    /** The game is in the user's library (owned). */
    owned(appId: number): boolean;
    libraryName(appId: number): string;
    store(appId: number): StoreInfo | null;
    /** A friend by Steam account id. */
    friend(accountId: number): { name: string; avatarUrl: string | null } | null;
}

/** "1 friend plays", "3 friends play" (Steam's list counts friends who play the game). */
export function playsLabel(total: number): string {
    return `${total} ${total === 1 ? 'friend plays' : 'friends play'}`;
}

/**
 * Steam's trending list as cards, in Steam's order. As stock Home: only owned games unless Steam's "show store content
 * on Home" setting is on (`showStoreContent`). Owned: "In library", the library name. Not owned: the store name, the
 * discount ("-85%", the line "5,99€ (was 39,99€)") or "Free to play", and the store header as art. Avatars: the
 * friends Steam names (rgAccountIDs, the top friends), "+N" for the rest of totalFriends. Games with no name known
 * yet are skipped. At most `max`.
 */
export function mapSteamTrending(apps: unknown, lookup: TrendingLookup, showStoreContent: boolean, max = TRENDING_MAX): TrendingCard[] {
    if (!Array.isArray(apps)) return [];
    const out: TrendingCard[] = [];
    const seen = new Set<number>();
    for (const raw of apps) {
        if (out.length >= max) break;
        const a = raw as Partial<SteamTrendingApp> | null;
        const appId = Number(a?.appid);
        if (!Number.isInteger(appId) || appId <= 0 || seen.has(appId)) continue;
        const owned = lookup.owned(appId);
        if (!owned && !showStoreContent) continue;
        const store = owned ? null : lookup.store(appId);
        const name = (owned ? lookup.libraryName(appId) : '') || store?.name || '';
        if (!name) continue;
        seen.add(appId);
        const accounts = Array.isArray(a?.rgAccountIDs) ? a!.rgAccountIDs!.filter((n) => Number.isInteger(n) && n > 0) : [];
        const total = Math.max(accounts.length, Number(a?.totalFriends) || 0);
        const avatars = accounts.slice(0, TRENDING_AVATARS).map((id) => {
            const f = lookup.friend(id);
            return { url: f?.avatarUrl ?? null, initial: initialOf(f?.name ?? '') };
        });
        let tag = '';
        let line = playsLabel(total);
        if (owned) tag = 'In library';
        else if (store?.free) tag = 'Free to play';
        else if (store && store.discountPct > 0) {
            tag = `-${store.discountPct}%`;
            if (store.finalPrice) line += ` - ${store.finalPrice}${store.originalPrice ? ` (was ${store.originalPrice})` : ''}`;
        } else if (store?.finalPrice) line += ` - ${store.finalPrice}`;
        out.push({
            appId, name, playing: 0, played: total, label: line, inLibrary: owned,
            avatars, moreFriends: Math.max(0, total - avatars.length), tag, storeArt: owned ? null : store?.header ?? null,
        });
    }
    return out;
}
