import { useEffect, useState } from 'react';
import { familyPillLabel, selfFamilyLabel } from '../data/family';
import { subscribeLibraryUpdates } from '../logic/libraryPill';
import { loadFamilyCopyCount, peekFamilyCopyCount } from '../data/familyCopies';

export function familyCopyLabel(family: string | null, count: number): string | null {
    return family ?? (count > 1 ? selfFamilyLabel() : null);
}

/** Ownership is independent of which copy is selected, and can be queried from Home. */
export function useFamilyCopies(appId: number, active = true) {
    const [, setState] = useState({ appId: 0, count: 0, label: null as string | null });
    useEffect(() => {
        if (!active || !appId || appId < 0 || appId > 0x7fffffff) return;
        let alive = true;
        let request = 0;
        const steam = (globalThis as unknown as { SteamClient?: { FamilySharing?: { GetAvailableLenders?(id: number): Promise<unknown[]> }; Apps?: { RegisterForAppOverviewChanges?(cb: () => void): { unregister(): void } | void } } }).SteamClient;
        const update = async (refresh = false) => {
            const version = ++request;
            try {
                const count = await loadFamilyCopyCount(appId, refresh);
                if (!alive || version !== request) return;
                const label = familyCopyLabel(familyPillLabel(appId), count);
                setState((old) => old.appId === appId && old.count === count && old.label === label ? old : { appId, count, label });
            } catch { /* A missing family service leaves the borrowed-only label available. */ }
        };
        void update();
        const stop = subscribeLibraryUpdates(() => { void update(true); }, steam?.Apps?.RegisterForAppOverviewChanges?.bind(steam.Apps));
        return () => { alive = false; stop(); };
    }, [appId, active]);
    // Read this game's cache, never the previous selection's state. Labels remain live/localized.
    const count = peekFamilyCopyCount(appId) ?? 0;
    return { appId, count, label: familyCopyLabel(familyPillLabel(appId), count) };
}
