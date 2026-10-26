import { describe, expect, it } from 'vitest';
import { createVersionCatalogStore } from '../../src/data/useVersionCatalog';
const a = { version: '3.5.0', url: 'https://github.com/a.zip', sha256: '' };

describe('version picker state', () => {
    it('loads only on request and keeps cached releases when refresh fails', async () => {
        let calls = 0;
        const store = createVersionCatalogStore({ load: async () => {
            calls++;
            if (calls > 1) throw Error('offline');
            return { releases: [a], stale: false };
        } });
        expect(calls).toBe(0);
        await store.load();
        expect(store.get()).toMatchObject({ releases: [a], loading: false, error: false });
        await store.load(true);
        expect(store.get()).toMatchObject({ releases: [a], loading: false, stale: true, error: true });
    });
    it('shares a pending load and notifies only subscribed views', async () => {
        let resolve!: (value: { releases: typeof a[]; stale: boolean }) => void;
        let calls = 0;
        const store = createVersionCatalogStore({ load: () => { calls++; return new Promise((r) => { resolve = r; }); } });
        let updates = 0;
        const off = store.subscribe(() => { updates++; });
        const first = store.load();
        const second = store.load(true);
        expect(calls).toBe(1);
        expect(store.get().loading).toBe(true);
        off();
        resolve({ releases: [a], stale: false });
        await Promise.all([first, second]);
        expect(updates).toBe(1);
        expect(store.get().releases).toEqual([a]);
    });
    it('replaces a removed release without selecting another one', async () => {
        let calls = 0;
        const store = createVersionCatalogStore({ load: async () => ({ releases: ++calls === 1 ? [a] : [], stale: false }) });
        await store.load();
        await store.load(true);
        expect(store.get().releases.find((r) => r.version === a.version)).toBeUndefined();
    });
});
