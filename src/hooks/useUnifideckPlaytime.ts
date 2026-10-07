import { UnifideckPlaytime, unifideckPlaytimeForApp } from '../data/unifideckPlaytime';
import { useAsync } from './useAsync';

/** Unifideck's play time for one shortcut (null/undefined for other games and until it answers); asks once per game and key change, cached. */
export function useUnifideckPlaytime(appId: number | null, isShortcut: boolean, active = true): UnifideckPlaytime | null | undefined {
    return useAsync(active && isShortcut && appId !== null && appId !== 0 ? `uni:${appId}` : null, () => unifideckPlaytimeForApp(appId ?? 0));
}
