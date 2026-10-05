import { describe, expect, it } from 'vitest';
import { afterEach, vi } from 'vitest';
import {
    boundLastGames, FRIEND_COLOURS, friendRing, friendsKey, isAwayState, isOnlineState, LAST_GAME_REFRESH_MS, LastGames, mapFriends, MAX_LAST_GAMES,
    observeLastGames, onlineCount, parseLastGames, RawFriend, readFriends,
} from '../../src/home/friends';
import fixture from './fixtures/friends.json';

const base = fixture as RawFriend[];
const name = (id: number) => `Game ${id}`;

describe('mapFriends', () => {
    it('puts in-game friends first, then online, then away, then offline', () => {
        const friends: RawFriend[] = [
            base[1],
            base[0], // persona state 4 (snooze), which Steam shows as Away
            { ...base[2], steamId: '76561190000000009', personaState: 1, gameAppId: 42 },
            { ...base[2], steamId: '76561190000000008', personaState: 1, onlineStatus: 'Online' },
        ];
        const cards = mapFriends(friends, name);
        expect(cards.map((c) => c.state)).toEqual(['ingame', 'online', 'away', 'offline']);
        expect(cards[0].appId).toBe(42);
    });
    it('maps every persona state as Steam does (is_online: not 0 or 7; is_awayOrSnooze: 3 or 4; busy is online)', () => {
        const st = (personaState: number, gameAppId = 0) => mapFriends([{ ...base[2], personaState, gameAppId }], name)[0].state;
        expect([0, 1, 2, 3, 4, 5, 6, 7].map((p) => st(p))).toEqual(['offline', 'online', 'online', 'away', 'away', 'online', 'online', 'offline']);
        // In game wins over away (Steam's online_state is "in-game").
        expect(st(3, 42)).toBe('ingame');
        expect(isOnlineState(7)).toBe(false);
        expect(isAwayState(4)).toBe(true);
    });
    it('rings: green online and in game, blue away, none offline; the colours are Steam\'s own', () => {
        expect(friendRing('ingame')).toBe('online');
        expect(friendRing('online')).toBe('online');
        expect(friendRing('away')).toBe('away');
        expect(friendRing('offline')).toBeNull();
        expect(FRIEND_COLOURS.away).toBe('#4cb4ff');
        expect(FRIEND_COLOURS.online).not.toBe('#5fd1ae');
        expect(FRIEND_COLOURS.online).not.toBe('#5cf2b4');
    });
    it('the online green and the away blue read on dark glass (at least 4.5:1 on the glass over dark and mid art)', () => {
        const lum = (hex: string) => {
            const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        };
        const contrast = (a: string, b: string) => {
            const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
            return (x + 0.05) / (y + 0.05);
        };
        for (const c of [FRIEND_COLOURS.online, FRIEND_COLOURS.away]) {
            expect(contrast(c, '#0c0e11')).toBeGreaterThanOrEqual(7);
            expect(contrast(c, '#2a2d30')).toBeGreaterThanOrEqual(4.5);
        }
    });
    it('sub line reads Playing GAME for in-game friends and the status otherwise', () => {
        const cards = mapFriends([{ ...base[0], gameAppId: 42 }, base[1]], name);
        expect(cards[0].sub).toBe('Playing Game 42');
        expect(cards[1].sub).toBe('Last online 4 weeks ago');
    });
    it('falls back to Steam\'s game name for a game not in the library, then to In game', () => {
        const unknown = () => '';
        const named = mapFriends([{ ...base[0], gameAppId: 42, gameName: 'Some Game' }], unknown);
        expect(named[0].sub).toBe('Playing Some Game');
        expect(mapFriends([{ ...base[0], gameAppId: 42 }], unknown)[0].sub).toBe('In game');
        // The library name wins when there is one.
        expect(mapFriends([{ ...base[0], gameAppId: 42, gameName: 'Other' }], name)[0].sub).toBe('Playing Game 42');
    });
    it('uses a null avatar when none is present', () => {
        expect(mapFriends([base[2]], name)[0].avatarUrl).toBeNull();
    });
    it('of no friends is empty', () => {
        expect(mapFriends([], name)).toEqual([]);
    });
    it('respects the limit', () => {
        expect(mapFriends(base, name, 2)).toHaveLength(2);
    });
    it('in-game friends carry no last played game, even when Steam remembers one', () => {
        const [card] = mapFriends([{ ...base[0], gameAppId: 42, lastPlayedAppId: 7 }], name);
        expect(card.sub).toBe('Playing Game 42');
        expect(card.lastAppId).toBeNull();
    });
    it('an offline friend reads Last played GAME from what Steam last saw; an online one just reads Online', () => {
        const cards = mapFriends([{ ...base[1], lastPlayedAppId: 7 }, { ...base[0], personaState: 1, lastPlayedAppId: 8, onlineStatus: 'Online' }], name);
        expect(cards.map((c) => c.state)).toEqual(['online', 'offline']);
        expect(cards[0]).toMatchObject({ sub: 'Online', lastAppId: 8, appId: null });
        expect(cards[1]).toMatchObject({ sub: 'Last played Game 7', lastAppId: 7, appId: null });
    });
    it('keeps the status text when the last played game is unknown or not in the library', () => {
        const notInLibrary = () => '';
        expect(mapFriends([{ ...base[1], lastPlayedAppId: 7 }], notInLibrary)[0]).toMatchObject({ sub: 'Last online 4 weeks ago', lastAppId: null });
        expect(mapFriends([{ ...base[1], lastPlayedAppId: 0 }], name)[0]).toMatchObject({ sub: 'Last online 4 weeks ago', lastAppId: null });
        expect(mapFriends([base[1]], name)[0]).toMatchObject({ sub: 'Last online 4 weeks ago', lastAppId: null });
    });
    it('uses the cached last game for an offline friend, with its cached name when not in the library', () => {
        const last: LastGames = { [base[1].steamId]: { appId: 9, name: 'Cached Game', at: 1 } };
        expect(mapFriends([base[1]], name, 10, last)[0]).toMatchObject({ sub: 'Last played Game 9', lastAppId: 9 });
        // Its name is known from the cache, so the card shows that game (its art if Steam has it).
        expect(mapFriends([base[1]], () => '', 10, last)[0]).toMatchObject({ sub: 'Last played Cached Game', lastAppId: 9 });
        // A cached game without a name and not in the library falls back to the status text.
        const unnamed: LastGames = { [base[1].steamId]: { appId: 9, name: '', at: 1 } };
        expect(mapFriends([base[1]], () => '', 10, unnamed)[0].sub).toBe('Last online 4 weeks ago');
    });
    it('Steam\'s own last seen game wins over a stale cache entry', () => {
        const last: LastGames = { [base[1].steamId]: { appId: 9, name: 'Old', at: 1 } };
        expect(mapFriends([{ ...base[1], lastPlayedAppId: 7 }], name, 10, last)[0].sub).toBe('Last played Game 7');
    });
    it('an online friend not in a game reads Online and keeps the cache', () => {
        const last: LastGames = { [base[0].steamId]: { appId: 9, name: 'Cached Game', at: 1 } };
        const [card] = mapFriends([{ ...base[0], personaState: 1, onlineStatus: '' }], name, 10, last);
        expect(card).toMatchObject({ state: 'online', sub: 'Online' });
    });
    it('an away friend who was playing keeps showing that game, with its card; with nothing known, Away', () => {
        const last: LastGames = { [base[0].steamId]: { appId: 9, name: 'Cached Game', at: 1 } };
        expect(mapFriends([base[0]], name, 10, last)[0]).toMatchObject({ state: 'away', sub: 'Last played Game 9', lastAppId: 9 });
        expect(mapFriends([{ ...base[0], lastPlayedAppId: 7 }], name)[0]).toMatchObject({ state: 'away', sub: 'Last played Game 7', lastAppId: 7 });
        expect(mapFriends([base[0]], name)[0]).toMatchObject({ state: 'away', sub: 'Away', lastAppId: null });
        expect(mapFriends([{ ...base[0], onlineStatus: '' }], name)[0].sub).toBe('Away');
    });
    it('an in-game friend reads Playing even with a cache entry', () => {
        const last: LastGames = { [base[0].steamId]: { appId: 9, name: 'Cached Game', at: 1 } };
        expect(mapFriends([{ ...base[0], gameAppId: 42 }], name, 10, last)[0].sub).toBe('Playing Game 42');
    });
});

