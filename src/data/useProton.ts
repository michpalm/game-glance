import { lookupProton, ProtonResult } from './protondb';
import { useAsync } from '../hooks/useAsync';

/** ProtonDB ratings looked up this session, by app id (an unavailable lookup is not kept: it is asked again). */
const memo = new Map<number, ProtonResult>();

/**
 * The game's ProtonDB result, shared by Home and the game page. Asked only when `wanted` (and there is an app id), once
 * per game per session; undefined while unknown or not wanted.
 */
export function useProton(appId: number | null, wanted: boolean): ProtonResult | undefined {
    const known = wanted && appId !== null ? memo.get(appId) : undefined;
    const live = useAsync(wanted && appId !== null && !known ? `protondb:${appId}` : null, async () => {
        const result = await lookupProton(appId ?? 0);
        if (appId !== null && result.status !== 'unavailable') memo.set(appId, result);
        return result;
    });
    return wanted ? known ?? live : undefined;
}
