import { LOG_PREFIX } from '../constants';

/** A failed lookup is retried at most this often (Steam may not have loaded the module yet), never on every render. */
export const LOOKUP_RETRY_MS = 60_000;

/**
 * Memoises a lookup of one of Steam's internals: a success is kept for the session; a miss (null, undefined or a
 * throw) is remembered and the lookup is tried again at most once per `retryMs`. Never throws.
 */
export function memoLookup<T>(what: string, find: () => T | null | undefined, now: () => number = Date.now, retryMs = LOOKUP_RETRY_MS): () => T | null {
    let found: T | null = null;
    let lastMiss = Number.NEGATIVE_INFINITY;
    return () => {
        if (found !== null) return found;
        const t = now();
        if (t - lastMiss < retryMs) return null;
        try {
            found = find() ?? null;
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: could not find Steam's ${what}`, error);
            found = null;
        }
        if (found === null) lastMiss = t;
        return found;
    };
}