describe('observeLastGames', () => {
    const f = (id: string, extra: Partial<RawFriend> = {}): RawFriend => ({ ...base[0], steamId: id, gameAppId: 0, lastPlayedAppId: 0, ...extra });
    it('records an in-game friend with the library name, else Steam\'s name', () => {
        const a = observeLastGames({}, [f('1', { gameAppId: 42 }), f('2', { gameAppId: 43, gameName: 'Not Mine' })], (id) => (id === 42 ? 'Mine' : ''), 100);
        expect(a.changed).toBe(true);
        expect(a.map).toEqual({ '1': { appId: 42, name: 'Mine', at: 100 }, '2': { appId: 43, name: 'Not Mine', at: 100 } });
    });
    it('records Steam\'s last seen game, and a newer observation replaces the old game', () => {
        const prev: LastGames = { '1': { appId: 5, name: 'Old', at: 1 } };
        const a = observeLastGames(prev, [f('1', { lastPlayedAppId: 6 })], name, 200);
        expect(a.map['1']).toEqual({ appId: 6, name: 'Game 6', at: 200 });
        expect(prev['1'].appId).toBe(5);
    });
    it('keeps the cache for friends with nothing to report and reports no change', () => {
        const prev: LastGames = { '1': { appId: 5, name: 'Old', at: 1 } };
        const a = observeLastGames(prev, [f('1'), f('')], name, 200);
        expect(a.changed).toBe(false);
        expect(a.map).toBe(prev);
        // The same game seen again (not in game) is not a write.
        expect(observeLastGames({ '1': { appId: 6, name: 'Game 6', at: 1 } }, [f('1', { lastPlayedAppId: 6 })], name, 200).changed).toBe(false);
    });
    it('keeps the stored name when the same game is seen without a name, and re-stamps an in-game friend at most every 10 minutes', () => {
        const prev: LastGames = { '1': { appId: 5, name: 'Stored', at: 1 } };
        const a = observeLastGames(prev, [f('1', { gameAppId: 5 })], () => '', 1 + LAST_GAME_REFRESH_MS);
        expect(a.map['1']).toEqual({ appId: 5, name: 'Stored', at: 1 + LAST_GAME_REFRESH_MS });
        // Read again a few seconds later (Home polls the list): no write.
        const b = observeLastGames(a.map, [f('1', { gameAppId: 5 })], () => '', 3000 + LAST_GAME_REFRESH_MS);
        expect(b.changed).toBe(false);
        // A friend seen in a new game live is recorded at once.
        expect(observeLastGames(a.map, [f('1', { gameAppId: 6 })], name, 3000 + LAST_GAME_REFRESH_MS).map['1'].appId).toBe(6);
    });
    it('is bounded to the most recently observed friends', () => {
        const prev: LastGames = {};
        for (let i = 0; i < MAX_LAST_GAMES; i++) prev[`f${i}`] = { appId: 1, name: 'g', at: 10 + i };
        const a = observeLastGames(prev, [f('new', { gameAppId: 2 })], name, 5000);
        expect(Object.keys(a.map)).toHaveLength(MAX_LAST_GAMES);
        expect(a.map.new).toBeDefined();
        expect(a.map.f0).toBeUndefined();
        expect(a.map.f1).toBeDefined();
        expect(boundLastGames({ a: { appId: 1, name: '', at: 1 }, b: { appId: 1, name: '', at: 2 } }, 1)).toEqual({ b: { appId: 1, name: '', at: 2 } });
    });
});

