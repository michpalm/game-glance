import { routerHook } from '@decky/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settings } from '../../src/data/settings';
import { patchHomePage } from '../../src/patches/homePage';

afterEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
    await settings.setSpotlightHome(false);
});

describe('patchHomePage', () => {
    it('does not patch the Home route while Spotlight Home is off', () => {
        const unpatch = patchHomePage();
        expect(routerHook.addPatch).not.toHaveBeenCalled();
        unpatch();
    });

    it('patches /library/home when turned on and removes it when turned off', async () => {
        const unpatch = patchHomePage();
        await settings.setSpotlightHome(true);
        expect(routerHook.addPatch).toHaveBeenCalledTimes(1);
        expect(vi.mocked(routerHook.addPatch).mock.calls[0][0]).toBe('/library/home');
        await settings.setSpotlightHome(false);
        expect(routerHook.removePatch).toHaveBeenCalledTimes(1);
        unpatch();
    });

    it('never throws and returns an unpatch function when addPatch throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.mocked(routerHook.addPatch).mockImplementation(() => {
            throw new Error('boom');
        });
        await settings.setSpotlightHome(true);
        let unpatch: (() => void) | undefined;
        expect(() => {
            unpatch = patchHomePage();
        }).not.toThrow();
        expect(typeof unpatch).toBe('function');
        expect(() => unpatch?.()).not.toThrow();
    });

    it('unpatch never throws when removing the route patch throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const unpatch = patchHomePage();
        await settings.setSpotlightHome(true);
        vi.mocked(routerHook.removePatch).mockImplementation(() => {
            throw new Error('boom');
        });
        expect(() => unpatch()).not.toThrow();
    });
});
