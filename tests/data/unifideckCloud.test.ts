import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUnifideckPlaytime } from '../../src/data/unifideckPlaytime';
import { parseCloudStatus, resetUnifideckCloud, unifideckCloudForApp, unifideckCloudState } from '../../src/data/unifideckCloud';

const base = { supported: true, in_progress: false, cloud_supported: null, save_path_resolved: true, has_local_saves: true, has_cloud_saves: true, local_snapshot: { timestamp: 1000 }, remote_snapshot: { timestamp: 1001 } };

describe('unifideckCloudState (Unifideck’s own button logic)', () => {
    it('local and cloud within 2 s: in sync, green', () => {
        expect(unifideckCloudState(base)).toMatchObject({ tone: 'ok', icon: { uploaded: true }, action: 'none', label: 'Cloud saves: synced' });
    });
    it('a save that differs by more than 2 s, a cloud-only save, or a local-only save: busy tone with the save icon', () => {
        expect(unifideckCloudState({ ...base, remote_snapshot: { timestamp: 1010 } })).toMatchObject({ tone: 'busy', icon: { save: true } });
        expect(unifideckCloudState({ ...base, has_local_saves: false })?.label).toBe('Cloud saves: out of sync');
        expect(unifideckCloudState({ ...base, has_cloud_saves: false, remote_snapshot: null })?.label).toBe('Cloud saves: out of sync');
    });
    it('syncing wins; an unresolved save folder is flagged; nothing saved yet is neutral', () => {
        expect(unifideckCloudState({ ...base, in_progress: true })?.label).toBe('Cloud saves: syncing');
        expect(unifideckCloudState({ ...base, save_path_resolved: false })).toMatchObject({ tone: 'bad', icon: { error: true } });
        expect(unifideckCloudState({ ...base, has_local_saves: false, has_cloud_saves: false, remote_snapshot: null })).toMatchObject({ tone: 'off', icon: {} });
    });
    it('no button for a store without cloud saves, a game without cloud support, or no status', () => {
        expect(unifideckCloudState({ ...base, supported: false })).toBeNull();
        expect(unifideckCloudState({ ...base, cloud_supported: false })).toBeNull();
        expect(unifideckCloudState(null)).toBeNull();
    });
});

describe('parseCloudStatus / unifideckCloudForApp', () => {
    beforeEach(() => { resetUnifideckCloud(); resetUnifideckPlaytime(); });
    const key = async () => ({ store: 'gog', id: '1450711444' });
    it('takes the data of a successful reply only', () => {
        expect(parseCloudStatus({ success: true, data: base })).toBe(base);
        for (const bad of [{ success: false, data: base }, { success: true }, null, 'x']) expect(parseCloudStatus(bad)).toBeNull();
    });
    it('asks get_cloud_save_status with the store and id, once for concurrent calls', async () => {
        const b = { call: vi.fn(async () => ({ success: true, data: base })) };
        const deps = { backend: b, key, now: () => 1 };
        const [a, c] = await Promise.all([unifideckCloudForApp(5, deps), unifideckCloudForApp(5, deps)]);
        expect(a?.tone).toBe('ok');
        expect(c?.tone).toBe('ok');
        expect(b.call).toHaveBeenCalledTimes(1);
        expect(b.call).toHaveBeenCalledWith('loader/call_plugin_method', 'Unifideck', 'get_cloud_save_status', 'gog', '1450711444');
    });
    it('is null for a non-Unifideck shortcut and on errors', async () => {
        expect(await unifideckCloudForApp(6, { backend: { call: vi.fn() }, key: async () => null })).toBeNull();
        expect(await unifideckCloudForApp(7, { backend: { call: vi.fn(async () => { throw new Error('x'); }) }, key })).toBeNull();
    });
});
