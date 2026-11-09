import { describe, expect, it } from 'vitest';
import { versionChoices, versionsNote } from '../../src/data/versionChoices';
import type { Release } from '../../src/data/update';

const release = (version: string): Release => ({ version, url: `https://example.test/${version}.zip`, sha256: '' });
const catalog = [release('4.0.0-rc.1'), release('3.6.1'), release('3.6.0')];

describe('versionChoices', () => {
    it('lists stable versions only by default, marking latest stable and installed', () => {
        expect(versionChoices(catalog, { current: '3.6.1', showPrereleases: false })).toEqual([
            { version: '3.6.1', label: '3.6.1 · latest stable · installed', installed: true, prerelease: false },
            { version: '3.6.0', label: '3.6.0', installed: false, prerelease: false },
        ]);
    });
    it('adds prereleases, labelled, when asked', () => {
        const choices = versionChoices(catalog, { current: '4.0.0-rc.1', showPrereleases: true });
        expect(choices.map(c => c.label)).toEqual(['4.0.0-rc.1 · prerelease · installed', '3.6.1 · latest stable', '3.6.0']);
        expect(choices[0]).toMatchObject({ installed: true, prerelease: true });
    });
    it('marks nothing installed when the running version is unknown', () => {
        expect(versionChoices(catalog, { current: null, showPrereleases: false }).some(c => c.installed)).toBe(false);
    });
});

describe('versionsNote', () => {
    const base = { loading: false, error: false, showPrereleases: false, count: 2 };
    it('explains each state', () => {
        expect(versionsNote({ ...base, loading: true })).toBe('Loading versions…');
        expect(versionsNote({ ...base, error: true })).toBe('Could not refresh versions. Showing saved choices when available.');
        expect(versionsNote({ ...base, count: 0 })).toBe('No matching versions are available yet.');
        expect(versionsNote(base)).toBe('Stable versions. Decky asks before installing.');
        expect(versionsNote({ ...base, showPrereleases: true })).toBe('Prereleases are optional test builds. Select a stable version here to switch back.');
    });
});
