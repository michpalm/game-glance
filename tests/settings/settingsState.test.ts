import { describe, expect, it } from 'vitest';
import { settingsGateChoice, settingsMemory } from '../../src/settings/settingsState';

describe('settingsGateChoice', () => {
    it('ours only on the bare /settings', () => {
        expect(settingsGateChoice({ enabled: true, path: '/settings' })).toBe('ours');
        expect(settingsGateChoice({ enabled: true, path: '/settings/' })).toBe('ours');
        expect(settingsGateChoice({ enabled: true, path: '/settings/display' })).toBe('native');
        expect(settingsGateChoice({ enabled: true, path: '/settings/controller/30/0' }, 'ours')).toBe('native');
    });
    it('the switch off, or an unknown path, is Steam\'s', () => {
        expect(settingsGateChoice({ enabled: false, path: '/settings' })).toBe('native');
        expect(settingsGateChoice({ enabled: true, path: null })).toBe('native');
    });
    it('leaving the route keeps the previous choice (no flash)', () => {
        expect(settingsGateChoice({ enabled: true, path: '/library/home' }, 'ours')).toBe('ours');
        expect(settingsGateChoice({ enabled: true, path: '/library/home' }, 'native')).toBe('native');
    });
});

describe('settingsMemory (Review Focus 4)', () => {
    it('starts on Display and remembers the entry left on', () => {
        expect(settingsMemory.get().focus).toBe('display');
        settingsMemory.remember({ focus: 'cloud' });
        expect(settingsMemory.get().focus).toBe('cloud');
    });
});
