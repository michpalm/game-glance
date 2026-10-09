import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCache } from '../../src/data/cache';
import { memoryKv } from '../../src/data/kv';
import { checkForUpdate, installUpdate, isNewer, LATEST_TTL_MS, latestReleases, parseVersion, pickRelease, resetUpdateCheck, UPDATE_CHECK_EVERY_MS } from '../../src/data/update';

const SHA = 'a'.repeat(64);
const release = (over: Record<string, unknown> = {}) => ({
    tag_name: 'v2.1.0',
    draft: false,
    prerelease: false,
    assets: [
        { name: 'other.zip', browser_download_url: 'https://github.com/x/other.zip' },
        { name: 'game-glance.zip', browser_download_url: 'https://github.com/michpalm/game-glance/releases/download/v2.1.0/game-glance.zip', digest: `sha256:${SHA}` },
    ],
    ...over,
});

describe('versions', () => {
    it('parses tags with or without a v, ignoring a pre-release or build suffix', () => {
        expect(parseVersion('v2.1.0')).toEqual([2, 1, 0]);
        expect(parseVersion('2.0.10')).toEqual([2, 0, 10]);
        expect(parseVersion('v3.0.0-beta.1')).toEqual([3, 0, 0]);
        for (const bad of ['', 'latest', 'v', '2..1', null, 7]) expect(parseVersion(bad)).toBeNull();
    });
    it('compares numerically, part by part', () => {
        expect(isNewer('2.0.10', '2.0.9')).toBe(true);
        expect(isNewer('v2.1.0', '2.0.0')).toBe(true);
        expect(isNewer('2.0.0', '2.0.0')).toBe(false);
        expect(isNewer('2.1', '2.1.0')).toBe(false);
        expect(isNewer('1.9.9', '2.0.0')).toBe(false);
        expect(isNewer('nonsense', '2.0.0')).toBe(false);
    });
});

describe('pickRelease', () => {
    it('takes the zip, its download url and the SHA-256 from GitHub\'s digest', () => {
        expect(pickRelease(release())).toEqual({
            version: '2.1.0',
            url: 'https://github.com/michpalm/game-glance/releases/download/v2.1.0/game-glance.zip',
            sha256: SHA,
        });
    });
    it('no digest (older releases): an empty hash, which Decky accepts', () => {
        const assets = [{ name: 'game-glance.zip', browser_download_url: 'https://github.com/a/game-glance.zip' }];
        expect(pickRelease(release({ assets }))?.sha256).toBe('');
    });
    it('a zip uploaded under a versioned name (v2.0.0\'s game-glance-v2.0.0.zip) counts too; the plain name wins', () => {
        const versioned = { name: 'game-glance-v2.0.0.zip', browser_download_url: 'https://github.com/michpalm/game-glance/releases/download/v2.0.0/game-glance-v2.0.0.zip', digest: `sha256:${SHA}` };
        expect(pickRelease(release({ tag_name: 'v2.0.0', assets: [versioned] }))).toEqual({ version: '2.0.0', url: versioned.browser_download_url, sha256: SHA });
        expect(pickRelease(release({ assets: [versioned, ...release().assets] }))?.url).toBe('https://github.com/michpalm/game-glance/releases/download/v2.1.0/game-glance.zip');
        expect(pickRelease(release({ assets: [{ name: 'game-glance-source.zip', browser_download_url: 'https://github.com/x/s.zip' }] }))).toBeNull();
    });
    it('nothing installable: drafts, pre-releases, no zip, a non-https url, a bad tag or junk', () => {
        expect(pickRelease(release({ draft: true }))).toBeNull();
        expect(pickRelease(release({ prerelease: true }))).toBeNull();
        expect(pickRelease(release({ assets: [] }))).toBeNull();
        expect(pickRelease(release({ assets: [{ name: 'game-glance.zip', browser_download_url: 'http://x/game-glance.zip' }] }))).toBeNull();
        expect(pickRelease(release({ tag_name: 'latest' }))).toBeNull();
        for (const junk of [null, undefined, 'x', 5, { message: 'API rate limit exceeded' }]) expect(pickRelease(junk)).toBeNull();
    });
});

