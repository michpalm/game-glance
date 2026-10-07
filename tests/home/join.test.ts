import { describe, expect, it } from 'vitest';
import type { RawFriend } from '../../src/home/friends';
import { isJoinable, joinQuestion, joinUrl } from '../../src/home/join';
import fixture from './fixtures/friends.json';

// Field shapes as probed on the Ally (m_unPersonaStateFlags 513 / 0, m_game_lobby_id "0" or "", m_unGameServerIP 0).
const base = { ...(fixture as RawFriend[])[0], steamId: '76561190000000001', gameAppId: 0, stateFlags: 0, lobbyId: '0', serverIp: 0, connect: '' };

describe('isJoinable (Steam\'s is_in_joinable_game, in a game)', () => {
    it('needs a game, then the joinable flag, a lobby or a server', () => {
        expect(isJoinable({ ...base, stateFlags: 2 })).toBe(false); // not in a game
        expect(isJoinable({ ...base, gameAppId: 10 })).toBe(false);
        expect(isJoinable({ ...base, gameAppId: 10, stateFlags: 513 })).toBe(false); // 513 has no bit 2
        expect(isJoinable({ ...base, gameAppId: 10, stateFlags: 2 })).toBe(true);
        expect(isJoinable({ ...base, gameAppId: 10, lobbyId: '109775241000000001' })).toBe(true);
        expect(isJoinable({ ...base, gameAppId: 10, serverIp: 3232235777 })).toBe(true);
        // Steam treats an empty lobby id as a lobby (null != "" and "0" != ""), so does Home.
        expect(isJoinable({ ...base, gameAppId: 10, lobbyId: '' })).toBe(true);
    });
});

describe('joinUrl (the url Steam\'s Join Game opens)', () => {
    it('a lobby: steam://joinlobby/app/lobby/steamid', () => {
        expect(joinUrl({ ...base, gameAppId: 10, lobbyId: '109775241000000001' })).toBe('steam://joinlobby/10/109775241000000001/76561190000000001');
    });
    it('a server or connect string: steam://rungame/app/steamid[/connect]', () => {
        expect(joinUrl({ ...base, gameAppId: 10, serverIp: 1 })).toBe('steam://rungame/10/76561190000000001');
        expect(joinUrl({ ...base, gameAppId: 10, stateFlags: 2, connect: '+connect 1.2.3.4:27015' })).toBe('steam://rungame/10/76561190000000001/%2Bconnect%201.2.3.4%3A27015');
        expect(joinUrl({ ...base, gameAppId: 10, lobbyId: '' })).toBe('steam://rungame/10/76561190000000001');
    });
    it('no Join where Steam would open its own dialog (flag without connect) or nothing is joinable', () => {
        expect(joinUrl({ ...base, gameAppId: 10, stateFlags: 2 })).toBeNull();
        expect(joinUrl({ ...base, gameAppId: 10 })).toBeNull();
        expect(joinUrl({ ...base, gameAppId: 0, serverIp: 1 })).toBeNull();
        expect(joinUrl({ ...base, steamId: 'x', gameAppId: 10, serverIp: 1 })).toBeNull();
    });
});

describe('joinQuestion', () => {
    it('names the friend and the game', () => {
        expect(joinQuestion('Alex', 'Halo')).toBe('Alex · Halo');
        expect(joinQuestion('Alex', '')).toBe('Alex');
        expect(joinQuestion('', 'Halo')).toBe('Halo');
        expect(joinQuestion(' ', ' ')).toBe('');
    });
});
