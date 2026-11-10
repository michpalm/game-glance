import { lookupProton, ProtonResult } from './protondb';
import { useAsync } from '../hooks/useAsync';

/** ProtonDB results looked up this session, by app id. */
const memo = new Map<number, ProtonResult>();

/** Whether a result is kept for the session: not an unavailable one, nor a found one without details (only an old cache entry: a fetch always writes them; asked again once its refresh has). */
export function rememberProton(result: ProtonResult): boolean {
    return result.status === 'none' || (result.status === 'found' && !!result.details);
}

/** The key of the request to make, or null for none: not wanted, no app id, not ready, or already known. */
export function protonRequestKey(appId: number | null, wanted: boolean, ready: boolean, known: ProtonResult | undefined): string | null {
    return wanted && ready && appId !== null && !known ? `protondb:${appId}` : null;
}

/**
 * The game's ProtonDB result, shared by Home and the game page. `wanted` gates everything (a known result is shown at
 * once, whatever `ready` says); `ready` additionally gates only the request (Home waits for the selection to rest).
 * Undefined while unknown or not wanted.
 */
export function useProton(appId: number | null, wanted: boolean, ready = true): ProtonResult | undefined {
    const known = wanted && appId !== null ? memo.get(appId) : undefined;
    const live = useAsync(protonRequestKey(appId, wanted, ready, known), async () => {
        const id = appId as number; // the key is null without an app id, so run only happens with one
        const result = await lookupProton(id);
        if (rememberProton(result)) memo.set(id, result);
        return result;
    });
    return wanted ? known ?? live : undefined;
}
