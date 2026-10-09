import { describe, expect, it, vi } from 'vitest';
import { parseInstalled, unifideckInstalled } from '../../src/data/unifideckInstalled';

describe('Unifideck install state', () => {
    it('reads installed from get_game_info’s record', () => {
        expect(parseInstalled({ success: true, data: { installed: true } })).toBe(true);
        expect(parseInstalled({ success: true, data: { installed: false } })).toBe(false);
        for (const bad of [{ success: true, data: null }, { success: true, data: {} }, { success: false, data: { installed: true } }, null, 'x']) expect(parseInstalled(bad)).toBeNull();
    });
    it('asks get_game_info with the app id; null for a non-Unifideck shortcut or on errors', async () => {
        const call = vi.fn(async () => ({ success: true, data: { installed: false } }));
        expect(await unifideckInstalled(3132309150, { backend: { call }, key: async () => ({ store: 'gog', id: '1' }) })).toBe(false);
        expect(call).toHaveBeenCalledWith('loader/call_plugin_method', 'Unifideck', 'get_game_info', 3132309150);
        expect(await unifideckInstalled(1, { backend: { call }, key: async () => null })).toBeNull();
        expect(await unifideckInstalled(2, { backend: { call: async () => { throw new Error('x'); } }, key: async () => ({ store: 'gog', id: '1' }) })).toBeNull();
    });
});
