import { callable } from '@decky/api';
import { HeroicRef, parseHeroicLaunch } from '../logic/heroic';
import type { HltbGame } from './hltb';

export const GAME_APP_TYPE = 1;
export const SHORTCUT_APP_TYPE = 1073741824;

export interface LibraryApp {
    appid: number;
    display_name: string;
    app_type: number;
}

/** An installed game, with its Heroic link when Heroic added it (for the description). */
export type InstalledGame = HltbGame & { heroic: HeroicRef | null };

export interface InstalledGamesDeps {
    steamInstalled(): LibraryApp[];
    shortcuts(): LibraryApp[];
    launchOptions(appId: number): Promise<string | undefined>;
    unifideckStore(appId: number): Promise<string | null>;
}

type SteamGlobals = {
    collectionStore?: { localGamesCollection?: { allApps?: LibraryApp[] } };
    appStore?: { allApps?: LibraryApp[] };
    SteamClient?: { Apps?: { RegisterForAppDetails?(appId: number, cb: (d: { strShortcutLaunchOptions?: string }) => void): { unregister(): void } } };
};
const steam = globalThis as unknown as SteamGlobals;

function launchOptionsFromSteam(appId: number): Promise<string | undefined> {
    return new Promise((resolve) => {
        let registration: { unregister(): void } | undefined;
        const done = (value: string | undefined) => {
            clearTimeout(timer);
            registration?.unregister();
            resolve(value);
        };
        const timer = setTimeout(() => done(undefined), 2000);
        registration = steam.SteamClient?.Apps?.RegisterForAppDetails?.(appId, (details) => done(details?.strShortcutLaunchOptions));
    });
}

const defaultDeps: InstalledGamesDeps = {
    steamInstalled: () => steam.collectionStore?.localGamesCollection?.allApps ?? [],
    shortcuts: () => (steam.appStore?.allApps ?? []).filter((app) => app.app_type === SHORTCUT_APP_TYPE),
    launchOptions: launchOptionsFromSteam,
    unifideckStore: callable<[appid: number], string | null>('get_store'),
};

/** For a store game: its Heroic link (or null for Unifideck games). Undefined for app shortcuts. */
async function storeGame(app: LibraryApp, deps: InstalledGamesDeps): Promise<{ heroic: HeroicRef | null } | undefined> {
    try {
        const heroic = parseHeroicLaunch(await deps.launchOptions(app.appid));
        if (heroic) return { heroic };
    } catch {
        // no details: try Unifideck
    }
    try {
        return (await deps.unifideckStore(app.appid)) !== null ? { heroic: null } : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Games worth a HowLongToBeat lookup: installed Steam games (Steam's Installed list, games only) and
 * non-Steam shortcuts that Heroic or Unifideck added. App shortcuts (Spotify, launchers, streaming) are skipped.
 */
export async function listInstalledGames(deps: InstalledGamesDeps = defaultDeps): Promise<InstalledGame[]> {
    const read = (list: () => LibraryApp[]) => {
        try {
            return list().filter((app) => app && Number.isInteger(app.appid) && typeof app.display_name === 'string');
        } catch {
            return [];
        }
    };
    const games: InstalledGame[] = read(deps.steamInstalled)
        .filter((app) => app.app_type === GAME_APP_TYPE)
        .map((app) => ({ appId: app.appid, name: app.display_name, isShortcut: false, heroic: null }));
    for (const app of read(deps.shortcuts)) {
        const store = await storeGame(app, deps);
        if (store) games.push({ appId: app.appid, name: app.display_name, isShortcut: true, heroic: store.heroic });
    }
    return games;
}
