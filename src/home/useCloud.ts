import { useEffect, useState } from 'react';
import { CloudState, sameCloud } from './cloud';
import { readCloud } from './steamCloud';
import { pageHidden } from './pageVisible';

/** How often the selected game's cloud state is read (an in-memory lookup in Steam's details store). */
const CLOUD_POLL_MS = 1000;

/**
 * The selected game's Steam Cloud state, kept live by a cheap poll (like useDownload's). null: no game, or the game
 * page would show no cloud status. A state read for the previous game is never shown for the new one.
 */
export function useCloud(appId: number | null): CloudState | null {
    const read = () => ({ id: appId, cloud: appId === null ? null : readCloud(appId) });
    const [state, setState] = useState(read);
    useEffect(() => {
        const tick = () => setState((old) => {
            const next = read();
            return old.id === next.id && sameCloud(old.cloud, next.cloud) ? old : next;
        });
        tick();
        if (appId === null) return undefined;
        const timer = setInterval(() => { if (!pageHidden()) tick(); }, CLOUD_POLL_MS);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appId]);
    return state.id === appId ? state.cloud : null;
}
