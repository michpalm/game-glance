import { describe, expect, it } from 'vitest';
import { PLUGIN_NAME } from '../src/constants';

describe('scaffold', () => {
    it('exposes the plugin name', () => {
        expect(PLUGIN_NAME).toBe('Game Glance');
    });
});
