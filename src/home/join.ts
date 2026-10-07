import type { RawFriend } from './friends';

/**
 * Joining a friend's game, as Steam's own friends menu does it (probed on the Ally, the friend context menu's
 * "Join Game"): the item shows when `persona.is_in_joinable_game` = has_joinable_game_flag (state flag 2) or
 * is_in_valid_lobby (lobby id not null and not "0") or has_server_ip; its JoinGame builds a steam:// url with
 * `(appid, accountid, connect_string, null, is_in_valid_lobby && lobby_id)`:
 *   lobby: steam://joinlobby/<appid>/<lobby>/<steamid64>
 *   else:  steam://rungame/<appid>/<steamid64>[/<encodeURIComponent(connect)>]
 * and opens it in the client. Only when the friend has the joinable flag but no connect string does Steam open its
 * own join dialog instead; Home leaves that case alone (no Join), so it never starts something Steam would not. Pure.
 */

/** Steam's EPersonaStateFlag "has joinable game" bit. */
export const JOINABLE_FLAG = 2;

/** Steam's persona.is_in_joinable_game, for a friend in a game. */
export function isJoinable(f: Pick<RawFriend, 'gameAppId' | 'stateFlags' | 'lobbyId' | 'serverIp'>): boolean {
    if (!(Number(f.gameAppId) > 0)) return false;
    const flag = ((Number(f.stateFlags) || 0) & JOINABLE_FLAG) !== 0;
    const lobby = f.lobbyId != null && f.lobbyId !== '0';
    return flag || lobby || (Number(f.serverIp) || 0) !== 0;
}

/** The url Steam's Join Game opens for this friend, or null when Home should not offer Join. */
export function joinUrl(f: Pick<RawFriend, 'steamId' | 'gameAppId' | 'stateFlags' | 'lobbyId' | 'serverIp' | 'connect'>): string | null {
    if (!isJoinable(f) || !/^\d+$/.test(f.steamId)) return null;
    const flag = ((Number(f.stateFlags) || 0) & JOINABLE_FLAG) !== 0;
    const connect = f.connect ?? '';
    if (flag && connect.length === 0) return null; // Steam shows its own join dialog here
    const app = Number(f.gameAppId);
    const lobby = f.lobbyId && f.lobbyId !== '0' ? f.lobbyId : '';
    if (lobby) return `steam://joinlobby/${app}/${lobby}/${f.steamId}`;
    return `steam://rungame/${app}/${f.steamId}${connect ? `/${encodeURIComponent(connect)}` : ''}`;
}

/** The confirm text under Steam's own "Join game" title and Join / Cancel buttons: just who and what, "Alex · Halo" (no sentence to translate). */
export function joinQuestion(name: string, game: string): string {
    return [name.trim(), game.trim()].filter(Boolean).join(' · ');
}
