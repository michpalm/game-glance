import { useEffect, useState } from 'react';
import { unifideckInstalled } from '../data/unifideckInstalled';
import { pageHidden } from '../home/pageVisible';

/** How often the install state is asked again (an install or an uninstall finishing changes it). */
const POLL_MS = 4000;

/** A Unifideck game's install state: true / false, null when it is not a Unifideck game or unknown, undefined until first answered. Only while `active`. */
export function useUnifideckInstalled(appId: number | null, active: boolean): boolean | null | undefined {
    const [state, setState] = useState<{ id: number; installed: boolean | null } | undefined>(undefined);
    useEffect(() => {
        if (!active || appId === null || appId === 0) return undefined;
        let live = true;
        const tick = () => {
            if (pageHidden()) return;
            void unifideckInstalled(appId).then((installed) => {
                if (live) setState((old) => (old && old.id === appId && old.installed === installed ? old : { id: appId, installed }));
            });
        };
        tick();
        const timer = setInterval(tick, POLL_MS);
        return () => {
            live = false;
            clearInterval(timer);
        };
    }, [appId, active]);
    return active && state?.id === appId ? state.installed : undefined;
}
