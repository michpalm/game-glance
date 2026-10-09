import { callable, fetchNoCors } from '@decky/api';
import { useEffect, useState } from 'react';
import { LOG_PREFIX, PLUGIN_NAME } from '../constants';
import { cache, Cache, DAY_MS } from './cache';

/**
 * The built-in updater: the latest GitHub release of Game Glance, compared with the installed version, installed
 * through Decky's own plugin installer (the loader route `utilities/install_plugin`, the same one Unifideck's updater
 * uses: Decky asks to confirm, downloads, installs and reloads the plugin). Only the release's public metadata is
 * fetched from api.github.com; nothing about the user is sent.
 */
export const RELEASES_URL = 'https://api.github.com/repos/michpalm/game-glance/releases/latest';
/** The release asset Decky installs (scripts/package.sh builds it). */
export const ASSET_NAME = 'game-glance.zip';
/** The same zip uploaded under a versioned name ("game-glance-v2.0.0.zip", as v2.0.0 was): taken when there is no ASSET_NAME. */
const VERSIONED_ASSET = /^game-glance-v?\d+(\.\d+){1,3}\.zip$/i;
/** Decky's install type for an update of an installed plugin (1 reinstall, 2 update, 3 downgrade). */
export const INSTALL_TYPE_UPDATE = 2;

/** "v2.1.0" or "2.1.0" (anything after a "-" or "+" ignored) as numbers; null when it is not a version. */
export function parseVersion(text: unknown): number[] | null {
    if (typeof text !== 'string') return null;
    const core = text.trim().replace(/^v/i, '').split(/[-+]/)[0];
    if (!/^\d+(\.\d+){0,3}$/.test(core)) return null;
    return core.split('.').map(Number);
}

/** Whether `latest` is a higher version than `current` (2.0.10 > 2.0.9; 2.1 = 2.1.0). False if either is not a version. */
export function isNewer(latest: string, current: string): boolean {
    const a = parseVersion(latest);
    const b = parseVersion(current);
    if (!a || !b) return false;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (a[i] ?? 0) - (b[i] ?? 0);
        if (d !== 0) return d > 0;
    }
    return false;
}

export interface Release {
    /** The tag without its "v": what Decky shows and stores. */
    version: string;
    /** The zip's download url. */
    url: string;
    /** The zip's SHA-256 from GitHub's asset digest ("sha256:<hex>"), or '' when GitHub gives none. */
    sha256: string;
}