describe('checkForUpdate', () => {
    afterEach(resetUpdateCheck);
    const deps = (current: unknown, latest: () => Promise<unknown>) => ({ currentVersion: async () => current as string, latestRelease: latest });

    it('offers a newer release', async () => {
        const state = await checkForUpdate(deps('2.0.0', async () => release()));
        expect(state).toMatchObject({ status: 'available', current: '2.0.0', release: { version: '2.1.0' } });
    });
    it('up to date when the release is the same or older', async () => {
        expect(await checkForUpdate(deps('2.1.0', async () => release()))).toEqual({ status: 'upToDate', current: '2.1.0' });
        expect(await checkForUpdate(deps('3.0.0', async () => release()))).toEqual({ status: 'upToDate', current: '3.0.0' });
    });
    it('any failure is an error state, never a throw', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(await checkForUpdate(deps('2.0.0', async () => { throw new Error('offline'); }))).toEqual({ status: 'error', current: '2.0.0' });
        expect(await checkForUpdate(deps('2.0.0', async () => ({ message: 'Not Found' })))).toEqual({ status: 'error', current: '2.0.0' });
        expect(await checkForUpdate(deps(null, async () => release()))).toEqual({ status: 'error', current: null });
        expect(await checkForUpdate({ currentVersion: async () => { throw new Error('no backend'); }, latestRelease: async () => release() })).toEqual({ status: 'error', current: null });
        warn.mockRestore();
    });
});

describe('installUpdate', () => {
    const r = { version: '2.1.0', url: 'https://github.com/a/game-glance.zip', sha256: SHA };

    it('hands the release to Decky\'s installer as an update of "Game Glance"', async () => {
        const call = vi.fn(async () => undefined);
        expect(await installUpdate(r, { call })).toBe(true);
        expect(call).toHaveBeenCalledWith('utilities/install_plugin', r.url, 'Game Glance', '2.1.0', SHA, 2);
    });
    it('false without Decky\'s router or when the call fails', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(await installUpdate(r, undefined)).toBe(false);
        expect(await installUpdate(r, { call: async () => { throw new Error('denied'); } })).toBe(false);
        warn.mockRestore();
    });
});

describe('daily check (as in Ambideck)', () => {
    const setup = () => {
        let now = 1_000_000;
        const store = createCache(memoryKv(), () => now);
        const fetchLatest = vi.fn(async () => release());
        const sources = latestReleases(fetchLatest, store);
        return { sources, fetchLatest, advance: (ms: number) => (now += ms) };
    };
    it('checks once a day: within a day the stored answer, after it GitHub again', async () => {
        const { sources, fetchLatest, advance } = setup();
        expect(UPDATE_CHECK_EVERY_MS).toBe(86_400_000);
        expect(LATEST_TTL_MS).toBeLessThan(UPDATE_CHECK_EVERY_MS);
        expect(pickRelease(await sources.daily())?.version).toBe('2.1.0');
        advance(LATEST_TTL_MS - 1);
        expect(pickRelease(await sources.daily())?.version).toBe('2.1.0');
        expect(fetchLatest).toHaveBeenCalledTimes(1);
        advance(2);
        await sources.daily();
        expect(fetchLatest).toHaveBeenCalledTimes(2);
    });
    it('Check for updates always asks GitHub, and its answer is the one kept for the day', async () => {
        const { sources, fetchLatest } = setup();
        await sources.daily();
        fetchLatest.mockResolvedValueOnce(release({ tag_name: 'v3.1.0' }));
        expect(pickRelease(await sources.fresh())?.version).toBe('3.1.0');
        expect(pickRelease(await sources.daily())?.version).toBe('3.1.0');
        expect(fetchLatest).toHaveBeenCalledTimes(2);
    });
    it('keeps only what the check needs, and a failed fetch stores nothing', async () => {
        const { sources, fetchLatest } = setup();
        fetchLatest.mockResolvedValueOnce({ ...release(), body: 'x'.repeat(10_000), author: { login: 'someone' } });
        await sources.daily();
        const kept = await sources.daily();
        expect(kept).toEqual({ tag_name: 'v2.1.0', draft: false, prerelease: false, assets: release().assets.map(({ name, browser_download_url, digest }) => ({ name, browser_download_url, digest })) });
        const failing = latestReleases(async () => {
            throw new Error('offline');
        }, createCache(memoryKv()));
        await expect(failing.daily()).rejects.toThrow('offline');
    });
});
