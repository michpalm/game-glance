import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.resetModules();
    delete (globalThis as { SteamClient?: unknown }).SteamClient;
});

describe('Steam language', () => {
    it('is undefined until resolved, then readable synchronously', async () => {
        (globalThis as { SteamClient?: unknown }).SteamClient = { Settings: { GetCurrentLanguage: async () => 'dutch' } };
        const steam = await import('../../src/data/steam');
        expect(steam.peekSteamLanguage()).toBeUndefined();
        await steam.getSteamLanguage();
        expect(steam.peekSteamLanguage()).toBe('dutch');
    });
    it('falls back to english when Steam does not answer', async () => {
        const steam = await import('../../src/data/steam');
        expect(await steam.getSteamLanguage()).toBe('english');
        expect(steam.peekSteamLanguage()).toBe('english');
    });
});