/** The installable release in GitHub's latest-release JSON: a published, non-prerelease tag with the zip (ASSET_NAME, else a versioned name). Null otherwise. */
export function pickRelease(json: unknown): Release | null {
    try {
        const r = json as { tag_name?: unknown; draft?: unknown; prerelease?: unknown; assets?: unknown } | null;
        if (!r || r.draft === true || r.prerelease === true || !parseVersion(r.tag_name)) return null;
        const assets = Array.isArray(r.assets) ? (r.assets as Array<{ name?: unknown; browser_download_url?: unknown; digest?: unknown }>) : [];
        const zip = assets.find((a) => a?.name === ASSET_NAME) ?? assets.find((a) => typeof a?.name === 'string' && VERSIONED_ASSET.test(a.name));
        const url = zip?.browser_download_url;
        if (typeof url !== 'string' || !/^https:\/\//.test(url)) return null;
        const digest = typeof zip?.digest === 'string' ? zip.digest : '';
        const sha256 = /^sha256:[0-9a-f]{64}$/i.test(digest) ? digest.slice(7).toLowerCase() : '';
        return { version: String(r.tag_name).trim().replace(/^v/i, ''), url, sha256 };
    } catch {
        return null;
    }
}

export type UpdateState =
    | { status: 'checking'; current: string | null }
    | { status: 'upToDate'; current: string }
    | { status: 'available'; current: string; release: Release }
    | { status: 'error'; current: string | null };

export interface UpdateDeps {
    currentVersion(): Promise<string | null>;
    /** The latest-release JSON, or throws. */
    latestRelease(): Promise<unknown>;
}

const getVersion = callable<[], string | null>('get_version');

/** How often Game Glance looks for a new release by itself (as Ambideck does): once a day, also across restarts. */
export const UPDATE_CHECK_EVERY_MS = DAY_MS;
/** How long GitHub's answer is kept: a little under a day, so the next daily check asks again. */
export const LATEST_TTL_MS = DAY_MS - 5 * 60_000;
const LATEST_KEY = 'update:latest';

/** Only what pickRelease reads from GitHub's latest-release JSON (its notes and author are not kept). */
function slimRelease(json: unknown): unknown {
    const r = json as { tag_name?: unknown; draft?: unknown; prerelease?: unknown; assets?: unknown } | null;
    if (!r || typeof r !== 'object') return json;
    const assets = Array.isArray(r.assets)
        ? (r.assets as Array<Record<string, unknown> | null>).map((a) => ({ name: a?.name, browser_download_url: a?.browser_download_url, digest: a?.digest }))
        : r.assets;
    return { tag_name: r.tag_name, draft: r.draft, prerelease: r.prerelease, assets };
}

/**
 * GitHub's latest release two ways: `daily` reuses the answer kept for the day (the plugin's cache, so a restart does not
 * ask again) and asks GitHub once it is older; `fresh` (Check for updates) always asks, and its answer is the one kept.
 * A failed request throws and keeps nothing.
 */
export function latestReleases(fetchLatest: () => Promise<unknown>, store: Cache): { daily(): Promise<unknown>; fresh(): Promise<unknown> } {
    const fresh = async () => {
        const json = slimRelease(await fetchLatest());
        await store.put(LATEST_KEY, { json }, LATEST_TTL_MS).catch(() => undefined);
        return json;
    };
    return {
        fresh,
        async daily() {
            const kept = await store.get<{ json: unknown }>(LATEST_KEY).catch(() => null);
            return kept ? kept.json : fresh();
        },
    };
}

async function fetchLatestRelease(): Promise<unknown> {
    const res = await fetchNoCors(RELEASES_URL, { method: 'GET', headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    return res.json();
}

const releases = latestReleases(fetchLatestRelease, cache);

/** The daily check: GitHub's answer reused for up to a day. */
export const defaultUpdateDeps: UpdateDeps = {
    currentVersion: () => getVersion(),
    latestRelease: () => releases.daily(),
};

/** Check for updates: always asks GitHub. */
const freshUpdateDeps: UpdateDeps = {
    currentVersion: () => getVersion(),
    latestRelease: () => releases.fresh(),
};

/** Compares the installed version with the latest release. Never throws: any failure is an 'error' state. */
export async function checkForUpdate(deps: UpdateDeps = defaultUpdateDeps): Promise<UpdateState> {
    let current: string | null = null;
    try {
        const raw = await deps.currentVersion();
        current = typeof raw === 'string' && parseVersion(raw) ? raw.trim().replace(/^v/i, '') : null;
        if (!current) return { status: 'error', current: null };
        const release = pickRelease(await deps.latestRelease());
        if (!release) return { status: 'error', current };
        return isNewer(release.version, current) ? { status: 'available', current, release } : { status: 'upToDate', current };
    } catch (error) {
        console.warn(`${LOG_PREFIX} update check failed`, error);
        return { status: 'error', current };
    }
}

/** Decky's loader router (window.DeckyBackend, created by Decky Loader); only its `call` is used. */
interface DeckyBackendLike {
    call(route: string, ...args: unknown[]): Promise<unknown>;
}

const deckyBackend = (): DeckyBackendLike | undefined => (globalThis as { DeckyBackend?: DeckyBackendLike }).DeckyBackend;

/**
 * Hands the release to Decky's installer, which shows its own confirmation, then downloads, installs and reloads Game
 * Glance (the name must be plugin.json's, so Decky replaces this plugin). False when Decky's router is missing or the
 * call fails; nothing else changes then.
 */
export async function installUpdate(release: Release, backend: DeckyBackendLike | undefined = deckyBackend()): Promise<boolean> {
    try {
        if (!backend?.call) return false;
        await backend.call('utilities/install_plugin', release.url, PLUGIN_NAME, release.version, release.sha256, INSTALL_TYPE_UPDATE);
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} update install failed`, error);
        return false;
    }
}

/** The latest check (at start-up, then daily, or Check for updates); Quick Access shows its answer. */
let latestCheck: Promise<UpdateState> | null = null;
const checkListeners = new Set<() => void>();

function runCheck(force: boolean): Promise<UpdateState> {
    const check = checkForUpdate(force ? freshUpdateDeps : defaultUpdateDeps);
    latestCheck = check;
    checkListeners.forEach((listener) => listener());
    return check;
}

/**
 * The background check, as in Ambideck: once when Game Glance loads (GitHub's answer reused if it is under a day old),
 * then once a day while it keeps running (a handheld can go days between restarts, sleeping in between). Quiet: the
 * answer waits for Quick Access. Returns the stop for the plugin's dismount.
 */
export function startUpdateChecks(every = UPDATE_CHECK_EVERY_MS): () => void {
    void runCheck(false);
    const timer = setInterval(() => void runCheck(false), every);
    return () => clearInterval(timer);
}

/** The update state for Quick Access: the latest check's answer (one is started if none ran yet); `recheck` asks GitHub now. */
export function useUpdate(): { state: UpdateState; recheck(): void } {
    const [state, setState] = useState<UpdateState>({ status: 'checking', current: null });
    useEffect(() => {
        let shown: Promise<UpdateState> | null = null;
        const show = () => {
            const check = latestCheck ?? runCheck(false);
            if (check === shown) return;
            shown = check;
            check.then((next) => {
                if (shown === check) setState(next);
            }, () => undefined);
        };
        checkListeners.add(show);
        show();
        return () => {
            checkListeners.delete(show);
            shown = null;
        };
    }, []);
    const recheck = () => {
        setState((s) => ({ status: 'checking', current: s.current }));
        void runCheck(true);
    };
    return { state, recheck };
}

/** Forgets the latest check (tests). */
export function resetUpdateCheck() {
    latestCheck = null;
}
