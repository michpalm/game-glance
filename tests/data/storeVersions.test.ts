import { describe, expect, it, vi, afterEach } from 'vitest';
import { storeVersions } from '../../src/data/storeVersions';
import { familyCopyLabel } from '../../src/hooks/useFamilyCopies';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Home copy pills', () => {
    it('keeps the family pill when your own copy is selected and there are other copies', () => {
        vi.stubGlobal('friendStore', { m_FriendsUIFriendStore: { self: { display_name: 'Player' } } });
        expect(familyCopyLabel(null, 2)).toBe('Family Sharing · Player');
        expect(familyCopyLabel(null, 1)).toBeNull();
        expect(familyCopyLabel('Family Sharing · Friend', 1)).toBe('Family Sharing · Friend');
    });
    it('finds Unifideck versions from a Steam or signed/unsigned shortcut ID', () => {
        const raw = { success: true, data: [{ app_id: -2, store: 'gog', steam_owned_app_id: 123 }] };
        expect(storeVersions(raw, 123).map((v) => v.store)).toEqual(['steam', 'gog']);
        expect(storeVersions(raw, 4294967294)).toEqual(storeVersions(raw, -2));
        expect(storeVersions(raw, 456)).toEqual([]);
    });
    it('uses explicit groups, deduplicates Steam versions, and ignores unavailable or singleton data', () => {
        const data = [{ app_id: -1, store: 'gog', dedupe_group_id: 'one', steam_owned_app_id: 123 }, { app_id: -2, store: 'epic', dedupe_group_id: 'one', steam_versions: [{ app_id: 123 }] }];
        expect(storeVersions({ success: true, data }, -1)).toHaveLength(3);
        expect(storeVersions({ success: false, data }, -1)).toEqual([]);
        expect(storeVersions([{ app_id: -3, store: 'gog' }], -3)).toEqual([]);
    });
});

describe('resolved store versions', () => {
    it('exposes known groups synchronously for the next selected game, retaining them during refresh', async () => {
        const { loadStoreVersions, peekStoreVersions } = await import('../../src/data/storeVersions');
        let answer!: (v: unknown) => void;
        const backend = vi.fn(() => new Promise(resolve => { answer = resolve; }));
        vi.stubGlobal('DeckyBackend', { call: backend });
        expect(peekStoreVersions(201)).toBeUndefined();
        const pending = loadStoreVersions(201);
        answer({ success: true, data: [{ app_id: 301, store: 'gog', steam_owned_app_id: 201 }] });
        await pending;
        expect(peekStoreVersions(201)?.map(v => v.store)).toEqual(['steam', 'gog']);
        expect(peekStoreVersions(301)).toEqual(peekStoreVersions(201));
        expect(peekStoreVersions(202)).toEqual([]);
        expect(backend).toHaveBeenCalledOnce();
        vi.useFakeTimers(); vi.setSystemTime(Date.now() + 30_001);
        const refresh = loadStoreVersions(201);
        expect(peekStoreVersions(201)?.map(v => v.store)).toEqual(['steam', 'gog']);
        answer({ success: true, data: [] }); await refresh;
        expect(peekStoreVersions(201)).toEqual([]);
        expect(backend).toHaveBeenCalledTimes(2);
    });
});
