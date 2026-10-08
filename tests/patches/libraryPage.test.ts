import { routerHook } from '@decky/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settings } from '../../src/data/settings';
import { patchLibraryPage } from '../../src/patches/libraryPage';

afterEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(routerHook.addPatch).mockReset();
    vi.mocked(routerHook.removePatch).mockReset();
    await settings.setSpotlightLibrary(false);
});

describe('patchLibraryPage', () => {
    it('does not patch the Library route while Spotlight Library is off', () => {
        const unpatch = patchLibraryPage();
        expect(routerHook.addPatch).not.toHaveBeenCalled();
        unpatch();
    });

    it('patches library routes when turned on and removes them when turned off', async () => {
        const unpatch = patchLibraryPage();
        await settings.setSpotlightLibrary(true);
        expect(routerHook.addPatch).toHaveBeenCalled();
        const routes = vi.mocked(routerHook.addPatch).mock.calls.map((c) => c[0]);
        expect(routes).toContain('/library/games');
        expect(routes).toContain('/library/all');
        expect(routes).toContain('/library');

        await settings.setSpotlightLibrary(false);
        expect(routerHook.removePatch).toHaveBeenCalled();
        unpatch();
    });

    it('never throws and returns an unpatch function when addPatch throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.mocked(routerHook.addPatch).mockImplementation(() => {
            throw new Error('boom');
        });
        await settings.setSpotlightLibrary(true);
        let unpatch: (() => void) | undefined;
        expect(() => {
            unpatch = patchLibraryPage();
        }).not.toThrow();
        expect(typeof unpatch).toBe('function');
        expect(() => unpatch?.()).not.toThrow();
    });
});
