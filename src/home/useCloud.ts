import { useEffect, useState } from 'react';
import { CloudState, sameCloud } from './cloud';
import { unifideckCloudForApp } from '../data/unifideckCloud';
import { readCloud } from './steamCloud';
import { pageHidden } from './pageVisible';

/** How often the selected game's cloud state is read (an in-memory lookup in Steam's details store). */
const CLOUD_POLL_MS = 1000;

/** How often a Unifideck game's cloud-save state is asked for again (its backend can be slow; the data cache holds 10 s). */
const UNIFIDECK_CLOUD_POLL_MS = 15_000;

/** A Unifideck game's cloud-save state (data/unifideckCloud), asked only while `active` (Steam has none for the game); null otherwise. */
function useUnifideckCloud(appId: number | null, active: boolean): CloudState | null {
    const [state, setState] = useState<{ id: number | null; cloud: CloudState | null }>({ id: null, cloud: null });
    useEffect(() => {
        if (appId === null || !active) return undefined;
        let live = true;
        const tick = () => {
            if (pageHidden()) return;
            void unifideckCloudForApp(appId).then((cloud) => {
                if (live) setState((old) => (old.id === appId && sameCloud(old.cloud, cloud) ? old : { id: appId, cloud }));
            });
        };
        tick();
        const timer = setInterval(tick, UNIFIDECK_CLOUD_POLL_MS);
        return () => {
            live = false;
            clearInterval(timer);
        };
    }, [appId, active]);
    return active && state.id === appId ? state.cloud : null;
}

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
    const steam = state.id === appId ? state.cloud : null;
    // Steam shows none for a Unifideck game (a shortcut): its own cloud saves stand in.
    const unifideck = useUnifideckCloud(appId, steam === null);
    return steam ?? unifideck;
}
