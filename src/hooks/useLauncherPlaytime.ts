import { lutrisPlaytime } from '../data/lutrisPlaytime';
import { UnifideckPlaytime } from '../data/unifideckPlaytime';
import { LutrisRef } from '../logic/lutris';
import { useAsync } from './useAsync';
import { useUnifideckPlaytime } from './useUnifideckPlaytime';

/**
 * The launcher's own record of a shortcut's play time, Unifideck's or Lutris's (null/undefined for other games and until
 * it answers). `mergePlaytime` prefers it over Steam's.
 */
export function useLauncherPlaytime(appId: number | null, isShortcut: boolean, lutris: LutrisRef | null, active = true): UnifideckPlaytime | null | undefined {
    const unifideck = useUnifideckPlaytime(appId, isShortcut, active);
    const fromLutris = useAsync(active && lutris ? `lutris:${lutris.gameId}:${lutris.flatpak}` : null, () => lutrisPlaytime(lutris!));
    return unifideck ?? fromLutris;
}
