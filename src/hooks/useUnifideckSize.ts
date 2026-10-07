import { unifideckGameSize } from '../data/unifideckSize';
import { useAsync } from './useAsync';

/** A Unifideck game's size in bytes (null when unknown; undefined for other games and until it answers); refetched when the install state changes. */
export function useUnifideckSize(appId: number | null, isShortcut: boolean, installed: boolean, active = true): number | null | undefined {
    return useAsync(active && isShortcut && appId !== null && appId !== 0 ? `unisize:${appId}:${installed ? 1 : 0}` : null, () => unifideckGameSize(appId ?? 0, installed));
}
