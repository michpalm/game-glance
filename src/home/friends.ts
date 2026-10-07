import { joinUrl } from './join';
import { tr } from '../i18n/steamText';

declare const friendStore: any;

/** Plain subset of a Steam friend object (display_name, persona fields). */
export interface RawFriend {
    steamId: string;
    name: string;
    avatarUrl: string | null;
    /**
     * persona.m_ePersonaState (EPersonaState, probed on the Ally with Steam's own getters): 0 offline, 1 online, 2 busy,
     * 3 away, 4 snooze, 5 looking to trade, 6 looking to play, 7 invisible. Steam's `is_online` is "not 0 and not 7";
     * its `is_awayOrSnooze` is 3 or 4 (Steam labels snooze "Away" too).
     */
    personaState: number;
    /** persona.m_unGamePlayedAppID: 0 when not in a game. */
    gameAppId: number;
    onlineStatus: string;
    /** persona.m_strGameExtraInfo: Steam's name for the game being played (also set for games not in the library). */
    gameName?: string;
    /**
     * friend.m_nAppIDLastSeenPlaying: the game this client last saw the friend stop playing (Steam sets it from a
     * persona update, in memory only, so it is known only for friends who played since Steam started). 0 = unknown.
     */
    lastPlayedAppId?: number;
    /** persona.m_unPersonaStateFlags (bit 2 = Steam's "has joinable game" flag). */
    stateFlags?: number;
    /** persona.m_game_lobby_id ("0" or "" when none; Steam treats any other value as a lobby). */
    lobbyId?: string;
    /** persona.m_unGameServerIP (0 when none). */
    serverIp?: number;
    /** The friend's rich presence "connect" string (persona.connect_string), '' when none. */
    connect?: string;
}

export interface FriendCard {
    steamId: string;
    name: string;
    avatarUrl: string | null;
    /** Steam's online_state, with away split out: in game (also when away), online (busy too), away/snooze, offline. */
    state: 'ingame' | 'online' | 'away' | 'offline';
    /** The game being played now (in game only). */
    appId: number | null;
    /** The game last played, when its name is known and not in game (its art shows, glass if Steam has none). */
    lastAppId: number | null;
    sub: string;
    /** The game being played, by name ('' when unknown); and whether it is in the user's library. */
    game: string;
    gameInLibrary: boolean;
    /** Steam's Join Game url for this friend (join.joinUrl), null when not joinable. */
    joinUrl: string | null;
}

const ORDER = { ingame: 0, online: 1, away: 2, offline: 3 } as const;

/** Steam's persona states that matter here (EPersonaState). */
export const PERSONA = { offline: 0, online: 1, busy: 2, away: 3, snooze: 4, invisible: 7 } as const;

/** Steam's persona.is_online: anything but offline and invisible. */
export function isOnlineState(state: number): boolean {
    return Number.isFinite(state) && state !== PERSONA.offline && state !== PERSONA.invisible;
}

/** Steam's persona.is_awayOrSnooze. */
export function isAwayState(state: number): boolean {
    return state === PERSONA.away || state === PERSONA.snooze;
}

function isOnline(f: RawFriend): boolean {
    return f.gameAppId > 0 || isOnlineState(f.personaState);
}

/**
 * Friends colours on dark glass. `online`: the badge and the ring for friends online or in game, a green that is
 * neither the default game accent (#5fd1ae) nor the cloud green (#5cf2b4): Steam's own in-game green (its friends
 * list avatar status, rgb(140, 214, 29)). `away`: Steam's own friends menu colour for an away friend in gamepad mode
 * (`.GamepadMode .awayOrSnooze.online` name colour, rgb(76, 180, 255), read from its stylesheet on the Ally).
 * `none`: the badge with nobody online.
 */
export const FRIEND_COLOURS = {
    online: '#8cd61d',
    away: '#4cb4ff',
    none: 'rgba(255,255,255,.4)',
} as const;

/** The avatar ring for a card's state: green online or in game, blue away, none offline (the avatar is dimmed). */
export function friendRing(state: FriendCard['state']): 'online' | 'away' | null {
    return state === 'ingame' || state === 'online' ? 'online' : state === 'away' ? 'away' : null;
}

/** Friends online now (online in any flavour, or in game); offline excluded. For the Friends tab badge. */
export function onlineCount(friends: RawFriend[]): number {
    return friends.filter(isOnline).length;
}

/** The last game seen for a friend: the appid, Steam's name for it at the time, and when it was observed (ms). */
export interface LastGame {
    appId: number;
    name: string;
    at: number;
}
/** Last game per friend steamid. */
export type LastGames = Record<string, LastGame>;

/** Friends kept in the last-played cache; the least recently observed go first. */
export const MAX_LAST_GAMES = 500;
/** How often an in-game friend's cache entry is re-stamped (Home reads the list every few seconds). */
export const LAST_GAME_REFRESH_MS = 10 * 60_000;
/** Plugin cache key of the map. */
export const LAST_GAMES_KEY = 'friends:last';

/** A stored map, tolerant of anything: bad entries are dropped, a non-object is an empty map. Never throws. */
export function parseLastGames(raw: unknown): LastGames {
    const out: LastGames = {};
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
        const e = v as Partial<LastGame> | null;
        if (!id || typeof e !== 'object' || e === null) continue;
        const { appId, at } = e;
        if (typeof appId !== 'number' || !Number.isInteger(appId) || appId <= 0 || typeof at !== 'number' || !Number.isFinite(at)) continue;
        out[id] = { appId, name: typeof e.name === 'string' ? e.name : '', at };
    }
    return boundLastGames(out);
}

