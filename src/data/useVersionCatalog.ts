import { useEffect, useSyncExternalStore } from 'react';
import { CatalogResult, versionCatalog } from './releaseCatalog';
import { Release } from './update';

interface CatalogState {
    releases: Release[];
    loading: boolean;
    stale: boolean;
    error: boolean;
}

/** Shared picker state; opening Quick Access alone does not fetch release history. */
export function createVersionCatalogStore(source: { load(force?: boolean): Promise<CatalogResult> }) {
    let state: CatalogState = { releases: [], loading: false, stale: false, error: false };
    const listeners = new Set<() => void>();
    let pending: Promise<void> | null = null;
    const emit = () => listeners.forEach((listener) => listener());
    const load = (force = false): Promise<void> => {
        if (pending) return pending;
        state = { ...state, loading: true, error: false };
        // Establish the pending request before notifying views, which can synchronously request a refresh.
        pending = source.load(force).then((result) => {
            state = { ...result, loading: false, error: result.stale };
        }, () => {
            state = { ...state, loading: false, stale: true, error: true };
        }).finally(() => { pending = null; emit(); });
        emit();
        return pending;
    };
    return {
        get: () => state,
        subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        load,
    };
}

const catalogStore = createVersionCatalogStore(versionCatalog);
export function useVersionCatalog(enabled: boolean) {
    const state = useSyncExternalStore(catalogStore.subscribe, catalogStore.get);
    useEffect(() => { if (enabled) void catalogStore.load(); }, [enabled]);
    return { ...state, refresh: () => { void catalogStore.load(true); } };
}
