import { describe, expect, it } from 'vitest';
import { storeIconKey } from '../../src/logic/storeIcon';

describe('storeIconKey', () => {
    it('maps every store label the plugin shows to its store', () => {
        expect(storeIconKey('Steam')).toBe('steam');
        expect(storeIconKey('GOG')).toBe('gog');
        expect(storeIconKey('Epic')).toBe('epic');
        expect(storeIconKey('Amazon')).toBe('amazon');
        expect(storeIconKey('Ubisoft')).toBe('ubisoft');
        expect(storeIconKey('Xbox Cloud')).toBe('xbox');
        expect(storeIconKey('Battle.net')).toBe('battlenet');
        expect(storeIconKey('Heroic')).toBe('heroic');
    });
    it('uses a generic icon for other shortcuts and unknown stores', () => {
        expect(storeIconKey('Non-Steam')).toBe('generic');
        expect(storeIconKey('Itch')).toBe('generic');
        expect(storeIconKey('')).toBe('generic');
    });
});