/** At most `max` friends, the most recently observed kept. */
export function boundLastGames(map: LastGames, max = MAX_LAST_GAMES): LastGames {
    const ids = Object.keys(map);
    if (ids.length <= max) return map;
    ids.sort((a, b) => map[b].at - map[a].at);
    const out: LastGames = {};
    for (const id of ids.slice(0, max)) out[id] = map[id];
    return out;
}

/**
 * Merges what the friends list shows right now into the cache: a friend in a game, or one Steam reports a last
 * seen game for (m_nAppIDLastSeenPlaying), replaces the stored game (a newer observation wins); everyone else
 * keeps theirs. `changed` is false when nothing needs writing. Pure; never mutates `prev`.
 */
export function observeLastGames(prev: LastGames, friends: RawFriend[], appName: (appId: number) => string, now: number): { map: LastGames; changed: boolean } {
    const map: LastGames = { ...prev };
    let changed = false;
    for (const f of friends) {
        if (!f.steamId) continue;
        const inGame = f.gameAppId > 0;
        const appId = inGame ? f.gameAppId : Number(f.lastPlayedAppId) > 0 ? Number(f.lastPlayedAppId) : 0;
        if (appId <= 0) continue;
        const old = map[f.steamId];
        const name = appName(appId) || (inGame ? f.gameName || '' : '') || (old?.appId === appId ? old.name : '');
        // A game last seen is only worth a write when it is new or its name is; an in-game friend also refreshes the
        // time, at most every LAST_GAME_REFRESH_MS (Home reads the list every few seconds and must not write the cache each time).
        if (old && old.appId === appId && old.name === name && (!inGame || now - old.at < LAST_GAME_REFRESH_MS)) continue;
        map[f.steamId] = { appId, name, at: now };
        changed = true;
    }
    return changed ? { map: boundLastGames(map), changed } : { map: prev, changed };
}

/**
 * The sub line: "Playing {game}" in game; Steam's status text ("Online") when online but not in a game; away or
 * offline: "Last played {game}" (with that game's card art) from Steam's own last seen game or the cache when its name
 * is known, else Steam's status text ("Away", "Last online ...").
 */
export function mapFriends(friends: RawFriend[], appName: (appId: number) => string, limit = 10, last: LastGames = {}): FriendCard[] {
    const cards = friends.map((f): FriendCard => {
        const inGame = f.gameAppId > 0;
        const game = inGame ? appName(f.gameAppId) || f.gameName || '' : '';
        const cached = last[f.steamId];
        const lastId = inGame ? 0 : Number(f.lastPlayedAppId) > 0 ? Number(f.lastPlayedAppId) : cached?.appId ?? 0;
        const lastName = lastId > 0 ? appName(lastId) || (cached?.appId === lastId ? cached.name : '') : '';
        const state = inGame ? 'ingame' : !isOnlineState(f.personaState) ? 'offline' : isAwayState(f.personaState) ? 'away' : 'online';
        const status = f.onlineStatus || (state === 'online' ? tr('online') : state === 'away' ? tr('away') : '');
        return {
            steamId: f.steamId,
            name: f.name,
            avatarUrl: f.avatarUrl || null,
            state,
            appId: inGame ? f.gameAppId : null,
            lastAppId: lastName ? lastId : null,
            sub: inGame ? (game ? tr('playingGame', [game]) : tr('inGame')) : (state === 'offline' || state === 'away') && lastName ? tr('lastPlayedGame', [lastName]) : status,
            game,
            gameInLibrary: inGame && appName(f.gameAppId) !== '',
            joinUrl: inGame ? joinUrl(f) : null,
        };
    });
    // Array.prototype.sort is stable, so Steam's own order holds within a group.
    cards.sort((a, b) => ORDER[a.state] - ORDER[b.state]);
    return cards.slice(0, limit);
}

/** What the cards and the badge show for a list, as one string: Home re-renders only when it changes. */
export function friendsKey(friends: RawFriend[]): string {
    return friends.map((f) => [f.steamId, f.name, f.avatarUrl ?? '', f.personaState, f.gameAppId, f.gameName ?? '', f.lastPlayedAppId ?? 0, f.onlineStatus,
        f.stateFlags ?? 0, f.lobbyId ?? '', f.serverIp ?? 0, f.connect ?? ''].join('\u0001')).join('\u0002');
}

export function readFriends(): RawFriend[] {
    try {
        const list = friendStore?.allFriends;
        if (!Array.isArray(list)) return [];
        return list.map((f: any) => ({
            steamId: String(f.steamid64 ?? ''),
            name: String(f.display_name ?? ''),
            avatarUrl: typeof f.persona?.avatar_url_medium === 'string' ? f.persona.avatar_url_medium : null,
            personaState: Number(f.persona?.m_ePersonaState) || 0,
            gameAppId: Number(f.persona?.m_unGamePlayedAppID) || 0,
            onlineStatus: String(f.localized_online_status ?? ''),
            gameName: typeof f.persona?.m_strGameExtraInfo === 'string' ? f.persona.m_strGameExtraInfo : '',
            lastPlayedAppId: Number(f.m_nAppIDLastSeenPlaying) || 0,
            stateFlags: Number(f.persona?.m_unPersonaStateFlags) || 0,
            lobbyId: f.persona?.m_game_lobby_id == null ? '' : String(f.persona.m_game_lobby_id),
            serverIp: Number(f.persona?.m_unGameServerIP) || 0,
            connect: (() => {
                try {
                    return typeof f.persona?.connect_string === 'string' ? f.persona.connect_string : '';
                } catch {
                    return '';
                }
            })(),
        }));
    } catch {
        return [];
    }
}
