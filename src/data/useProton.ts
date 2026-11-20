import type { ProtonResult } from './protondb';
import { protonGames, type ProtonGame } from './protonGame';
import { useAsync } from '../hooks/useAsync';

/** ProtonDB results looked up this session, by app id. */
const memo = new Map<number, ProtonResult>();

/** Whether a result is kept for the session: not an unavailable one, nor a found one without details (only an old cache entry: a fetch always writes them; asked again once its refresh has). */
export function rememberProton(result: ProtonResult): boolean {
    return result.status === 'none' || (result.status === 'found' && !!result.details);
}

/** Puts a result Home's warm-up read or fetched where the chip reads it (as useProton keeps its own). Pure but for the memo. */
export function seedProton(appId: number, result: ProtonResult): boolean {
    if (!rememberProton(result)) return false;
    memo.set(appId, result);
    return true;
}

/** Whether a game's result is already in the memo (the warm-up skips it). */
export function protonKnown(appId: number): boolean {
    return memo.has(appId);
}

/** The key of the request to make, or null for none: not wanted, no app id, not ready, or already known. */
export function protonRequestKey(appId: number | null, wanted: boolean, ready: boolean, known: ProtonResult | undefined): string | null {
    return wanted && ready && appId !== null && !known ? `protondb:${appId}` : null;
}

/**
 * The game's ProtonDB result (a shortcut's by its Steam match, see protonGame), shared by Home and the game page. `wanted` gates everything (a known result is shown at
 * once, whatever `ready` says); `ready` additionally gates only the request (Home waits for the selection to rest).
 * Undefined while unknown or not wanted.
 */
export function useProton(game: ProtonGame | null, wanted: boolean, ready = true): ProtonResult | undefined {
    const appId = game?.appId ?? null;
    const known = wanted && appId !== null ? memo.get(appId) : undefined;
    const live = useAsync(protonRequestKey(appId, wanted, ready, known), async () => {
        const asked = game as ProtonGame; // the key is null without a game, so run only happens with one
        const result = await protonGames.lookup(asked);
        if (rememberProton(result)) memo.set(asked.appId, result);
        return result;
    });
    return wanted ? known ?? live : undefined;
}
