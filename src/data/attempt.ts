import { LOG_PREFIX } from '../constants';

/** Runs a storage/backend operation; on failure logs and returns `fallback` (a cache miss, not an error). */
export async function attempt<T>(what: string, op: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await op();
    } catch (error) {
        console.warn(`${LOG_PREFIX} ${what} failed`, error);
        return fallback;
    }
}
