import { isPreRelease, sameVersion, type Release } from './update';

/** One row of the version picker, as Quick Access and the menu both list it. */
export interface VersionChoice {
    version: string;
    label: string;
    installed: boolean;
    prerelease: boolean;
}

/** The catalog's versions to offer: stable ones, plus prereleases when asked, each labelled latest stable / prerelease / installed. */
export function versionChoices(releases: readonly Release[], { current, showPrereleases }: { current: string | null; showPrereleases: boolean }): VersionChoice[] {
    const latestStable = releases.find(r => !isPreRelease(r.version));
    return releases.filter(r => showPrereleases || !isPreRelease(r.version)).map(r => {
        const prerelease = isPreRelease(r.version);
        const installed = !!current && sameVersion(r.version, current);
        const tag = prerelease ? ' · prerelease' : r === latestStable ? ' · latest stable' : '';
        return { version: r.version, label: `${r.version}${tag}${installed ? ' · installed' : ''}`, installed, prerelease };
    });
}

/** The line under the picker's switch: what the list shows, or why it is empty. */
export function versionsNote({ loading, error, showPrereleases, count }: { loading: boolean; error: boolean; showPrereleases: boolean; count: number }): string {
    if (loading) return 'Loading versions…';
    if (error) return 'Could not refresh versions. Showing saved choices when available.';
    if (count === 0) return 'No matching versions are available yet.';
    return showPrereleases
        ? 'Prereleases are optional test builds. Select a stable version here to switch back.'
        : 'Stable versions. Decky asks before installing.';
}
