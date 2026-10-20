import { describe, expect, it, vi, afterEach } from 'vitest';
import { storeVersions } from '../../src/data/storeVersions';
import { familyCopyLabel } from '../../src/hooks/useFamilyCopies';

afterEach(() => vi.unstubAllGlobals());

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
