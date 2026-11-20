import { useEffect, useState } from 'react';
import { lookupPlayers, type PlayerCount } from './playerCount';

/** Player counts known this session, by app id (Home's warm-up seeds it; Home and the game page read it). */
const memo = new Map<number, number>();

/** Keeps a found count (0 included) where the pill reads it; false for none or unavailable. */
export function seedPlayers(appId: number, result: PlayerCount): boolean {
    if (result.status !== 'found') return false;
    memo.set(appId, result.count);
    return true;
}
export function peekPlayers(appId: number): number | null {
    return memo.get(appId) ?? null;
}
export function playersKnown(appId: number): boolean {
    return memo.has(appId);
}
/** For tests. */
export function resetPlayersMemo(): void {
    memo.clear();
}

type Lookup = Pick<typeof lookupPlayers, 'cachedOnly' | 'prefetch'>;

/**
 * One refresh for the pill: the cached count at once, then Steam's when the cached one is older than `maxAgeMs`.
 * `onChange` runs when the memo's count for the app changed and `isCurrent()` still says the app is the one shown
 * (a late answer for the previous game only updates that game's slot).
 */
export async function refreshPlayers(appId: number, maxAgeMs: number, lookup: Lookup, onChange: () => void, isCurrent: () => boolean): Promise<void> {
    const show = (result: PlayerCount | null) => {
        const before = peekPlayers(appId);
        if (result && seedPlayers(appId, result) && peekPlayers(appId) !== before && isCurrent()) onChange();
    };
    show(await lookup.cachedOnly(appId));
    await lookup.prefetch(appId, maxAgeMs);
    show(await lookup.cachedOnly(appId));
}

/**
 * How many people play `appId` now (a Steam app; the caller passes null for a shortcut), or null when unknown or not
 * `enabled`. Refreshed when the count is older than `maxAgeMs`, and every `pollMs` while mounted when given.
 */
export function usePlayerCount(appId: number | null, opts: { maxAgeMs: number; pollMs?: number; enabled: boolean }): number | null {
    const { maxAgeMs, pollMs, enabled } = opts;
    const [, setVersion] = useState(0);
    useEffect(() => {
        if (!enabled || appId === null) return undefined;
        let live = true;
        const run = () => refreshPlayers(appId, maxAgeMs, lookupPlayers, () => setVersion((v) => v + 1), () => live).catch(() => undefined);
        void run();
        const timer = pollMs ? setInterval(() => void run(), pollMs) : undefined;
        return () => {
            live = false;
            if (timer !== undefined) clearInterval(timer);
        };
    }, [appId, enabled, maxAgeMs, pollMs]);
    return enabled && appId !== null ? peekPlayers(appId) : null;
}