describe('parseLastGames', () => {
    it('tolerates corrupt storage', () => {
        for (const bad of [null, undefined, 5, 'x', [], [1, 2], true]) expect(parseLastGames(bad)).toEqual({});
    });
    it('drops bad entries and keeps good ones', () => {
        const parsed = parseLastGames({
            ok: { appId: 7, name: 'Seven', at: 5 },
            noName: { appId: 8, at: 6 },
            zero: { appId: 0, name: 'x', at: 1 },
            frac: { appId: 1.5, name: 'x', at: 1 },
            str: 'nope',
            nul: null,
            noTime: { appId: 9, name: 'x' },
            nullTime: { appId: 9, name: 'x', at: null },
            boolId: { appId: true, name: 'x', at: 1 },
        });
        expect(parsed).toEqual({ ok: { appId: 7, name: 'Seven', at: 5 }, noName: { appId: 8, name: '', at: 6 } });
    });
    it('bounds an oversized stored map', () => {
        const big: Record<string, unknown> = {};
        for (let i = 0; i < MAX_LAST_GAMES + 20; i++) big[`f${i}`] = { appId: 1, name: '', at: i };
        expect(Object.keys(parseLastGames(big))).toHaveLength(MAX_LAST_GAMES);
    });
});

describe('onlineCount', () => {
    it('is 0 with no friends or all offline', () => {
        expect(onlineCount([])).toBe(0);
        expect(onlineCount([base[1], base[2]])).toBe(0);
    });
    it('counts online friends, offline excluded', () => {
        expect(onlineCount(base)).toBe(1);
        expect(onlineCount([base[0], { ...base[1], personaState: 3 }, base[2]])).toBe(2);
    });
    it('counts away and busy friends but not invisible ones (Steam\'s is_online)', () => {
        expect(onlineCount([{ ...base[1], personaState: 4 }, { ...base[1], personaState: 2 }, { ...base[1], personaState: 7 }])).toBe(2);
    });
    it('counts a friend in game as online', () => {
        expect(onlineCount([{ ...base[1], gameAppId: 42 }, base[2]])).toBe(1);
        expect(onlineCount([{ ...base[0], gameAppId: 42 }, base[0]])).toBe(2);
    });
});

