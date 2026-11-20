import { lookupProton, type ProtonResult } from './protondb';
import { cachedSteamAppId, findSteamAppId } from './shortcutDescription';

/** A game as ProtonDB is asked about it: a Steam game by its app id, a shortcut by its name. */
export interface ProtonGame {
    appId: number;
    name: string;
    isShortcut: boolean;
}

export interface ProtonGameDeps {
    /** The shortcut's Steam match: cached, else Steam's store search (misses are remembered too). */
    find(name: string): Promise<number | null>;
    /** The remembered match only: undefined when the name was never matched. */
    cachedMatch(name: string): Promise<number | null | undefined>;
    lookup(steamAppId: number): Promise<ProtonResult>;
    cachedOnly(steamAppId: number): Promise<ProtonResult | null>;
    prefetch(steamAppId: number): Promise<{ status: ProtonResult['status']; fetched: boolean }>;
}

const NONE: ProtonResult = { status: 'none' };

/**
 * ProtonDB only knows Steam games. A shortcut (a Unifideck or Heroic game, say) is asked about as the Steam game with
 * exactly its name: the match its description already uses, so ProtonDB Badges and Game Glance agree. A shortcut with no
 * such Steam game reads as "no rating"; one whose match could not be made (Steam unreachable) reads as unavailable, so
 * it is asked again rather than remembered.
 */
export function createProtonGames(deps: ProtonGameDeps) {
    /** The Steam app id to ask with: null for a remembered miss, undefined when no match could be made. */
    async function steamId(game: ProtonGame, online: boolean): Promise<{ id: number | null | undefined; matched: boolean }> {
        if (!game.isShortcut) return { id: game.appId, matched: false };
        const known = await deps.cachedMatch(game.name);
        if (known !== undefined || !online) return { id: known, matched: false };
        const found = await deps.find(game.name);
        // find answers null both for a miss (now remembered) and for a failed search (not remembered).
        return { id: found ?? (await deps.cachedMatch(game.name)), matched: true };
    }

    async function lookup(game: ProtonGame): Promise<ProtonResult> {
        const { id } = await steamId(game, true);
        if (id === undefined) return { status: 'unavailable' };
        return id === null ? NONE : deps.lookup(id);
    }

    /** The cached answer only, never online: null when nothing is cached (nor the shortcut's match). */
    async function cachedOnly(game: ProtonGame): Promise<ProtonResult | null> {
        const { id } = await steamId(game, false);
        if (id === undefined) return null;
        return id === null ? NONE : deps.cachedOnly(id);
    }

    /** For the pre-loads: as lookupProton.prefetch; matching a shortcut's name online counts as fetched. */
    async function prefetch(game: ProtonGame): Promise<{ status: ProtonResult['status']; fetched: boolean }> {
        const { id, matched } = await steamId(game, true);
        if (id === undefined) return { status: 'unavailable', fetched: matched };
        if (id === null) return { status: 'none', fetched: matched };
        const result = await deps.prefetch(id);
        return { status: result.status, fetched: result.fetched || matched };
    }

    return { lookup, cachedOnly, prefetch };
}

export const protonGames = createProtonGames({
    find: (name) => findSteamAppId(name),
    cachedMatch: (name) => cachedSteamAppId(name),
    lookup: (appId) => lookupProton(appId),
    cachedOnly: (appId) => lookupProton.cachedOnly(appId),
    prefetch: (appId) => lookupProton.prefetch(appId),
});