describe('readFriends', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    it('returns an empty list when Steam globals are absent', () => {
        expect(readFriends()).toEqual([]);
    });
    it('reads the game Steam last saw a friend playing (m_nAppIDLastSeenPlaying), 0 when unset', () => {
        // Placeholder friends only; the field names are the ones probed on the Ally.
        vi.stubGlobal('friendStore', {
            allFriends: [
                { steamid64: '76561190000000001', display_name: 'Friend 1', localized_online_status: 'Online', m_nAppIDLastSeenPlaying: 7,
                    persona: { m_ePersonaState: 1, m_unGamePlayedAppID: 0, m_strGameExtraInfo: '' } },
                { steamid64: '76561190000000002', display_name: 'Friend 2', localized_online_status: 'Offline',
                    persona: { m_ePersonaState: 0, m_unGamePlayedAppID: 0 } },
            ],
        });
        const raw = readFriends();
        expect(raw.map((f) => f.lastPlayedAppId)).toEqual([7, 0]);
    });
});

describe('mapFriends join fields', () => {
    it('an in-game friend in a joinable game carries Steam\'s join url, the game name and whether it is owned', () => {
        const [card] = mapFriends([{ ...base[0], personaState: 1, gameAppId: 42, lobbyId: '109775241000000001', stateFlags: 0, serverIp: 0, connect: '' }], name);
        expect(card).toMatchObject({ state: 'ingame', game: 'Game 42', gameInLibrary: true, joinUrl: `steam://joinlobby/42/109775241000000001/${base[0].steamId}` });
        const [notOwned] = mapFriends([{ ...base[0], gameAppId: 43, gameName: 'Store Game', lobbyId: '0' }], () => '');
        expect(notOwned).toMatchObject({ game: 'Store Game', gameInLibrary: false, joinUrl: null });
        expect(mapFriends([{ ...base[1], lobbyId: '' }], name)[0].joinUrl).toBeNull(); // not in a game
    });
});

describe('friendsKey', () => {
    it('changes only when something a card or the badge shows changes', () => {
        const k = friendsKey(base);
        expect(friendsKey(base.map((f) => ({ ...f })))).toBe(k);
        expect(friendsKey([{ ...base[0], personaState: 1 }, base[1], base[2]])).not.toBe(k);
        expect(friendsKey([{ ...base[0], gameAppId: 5 }, base[1], base[2]])).not.toBe(k);
        expect(friendsKey([base[0], { ...base[1], lastPlayedAppId: 9 }, base[2]])).not.toBe(k);
        expect(friendsKey([base[1], base[0], base[2]])).not.toBe(k);
    });
});
